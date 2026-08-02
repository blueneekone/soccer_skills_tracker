const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getAdminDb } = require('./utils/adminDb.js');
const { processBatchedQuery } = require('./utils/batchPaginator.js');

function applySkillDecay(stats) {
  if (!stats) return stats;
  const decayedStats = { ...stats };
  const axes = ['PAC', 'ACC', 'AGI', 'STM', 'POW', 'VAN'];

  for (const axis of axes) {
    if (decayedStats[axis] && decayedStats[axis] !== '—') {
      let val = parseFloat(decayedStats[axis]);
      if (!isNaN(val)) {
        val = Math.floor(val * 0.98 * 100) / 100;
        if (val < 0) val = 0;
        decayedStats[axis] = val.toString();
      }
    }
  }
  return decayedStats;
}

exports.scheduledSkillDecay = onSchedule('every day 00:00', async () => {
  const db = getAdminDb();
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const query = db.collection('users')
    .where('armory.lastActiveUtc', '<', threshold)
    .orderBy('armory.lastActiveUtc', 'asc');

  const now = new Date();

  await processBatchedQuery(query, db, async (doc, batch) => {
    const data = doc.data();
    const armory = data.armory || {};
    const streakFreeze = armory.streakFreeze || {};

    if (streakFreeze.available > 0) {
      batch.update(doc.ref, {
        'armory.streakFreeze.available': streakFreeze.available - 1,
        'armory.streakFreeze.consumedAt': now.toISOString(),
        'armory.lastActiveUtc': now.toISOString()
      });
    } else {
      if (armory.stats && armory.stats.scoutsSix) {
        const newStats = applySkillDecay(armory.stats.scoutsSix);
        batch.update(doc.ref, { 'armory.stats.scoutsSix': newStats });
      }
    }
  });
});
