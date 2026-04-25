/* eslint-disable valid-jsdoc */
/**
 * Mirror of `src/lib/gamification/level.js` workout XP math for `logTrainingSession`.
 * Keep in sync when gamification defaults change.
 */

const DEFAULT_GAMIFICATION_XP = Object.freeze({
  xpPerRep: 10,
  xpPerIntenseMinute: 15,
});

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @return {{ xpPerRep: number, xpPerIntenseMinute: number }}
 */
function resolveXpRulesFromPayload(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const g = /** @type {Record<string, unknown>} */ (o);
  const game =
    g.gamification && typeof g.gamification === 'object' ?
      /** @type {Record<string, unknown>} */ (g.gamification) :
      g;
  const xr = Math.max(0, Number(game.xpPerRep));
  const xim = Math.max(0, Number(game.xpPerIntenseMinute));
  return {
    xpPerRep: Number.isFinite(xr) && xr > 0 ? xr : DEFAULT_GAMIFICATION_XP.xpPerRep,
    xpPerIntenseMinute:
      Number.isFinite(xim) && xim > 0 ? xim : DEFAULT_GAMIFICATION_XP.xpPerIntenseMinute,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} workoutData
 * @return {number}
 */
function calculateWorkoutXp(workoutData) {
  const d = workoutData && typeof workoutData === 'object' ? workoutData : {};
  const {xpPerRep, xpPerIntenseMinute} = resolveXpRulesFromPayload(
      'sportPayload' in d && d.sportPayload && typeof d.sportPayload === 'object' ?
        /** @type {Record<string, unknown>} */ (d.sportPayload) :
        d,
  );
  const drills = Array.isArray(d.drills) ? d.drills : [];
  let acc = 0;

  if (drills.length > 0) {
    for (const raw of drills) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (raw);
      let repCount = 0;
      const sets = Math.max(1, Math.min(999, Math.floor(Number(row.sets) || 0) || 1));
      const r = Math.max(0, Math.floor(Number(row.reps) || 0));
      if (r > 0) {
        repCount = sets * r;
      } else {
        repCount = Math.max(0, Math.floor(Number(row.totalReps) || 0));
      }
      const im = Math.max(0, Number(row.intenseMinutes) || 0);
      acc += repCount * xpPerRep;
      acc += im * xpPerIntenseMinute;
    }
  } else {
    const tr = Math.max(0, Math.floor(Number(d.totalReps) || 0));
    const tim = Math.max(0, Number(d.intenseMinutes) || 0);
    acc = tr * xpPerRep + tim * xpPerIntenseMinute;
  }

  return Math.max(0, Math.floor(acc));
}

/**
 * @param {{ duration: number, reps: number, intensity: string }} p
 * @return {number}
 */
function calculateTrainingSessionEarnedXp(p) {
  const duration = Math.max(0, Math.floor(Number(p.duration) || 0));
  const reps = Math.max(0, Math.floor(Number(p.reps) || 0));
  const ir = String(p.intensity || 'low').toLowerCase();
  const mult = ir === 'high' ? 1.35 : ir === 'medium' ? 1.15 : 1.0;
  return calculateWorkoutXp({
    totalReps: reps,
    intenseMinutes: duration,
    sportPayload: {
      gamification: {
        xpPerRep: 2 * mult,
        xpPerIntenseMinute: 10 * mult,
      },
    },
  });
}

module.exports = {
  calculateWorkoutXp,
  calculateTrainingSessionEarnedXp,
};
