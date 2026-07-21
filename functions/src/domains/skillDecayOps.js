const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');

/**
 * applySkillDecay — callable triggered on player login/session start.
 * Reads lastActiveDate, calculates decay, atomically writes
 * decayed XP back to the player's stats document.
 * Max batch ops: 2 (read + write). Well within 500-op limit.
 */
exports.applySkillDecay = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();
  const statsRef = db.collection('player_stats').doc(uid);
  const snap = await statsRef.get();

  if (!snap.exists) return { applied: false, reason: 'no_stats' };

  const data = snap.data();
  const lastActive = data.lastActiveDate?.toDate?.() ?? null;

  if (!lastActive) return { applied: false, reason: 'no_last_active' };

  const today = new Date();
  const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

  if (diffDays < 5) return { applied: false, daysInactive: diffDays };

  const currentXp = typeof data.totalXp === 'number' ? data.totalXp : 0;
  const freezeCount = typeof data.streakFreezes === 'number' ? data.streakFreezes : 0;

  if (freezeCount > 0) {
    await statsRef.update({ streakFreezes: freezeCount - 1 });
    return { applied: false, reason: 'freeze_consumed', freezesLeft: freezeCount - 1 };
  }

  const DECAY_RATE = 0.02; // 2% per day after day 5
  const decayMultiplier = Math.min(diffDays - 4, 30); // cap at 30 days
  const xpLost = Math.floor(currentXp * DECAY_RATE * decayMultiplier);
  const newXp = Math.max(0, currentXp - xpLost);

  await statsRef.update({
    totalXp: newXp,
    lastDecayApplied: today,
    lastDecayLost: xpLost,
    currentStreak: 0,
  });

  return { applied: true, xpLost, newXp, daysInactive: diffDays };
});