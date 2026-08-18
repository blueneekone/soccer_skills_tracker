const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');

// Helper to mathematically reduce each of the 6 Scout's Six axis values by exactly 2%
// (Matches src/lib/utils/gamificationMath.ts applySkillDecay without cross-package import issues)
function applySkillDecay(stats) {
  if (!stats) return stats;
  const decayedStats = { ...stats };
  const axes = ['PAC', 'ACC', 'AGI', 'STM', 'POW', 'VAN'];

  for (const axis of axes) {
    const statValue = decayedStats[axis];
    if (statValue !== undefined && statValue !== null && statValue !== '—') {
      let val = parseFloat(String(statValue));
      if (!isNaN(val)) {
        val = Math.floor(val * 0.98 * 100) / 100;
        if (val < 0) val = 0;
        decayedStats[axis] = val.toString();
      }
    }
  }
  return decayedStats;
}

exports.applySkillDecay = onCall({ enforceAppCheck: true }, async (request) => {
  const email = request.auth?.token?.email;
  if (!email) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();
  const docRef = db.collection('users').doc(email.toLowerCase());

  const snap = await docRef.get();
  if (!snap.exists) return { applied: false, reason: 'no_stats' };

  const data = snap.data();
  const armory = data.armory || {};
  const lastActiveStr = armory.lastActiveUtc || null;
  const lastActiveDateObj = lastActiveStr ? new Date(lastActiveStr) : null;

  if (!lastActiveDateObj) return { applied: false, reason: 'no_last_active' };

  const today = new Date();
  const diffDays = Math.floor((today - lastActiveDateObj) / (1000 * 60 * 60 * 24));

  if (diffDays < 5) return { applied: false, daysInactive: diffDays };

  const currentXp = typeof armory.totalXP === 'number' ? armory.totalXP : 0;
  const streakFreeze = armory.streakFreeze || {};
  const freezeCount = typeof streakFreeze.available === 'number' ? streakFreeze.available : 0;

  if (freezeCount > 0) {
    await docRef.update({
      'armory.streakFreeze.available': freezeCount - 1,
      'armory.streakFreeze.consumedAt': today.toISOString()
    });
    return { applied: false, reason: 'freeze_consumed', freezesLeft: freezeCount - 1 };
  }

  const DECAY_RATE = 0.02;
  const decayMultiplier = Math.min(diffDays - 4, 30);
  const xpLost = Math.floor(currentXp * DECAY_RATE * decayMultiplier);
  const newXp = Math.max(0, currentXp - xpLost);

  const stats = armory.stats || {};
  const decayedStats = applySkillDecay(stats.scoutsSix || {});

  await docRef.update({
    'armory.totalXP': newXp,
    'armory.stats.scoutsSix': decayedStats,
    'armory.decayState.lastDecayApplied': today.toISOString(),
    'armory.decayState.lastDecayLost': xpLost,
    'armory.currentStreak': 0,
  });

  return { applied: true, xpLost, newXp, daysInactive: diffDays };
});
