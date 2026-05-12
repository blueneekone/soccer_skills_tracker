/* eslint-disable quotes */
'use strict';

/**
 * clubOps.js
 * ──────────
 * Phase 3, Epic 4 — Sports_Configs Dynamic Trees.
 *
 * Club-sport integrity triggers:
 *   auditClubSportConfig — onDocumentWritten for clubs/{clubId}: when the
 *     `sport` field changes, verifies the new sport key exists in
 *     `sports_configs` and is active.  Flags `sportConfigMissing: true` when
 *     the config is absent or archived, so the admin CRUD UI can surface a
 *     warning banner.
 *
 *   pruneOrphanedSports — weekly onSchedule (Sunday 03:00 UTC): scans all
 *     clubs, collects those whose `sport` string resolves to a missing or
 *     archived sports_config, and writes a `sport_audit_report/{yyyy-ww}` doc.
 */

const admin = require('firebase-admin');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');

// ── auditClubSportConfig ──────────────────────────────────────────────────────

/**
 * Resolve a raw sport string to a canonical sportId using simple substring
 * matching — mirrors normalizeClubSport in sport-icon.js (no import cycle).
 *
 * @param {string | undefined} sportRaw
 * @returns {string}
 */
function normalizeSport(sportRaw) {
  const s = (sportRaw || '').toLowerCase().trim();
  const KNOWN = ['soccer', 'basketball', 'baseball', 'football', 'volleyball', 'hockey', 'lacrosse', 'generic'];
  if (KNOWN.includes(s)) return s;
  if (s.includes('basket')) return 'basketball';
  if (s.includes('volley')) return 'volleyball';
  if (s.includes('baseball')) return 'baseball';
  if (s.includes('lacrosse')) return 'lacrosse';
  if (s.includes('hockey') || s.includes('ice')) return 'hockey';
  if (s.includes('football') && !s.includes('soccer')) return 'football';
  if (s.includes('soccer')) return 'soccer';
  return 'generic';
}

/**
 * onDocumentWritten trigger: `clubs/{clubId}`
 *
 * When the `sport` field changes (or is set for the first time), verify the
 * corresponding `sports_configs/{sportId}` doc exists and is active.
 * If missing or archived, stamps `sportConfigMissing: true` on the club doc
 * so the admin CRUD UI can surface an orphan warning banner.
 */
exports.auditClubSportConfig = onDocumentWritten(
    'clubs/{clubId}',
    async (event) => {
      const after = event.data?.after?.data?.();
      const before = event.data?.before?.data?.();

      if (!after) return; // document deleted

      const newSport = after.sport;
      const oldSport = before?.sport;

      // Only act when sport field actually changed
      if (newSport === oldSport) return;

      const db = admin.firestore();
      const clubId = event.params.clubId;
      const sportKey = normalizeSport(newSport);

      try {
        const configSnap = await db.collection('sports_configs').doc(sportKey).get();
        const configMissing = !configSnap.exists || configSnap.data()?.status === 'archived';

        await db.collection('clubs').doc(clubId).update({
          sportConfigMissing: configMissing,
          sportConfigAuditedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (configMissing) {
          logger.warn('[auditClubSportConfig] orphan sport detected', {
            clubId,
            sport: newSport,
            resolvedKey: sportKey,
          });
        }
      } catch (err) {
        logger.error('[auditClubSportConfig] error', {clubId, err});
      }
    },
);

// ── pruneOrphanedSports ───────────────────────────────────────────────────────

/**
 * Weekly onSchedule: Sunday 03:00 UTC (us-east1).
 *
 * Scans all clubs, resolves each `sport` field to a sports_configs key, and
 * flags orphans (missing or archived config).  Writes a single summary doc to
 * `sport_audit_report/{yyyy-ww}` (read: super_admin; write: if false in rules).
 */
exports.pruneOrphanedSports = onSchedule(
    {
      schedule: '0 3 * * 0', // Sunday 03:00 UTC
      region: 'us-east1',
      timeZone: 'UTC',
    },
    async () => {
      const db = admin.firestore();
      logger.info('[pruneOrphanedSports] starting weekly audit');

      // 1. Load all active sport config keys
      const configsSnap = await db
          .collection('sports_configs')
          .where('status', '==', 'active')
          .get();
      const activeSportIds = new Set(configsSnap.docs.map((d) => d.id));

      // 2. Scan all clubs
      const clubsSnap = await db.collection('clubs').get();
      const orphanClubs = [];
      const batch = db.batch();

      for (const clubDoc of clubsSnap.docs) {
        const data = clubDoc.data();
        const sportKey = normalizeSport(data.sport);
        const isOrphan = !activeSportIds.has(sportKey);

        orphanClubs.push({
          clubId: clubDoc.id,
          sport: data.sport ?? null,
          resolvedKey: sportKey,
          orphan: isOrphan,
        });

        if (isOrphan !== Boolean(data.sportConfigMissing)) {
          batch.update(clubDoc.ref, {
            sportConfigMissing: isOrphan,
            sportConfigAuditedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();

      // 3. Write audit report
      const now = new Date();
      const year = now.getUTCFullYear();
      const weekNum = Math.ceil(
          ((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7,
      );
      const reportId = `${year}-${String(weekNum).padStart(2, '0')}`;

      await db.collection('sport_audit_report').doc(reportId).set({
        reportId,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        totalClubs: clubsSnap.size,
        orphanCount: orphanClubs.filter((c) => c.orphan).length,
        orphans: orphanClubs.filter((c) => c.orphan),
        activeSportIds: Array.from(activeSportIds),
      });

      logger.info('[pruneOrphanedSports] audit complete', {
        reportId,
        totalClubs: clubsSnap.size,
        orphanCount: orphanClubs.filter((c) => c.orphan).length,
      });
    },
);
