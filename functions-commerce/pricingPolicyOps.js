/* eslint-disable quotes */
/**
 * pricingPolicyOps.js — Live pricing-policy administration
 * ────────────────────────────────────────────────────────
 * Phase 2, Epic 2, Session N.
 *
 * Two super_admin-only callables that let platform operators ship rate
 * changes without redeploying Cloud Functions:
 *
 *   bootstrapPricingPolicy — Idempotent.  Seeds `pricing_policy/default-v1`
 *                            with an EMPTY rate card.  Safe to call multiple
 *                            times; only writes if the doc does not exist.
 *
 *   updatePricingPolicy    — Live updates the active rate card.  Each call
 *                            increments `version`, stamps `activeFrom`, and
 *                            writes an audit row to `pricing_policy_audit`.
 *
 * Validation invariants (RangeError on violation):
 *   - Every TransactionType key in the rate card update must be valid.
 *   - A `RateCardEntry` cannot set both `rateBp` and `flatFeeCents`.
 *   - `rateBp` is an integer in [-10000, 10000] (i.e. -100%..+100%).
 *   - `flatFeeCents` is a non-negative integer.
 *   - `volumeBreakpoints` are sorted ascending by threshold and have positive
 *     `rateModifier` values in (0, 2].
 *
 * Audit trail
 * ────────────
 * Every update writes a new doc to `pricing_policy_audit/{auditId}` capturing
 * the actor uid, the previous version, the patched fields, and a timestamp.
 * The audit collection is super_admin read-only — finance reconciliation
 * uses it to attribute revenue swings to policy changes.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {getRegistryDb} = require('./cellRouter');
const {
  DEFAULT_POLICY_ID,
  TRANSACTION_TYPES,
  isTransactionType,
} = require('./pricingConstants');

const REGION = 'us-east1';

function requireSuper(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const role = request.auth.token.role ?? '';
  if (role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'Super admin required.');
  }
}

// ── bootstrapPricingPolicy ──────────────────────────────────────────────────

/**
 * Idempotent — seeds `pricing_policy/default-v1` only when missing.
 *
 * Defaults shipped:
 *   - rateCard: {}  (no fees; engine falls through to 0)
 *   - volumeBreakpoints: []
 *   - maxFeeCentsPerTxn: null
 *
 * This is intentionally pristine.  Operators set the actual rates via
 * `updatePricingPolicy` after observing initial usage.
 */
exports.bootstrapPricingPolicy = onCall(
    {region: REGION},
    async (request) => {
      requireSuper(request);
      const registry = getRegistryDb();
      const ref = registry.collection('pricing_policy').doc(DEFAULT_POLICY_ID);
      const snap = await ref.get();
      if (snap.exists) {
        return {
          status: 'already_bootstrapped',
          id: DEFAULT_POLICY_ID,
          version: Number(snap.data()?.version) || 0,
        };
      }
      await ref.set({
        id: DEFAULT_POLICY_ID,
        version: 1,
        activeFrom: admin.firestore.FieldValue.serverTimestamp(),
        rateCard: {},
        volumeBreakpoints: [],
        maxFeeCentsPerTxn: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdByUid: request.auth.uid,
      });
      logger.info('bootstrapPricingPolicy: seeded', {id: DEFAULT_POLICY_ID});
      return {status: 'created', id: DEFAULT_POLICY_ID, version: 1};
    },
);

// ── updatePricingPolicy ─────────────────────────────────────────────────────

/**
 * Patch the active pricing policy.  Supplied `rateCard` / `volumeBreakpoints`
 * / `maxFeeCentsPerTxn` / `recruiterAnnualCents` REPLACE the corresponding
 * fields on the doc — partial-key merges on the rate card are not supported
 * because subtle merging is exactly how rate drift bugs happen.
 *
 * Input:
 *   { policyId?: string,
 *     rateCard?: Record<TransactionType, RateCardEntry>,
 *     volumeBreakpoints?: VolumeBreakpoint[],
 *     maxFeeCentsPerTxn?: number | null,
 *     recruiterAnnualCents?: number,
 *     notes?: string }
 *
 * Returns: { id, newVersion }
 */
exports.updatePricingPolicy = onCall(
    {region: REGION},
    async (request) => {
      requireSuper(request);
      const registry = getRegistryDb();

      const policyId = String(request.data?.policyId || DEFAULT_POLICY_ID).trim() ||
          DEFAULT_POLICY_ID;
      const patch = request.data || {};

      // Validate every key the patch touches.
      if (patch.rateCard !== undefined) {
        validateRateCard(patch.rateCard);
      }
      if (patch.volumeBreakpoints !== undefined) {
        validateBreakpoints(patch.volumeBreakpoints);
      }
      if (patch.maxFeeCentsPerTxn !== undefined && patch.maxFeeCentsPerTxn !== null) {
        if (!Number.isInteger(patch.maxFeeCentsPerTxn) || patch.maxFeeCentsPerTxn < 0) {
          throw new HttpsError(
              'invalid-argument',
              'maxFeeCentsPerTxn must be a non-negative integer or null.',
          );
        }
      }
      if (patch.recruiterAnnualCents !== undefined) {
        if (!Number.isInteger(patch.recruiterAnnualCents) || patch.recruiterAnnualCents < 0) {
          throw new HttpsError(
              'invalid-argument',
              'recruiterAnnualCents must be a non-negative integer.',
          );
        }
      }

      const ref = registry.collection('pricing_policy').doc(policyId);
      const newVersion = await registry.runTransaction(async (txn) => {
        const snap = await txn.get(ref);
        const prev = snap.exists ? snap.data() : null;
        const prevVersion = prev ? Number(prev.version) || 0 : 0;
        const next = {
          id: policyId,
          version: prevVersion + 1,
          activeFrom: admin.firestore.FieldValue.serverTimestamp(),
          rateCard: patch.rateCard !== undefined ?
            patch.rateCard :
            (prev?.rateCard || {}),
          volumeBreakpoints: patch.volumeBreakpoints !== undefined ?
            patch.volumeBreakpoints :
            (prev?.volumeBreakpoints || []),
          maxFeeCentsPerTxn: patch.maxFeeCentsPerTxn !== undefined ?
            patch.maxFeeCentsPerTxn :
            (prev?.maxFeeCentsPerTxn ?? null),
          recruiterAnnualCents: patch.recruiterAnnualCents !== undefined ?
            patch.recruiterAnnualCents :
            (prev?.recruiterAnnualCents),
        };
        txn.set(ref, next);

        // Audit row in the same transaction.
        const auditRef = registry.collection('pricing_policy_audit').doc();
        txn.set(auditRef, {
          auditId: auditRef.id,
          policyId,
          prevVersion,
          newVersion: prevVersion + 1,
          patch: {
            rateCard: patch.rateCard ?? null,
            volumeBreakpoints: patch.volumeBreakpoints ?? null,
            maxFeeCentsPerTxn: patch.maxFeeCentsPerTxn ?? null,
            recruiterAnnualCents: patch.recruiterAnnualCents ?? null,
          },
          notes: typeof patch.notes === 'string' ? patch.notes.slice(0, 1000) : '',
          actorUid: request.auth.uid,
          actorEmail: request.auth.token.email ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return prevVersion + 1;
      });

      logger.info('updatePricingPolicy: bumped', {policyId, newVersion});
      return {id: policyId, newVersion};
    },
);

// ── Validation ──────────────────────────────────────────────────────────────

function validateRateCard(card) {
  if (card === null || typeof card !== 'object') {
    throw new HttpsError('invalid-argument', 'rateCard must be an object.');
  }
  for (const key of Object.keys(card)) {
    if (!isTransactionType(key)) {
      throw new HttpsError(
          'invalid-argument',
          `rateCard: unknown TransactionType "${key}".  Valid: ${TRANSACTION_TYPES.join(', ')}.`,
      );
    }
    const entry = card[key];
    if (entry === null || typeof entry !== 'object') {
      throw new HttpsError(
          'invalid-argument',
          `rateCard.${key} must be an object.`,
      );
    }
    const hasRate = entry.rateBp !== undefined && entry.rateBp !== null;
    const hasFlat = entry.flatFeeCents !== undefined && entry.flatFeeCents !== null;
    if (hasRate && hasFlat) {
      throw new HttpsError(
          'invalid-argument',
          `rateCard.${key}: cannot set both rateBp and flatFeeCents.`,
      );
    }
    if (hasRate) {
      if (!Number.isInteger(entry.rateBp) || entry.rateBp < -10000 || entry.rateBp > 10000) {
        throw new HttpsError(
            'invalid-argument',
            `rateCard.${key}.rateBp must be an integer in [-10000, 10000].`,
        );
      }
    }
    if (hasFlat) {
      if (!Number.isInteger(entry.flatFeeCents) || entry.flatFeeCents < 0) {
        throw new HttpsError(
            'invalid-argument',
            `rateCard.${key}.flatFeeCents must be a non-negative integer.`,
        );
      }
    }
    if (entry.minimumFeeCents !== undefined) {
      if (!Number.isInteger(entry.minimumFeeCents) || entry.minimumFeeCents < 0) {
        throw new HttpsError(
            'invalid-argument',
            `rateCard.${key}.minimumFeeCents must be a non-negative integer.`,
        );
      }
    }
  }
}

function validateBreakpoints(arr) {
  if (!Array.isArray(arr)) {
    throw new HttpsError('invalid-argument', 'volumeBreakpoints must be an array.');
  }
  let prevThreshold = -1;
  for (const bp of arr) {
    if (!bp || typeof bp !== 'object') {
      throw new HttpsError('invalid-argument', 'Each breakpoint must be an object.');
    }
    const t = Number(bp.ytdGrossCentsThreshold);
    const m = Number(bp.rateModifier);
    if (!Number.isFinite(t) || t < 0 || !Number.isInteger(t)) {
      throw new HttpsError(
          'invalid-argument',
          'Breakpoint.ytdGrossCentsThreshold must be a non-negative integer.',
      );
    }
    if (t <= prevThreshold) {
      throw new HttpsError(
          'invalid-argument',
          'Breakpoints must be sorted ascending by ytdGrossCentsThreshold.',
      );
    }
    if (!Number.isFinite(m) || m <= 0 || m > 2) {
      throw new HttpsError(
          'invalid-argument',
          'Breakpoint.rateModifier must be a positive number <= 2.',
      );
    }
    prevThreshold = t;
  }
}
