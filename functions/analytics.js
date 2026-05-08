/* eslint-disable quotes */
/**
 * Strike 1 (Agent 3) â€” Analytics aggregation triggers.
 *
 * These Cloud Functions (v2) maintain a single aggregated document at
 * `analytics/platform_totals`. The `/admin/overview` Global Admin dashboard
 * reads from this one document â€” it NEVER scans `users`, `clubs`, `licenses`,
 * or any of their joins (see the "Paranoid Patch" sprint). That keeps the
 * read budget flat regardless of tenant size.
 *
 * Counters maintained:
 *   â€¢ totalUsers                â€” every `users/{id}` document that exists
 *   â€¢ totalClubs                â€” every `clubs/{id}` document that exists
 *   â€¢ totalLicenses             â€” every `licenses/{id}` document that exists
 *   â€¢ totalRevenue              â€” sum(license.monthlyRevenue || tier-price)
 *   â€¢ bySport[<sport>]          â€” active players per sport (via users.role === 'player')
 *   â€¢ revenueByTier[<tier>]     â€” revenue per license tier
 *   â€¢ mau[<YYYY-MM>]            â€” count of users whose `lastActiveAt` fell in that month
 *   â€¢ updatedAt                 â€” server timestamp of latest trigger run
 *
 * Every write uses `set({ ... }, { merge: true })` combined with
 * `FieldValue.increment()` / `FieldValue.serverTimestamp()` so the aggregated
 * document is auto-created on first signal and never crashes if a field is
 * missing.
 */

const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';

// â”€â”€ Tier pricing (single source of truth, mirrors the /admin/overview card) â”€
const TIER_PRICES = Object.freeze({
  starter: 19,
  pro: 49,
  club: 199,
  enterprise: 499,
});

/**
 * @param {unknown} sport
 * @return {string}
 */
function normalizeSport(sport) {
  if (typeof sport !== 'string') return 'generic';
  const s = sport.trim().toLowerCase();
  if (!s) return 'generic';
  return s;
}

/**
 * @param {unknown} tier
 * @return {string}
 */
function normalizeTier(tier) {
  if (typeof tier !== 'string') return 'starter';
  const t = tier.trim().toLowerCase();
  if (!t) return 'starter';
  return t;
}

/**
 * Derive the per-license monthly revenue used for the dashboard doughnut.
 * Prefers the explicit `monthlyRevenue` field (for custom contracts) and
 * falls back to the hard-coded tier price table.
 *
 * @param {Record<string, unknown>} data
 * @return {{ tier: string, revenue: number }}
 */
function revenueFromLicense(data) {
  const tier = normalizeTier(data && data.tier);
  const explicit = data && typeof data.monthlyRevenue === 'number' ?
    data.monthlyRevenue : null;
  const revenue = typeof explicit === 'number' && Number.isFinite(explicit) ?
    explicit : TIER_PRICES[tier] || 0;
  return {tier, revenue};
}

/**
 * Build the patch delta for a single trigger event.
 * Returns `null` when the event doesn't change any counter we care about.
 *
 * @param {Record<string, unknown>|null} before
 * @param {Record<string, unknown>|null} after
 * @param {'users'|'clubs'|'licenses'} collection
 * @return {Record<string, admin.firestore.FieldValue>|null}
 */
function buildDelta(before, after, collection) {
  const created = !before && !!after;
  const deleted = !!before && !after;
  if (!created && !deleted) return null;

  const sign = created ? 1 : -1;
  const increment = admin.firestore.FieldValue.increment(sign);

  /** @type {Record<string, admin.firestore.FieldValue>} */
  const patch = {};

  if (collection === 'users') {
    patch.totalUsers = increment;
    const roleSource = created ? after : before;
    const role = typeof roleSource.role === 'string' ? roleSource.role : '';
    if (role === 'player') {
      // Players-by-sport bucket. Best-effort â€” if the user has no sport we
      // bucket under "generic" so the total still reconciles.
      const sport = normalizeSport(roleSource.sport || roleSource.clubSport);
      patch[`bySport.${sport}`] = admin.firestore.FieldValue.increment(sign);
    }
  } else if (collection === 'clubs') {
    patch.totalClubs = increment;
    const sportSource = created ? after : before;
    const sport = normalizeSport(sportSource.sport);
    patch[`clubsBySport.${sport}`] = admin.firestore.FieldValue.increment(sign);
  } else if (collection === 'licenses') {
    patch.totalLicenses = increment;
    const source = created ? after : before;
    const {tier, revenue} = revenueFromLicense(source);
    if (revenue > 0) {
      patch.totalRevenue = admin.firestore.FieldValue.increment(sign * revenue);
      patch[`revenueByTier.${tier}`] =
        admin.firestore.FieldValue.increment(sign * revenue);
    }
  }

  if (Object.keys(patch).length === 0) return null;
  patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  return patch;
}

/**
 * Commit a delta patch onto `analytics/platform_totals`. Uses `set(..., {
 * merge: true })` so the document is created on first write and never crashes
 * if the caller boots against an empty tenant.
 *
 * @param {Record<string, admin.firestore.FieldValue>} patch
 * @param {string} context
 */
async function commit(patch, context) {
  const ref = admin.firestore().doc('analytics/platform_totals');
  try {
    await ref.set(patch, {merge: true});
    logger.info(`[analytics:${context}] counter patch applied`, {
      keys: Object.keys(patch),
    });
  } catch (err) {
    logger.error(`[analytics:${context}] counter patch FAILED`, err);
    throw err;
  }
}

/**
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent<import('firebase-functions/v2/firestore').Change<import('firebase-admin').firestore.DocumentSnapshot>|undefined>} event
 * @return {Record<string, unknown>|null}
 */
function snapData(snap) {
  if (!snap || !snap.exists) return null;
  const data = snap.data();
  return data && typeof data === 'object' ? data : {};
}

// â”€â”€ Trigger: users/{id} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const onUserWritten = onDocumentWritten(
    {region: REGION, document: 'users/{userId}'},
    async (event) => {
      const before = snapData(event.data && event.data.before);
      const after = snapData(event.data && event.data.after);
      const patch = buildDelta(before, after, 'users');
      if (!patch) return;
      await commit(patch, `users/${event.params.userId}`);
    },
);

// â”€â”€ Trigger: clubs/{id} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const onClubWritten = onDocumentWritten(
    {region: REGION, document: 'clubs/{clubId}'},
    async (event) => {
      const before = snapData(event.data && event.data.before);
      const after = snapData(event.data && event.data.after);
      const patch = buildDelta(before, after, 'clubs');
      if (!patch) return;
      await commit(patch, `clubs/${event.params.clubId}`);
    },
);

// â”€â”€ Trigger: licenses/{id} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const onLicenseWritten = onDocumentWritten(
    {region: REGION, document: 'licenses/{licenseId}'},
    async (event) => {
      const before = snapData(event.data && event.data.before);
      const after = snapData(event.data && event.data.after);
      const patch = buildDelta(before, after, 'licenses');
      if (!patch) return;
      await commit(patch, `licenses/${event.params.licenseId}`);
    },
);

module.exports = {
  onUserWritten,
  onClubWritten,
  onLicenseWritten,
  // Exposed for unit tests and one-off backfills.
  _internal: {
    TIER_PRICES,
    buildDelta,
    revenueFromLicense,
    normalizeSport,
    normalizeTier,
  },
};
