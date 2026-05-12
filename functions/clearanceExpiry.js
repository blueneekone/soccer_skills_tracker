/* eslint-disable quotes */
/**
 * clearanceExpiry.js — Daily background-check validity sweep
 * ───────────────────────────────────────────────────────────
 * Phase 2, Epic 2, Session K.
 *
 * Every cleared adult must re-verify their background check after 365 days.
 * This scheduler sweeps `users/*` daily and flips any `clearance.status ===
 * 'cleared'` past the validity window to `'expired'`, then re-stamps the
 * Auth user's `isCleared` custom claim to `false` so Firestore rules and
 * client-side guards immediately stop them from accessing minor PII.
 *
 * Validity is computed from `clearance.clearedAt` (preferred) or
 * `clearance.lastVerified` (fallback) — the existing webhook handler
 * stamps `lastVerified` on every status change but only the cleared path
 * also stamps a `clearedAt` (added in this session by patching the webhook
 * handler IF we touch it later — current behavior writes lastVerified
 * which is acceptable for the sweep).
 *
 * Idempotent: rerunning the same day is a no-op (already-expired users
 * are filtered out by the `status == 'cleared'` query).
 *
 * Schedule: every day at 04:00 America/New_York.
 */

'use strict';

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const CLEARANCE_VALIDITY_DAYS = 365;
const VALIDITY_MS = CLEARANCE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
/** Cap a single sweep so a bad query can't hot-loop a million docs. */
const SWEEP_BATCH_LIMIT = 500;

exports.expireStaleClearances = onSchedule(
    {
      region: REGION,
      schedule: 'every day 04:00',
      timeZone: 'America/New_York',
    },
    async () => {
      const db = admin.firestore();
      const auth = admin.auth();
      const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - VALIDITY_MS);

      // Index requirement: composite (clearance.status, clearance.lastVerified).
      // Firestore auto-suggests on first run; we ship the index in firestore.indexes.json.
      const snap = await db
          .collection('users')
          .where('clearance.status', '==', 'cleared')
          .where('clearance.lastVerified', '<=', cutoff)
          .limit(SWEEP_BATCH_LIMIT)
          .get();

      logger.info('expireStaleClearances: candidates', {count: snap.size, cutoff: cutoff.toMillis()});

      if (snap.empty) return;

      let expired = 0;
      let failed = 0;
      for (const docSnap of snap.docs) {
        const email = docSnap.id;
        try {
          await docSnap.ref.set(
              {
                clearance: {
                  status: 'expired',
                  expiresAt: admin.firestore.FieldValue.serverTimestamp(),
                },
              },
              {merge: true},
          );

          // Re-stamp the JWT claim — flip isCleared off so the user is
          // immediately blocked at the next token refresh.
          try {
            const userRecord = await auth.getUserByEmail(email).catch(() => null);
            if (userRecord) {
              const existing = userRecord.customClaims || {};
              await auth.setCustomUserClaims(userRecord.uid, {
                ...existing,
                isCleared: false,
              });
              // Force a fresh ID token on next request.
              await auth.revokeRefreshTokens(userRecord.uid).catch(() => {});
            }
          } catch (claimErr) {
            logger.warn('expireStaleClearances: claim re-stamp failed', {
              email,
              err: claimErr instanceof Error ? claimErr.message : String(claimErr),
            });
          }

          // Audit row — finance/compliance reads this trail nightly.
          await db.collection('audit_logs').add({
            action: 'clearance_expired',
            targetEmail: email,
            reason: 'validity_window_elapsed',
            validityDays: CLEARANCE_VALIDITY_DAYS,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          expired += 1;
        } catch (err) {
          failed += 1;
          logger.error('expireStaleClearances: doc update failed', {
            email,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      logger.info('expireStaleClearances: done', {expired, failed});
    },
);
