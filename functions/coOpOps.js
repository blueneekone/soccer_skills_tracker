/* eslint-disable max-len */
/**
 * coOpOps.js
 * ──────────
 * Phase 3, Epic 5.4 — Parent Co-Op: Telemetry Boost Operations.
 *
 * Callable:
 *   • activateTelemetryBoost  — parent activates a time-bounded XP multiplier
 *                               for a child player.
 *
 * V1: Boosts are FREE engagement levers — no Tremendous charge is placed.
 *     The XP grant transaction in `gamificationWorkoutXp.js` reads active
 *     boost docs and applies the highest multiplier to earned XP.
 */

const logger = require('firebase-functions/logger');
const admin  = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');

const MAX_BOOST_MULTIPLIER = 3.0;
const MAX_BOOSTS_PER_DAY   = 3;   // per child, per parent, per UTC calendar day

/** Normalise email. */
function normEmail(e) {
  return String(e == null ? '' : e).trim().toLowerCase();
}

/**
 * activateTelemetryBoost
 *
 * Input:
 *   {
 *     playerEmail: string,   — the child's email key
 *     presetId:    string,   — one of: '1_5x_60m' | '2x_30m' | '3x_15m'
 *   }
 *
 *   OR raw override (for future premium tiers):
 *   {
 *     playerEmail:   string,
 *     multiplier:    number,   (1.1 – 3.0)
 *     windowMinutes: number,   (1 – 120)
 *     label:         string,
 *   }
 *
 * Output: { boostId: string, expiresAt: string, multiplier: number }
 */
exports.activateTelemetryBoost = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required.');

  const callerEmail = normEmail(req.auth.token.email);
  const householdId = req.auth.token.householdId || '';

  const {
    playerEmail: rawPlayer,
    presetId,
    multiplier: rawMult,
    windowMinutes: rawWindow,
    label: rawLabel,
  } = req.data || {};

  if (!rawPlayer) throw new HttpsError('invalid-argument', 'playerEmail is required.');
  const playerEmail = normEmail(rawPlayer);

  // ── Resolve preset or raw override ──────────────────────────────────────
  const PRESETS = {
    '1_5x_60m': {multiplier: 1.5, windowMinutes: 60,  label: '1.5× for 60 min'},
    '2x_30m':   {multiplier: 2.0, windowMinutes: 30,  label: '2× for 30 min'},
    '3x_15m':   {multiplier: 3.0, windowMinutes: 15,  label: '3× for 15 min'},
  };

  let multiplier, windowMinutes, label;
  if (presetId) {
    const preset = PRESETS[presetId];
    if (!preset) throw new HttpsError('invalid-argument', `Unknown presetId: ${presetId}`);
    ({multiplier, windowMinutes, label} = preset);
  } else {
    multiplier    = Math.min(MAX_BOOST_MULTIPLIER, Math.max(1.1, Number(rawMult) || 1.5));
    windowMinutes = Math.min(120, Math.max(1, Math.floor(Number(rawWindow) || 60)));
    label         = rawLabel ? String(rawLabel).slice(0, 60) : `${multiplier}× for ${windowMinutes} min`;
  }

  // ── Guardianship assertion ──────────────────────────────────────────────
  const firestore = admin.firestore();

  if (!householdId) {
    throw new HttpsError('permission-denied', 'No household claim on token.');
  }
  const hhSnap = await firestore.collection('households').doc(householdId).get();
  if (!hhSnap.exists) throw new HttpsError('not-found', 'Household not found.');

  const hhData       = hhSnap.data();
  const parentEmails = Array.isArray(hhData.parentEmails) ? hhData.parentEmails : [];
  const playerEmails = Array.isArray(hhData.playerEmails) ? hhData.playerEmails : [];

  if (!parentEmails.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Not a guardian of this household.');
  }
  if (!playerEmails.includes(playerEmail)) {
    throw new HttpsError('permission-denied', 'Player is not a member of this household.');
  }

  // ── Daily cap enforcement ────────────────────────────────────────────────
  const todayUtcStart = new Date();
  todayUtcStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayUtcStart.toISOString();

  const boostsToday = await firestore
      .collection(`users/${playerEmail}/telemetry_boosts`)
      .where('sponsoredByParentEmail', '==', callerEmail)
      .where('activatedAt', '>=', todayIso)
      .get();

  if (boostsToday.size >= MAX_BOOSTS_PER_DAY) {
    throw new HttpsError(
        'resource-exhausted',
        `Daily boost limit (${MAX_BOOSTS_PER_DAY}) reached for this child today.`,
    );
  }

  // ── Write boost document ─────────────────────────────────────────────────
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

  const boostData = {
    playerEmail,
    householdId,
    sponsoredByParentEmail: callerEmail,
    multiplier,
    expiresAt: expiresAt.toISOString(),
    activatedAt: now.toISOString(),
    label,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const boostRef = await firestore
      .collection(`users/${playerEmail}/telemetry_boosts`)
      .add(boostData);

  logger.info('activateTelemetryBoost: activated', {
    boostId: boostRef.id, playerEmail, callerEmail, multiplier, windowMinutes,
  });

  // Dispatch FCM to child player (non-fatal).
  try {
    const {dispatchBoostActivated} = require('./src/domains/notificationOps');
    await dispatchBoostActivated(firestore, playerEmail, {label, expiresAt: expiresAt.toISOString()});
  } catch (err) {
    logger.warn('activateTelemetryBoost: notification failed', {err});
  }

  return {
    boostId:    boostRef.id,
    expiresAt:  expiresAt.toISOString(),
    multiplier,
    label,
  };
});

// ── Helper: resolveActiveBoostMultiplier ──────────────────────────────────────

/**
 * Reads the active telemetry boost docs for a player and returns the
 * highest currently active multiplier (1.0 if none).
 *
 * Called from inside the XP grant transaction in `gamificationWorkoutXp.js`.
 * Returns synchronously-resolved value (async read).
 *
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} playerEmail
 * @param {Date} [asOf=new Date()]
 * @return {Promise<{ multiplier: number, sponsoredByParentEmail: string | null }>}
 */
async function resolveActiveBoostMultiplier(firestore, playerEmail, asOf) {
  const now = (asOf || new Date()).toISOString();
  const q = await firestore
      .collection(`users/${playerEmail}/telemetry_boosts`)
      .where('expiresAt', '>', now)
      .get();

  if (q.empty) return {multiplier: 1.0, sponsoredByParentEmail: null};

  let best = {multiplier: 1.0, sponsoredByParentEmail: null};
  for (const doc of q.docs) {
    const d = doc.data();
    if (typeof d.multiplier === 'number' && d.multiplier > best.multiplier) {
      best = {
        multiplier: Math.min(MAX_BOOST_MULTIPLIER, d.multiplier),
        sponsoredByParentEmail: d.sponsoredByParentEmail || null,
      };
    }
  }
  return best;
}

module.exports = Object.assign(module.exports, {resolveActiveBoostMultiplier});
