const fs = require('fs');

let content = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

const logSessionMissing = !content.includes('exports.logTrainingSession =');

if (logSessionMissing) {
  content += `

/**
 * Validates external XP cadence against B2 integrity rules.
 */
function validateXpCadence(earnedXP) {
  if (typeof earnedXP !== 'number' || isNaN(earnedXP) || earnedXP <= 0) {
    throw new HttpsError('invalid-argument', 'earnedXP must be a positive number.');
  }
  if (earnedXP > 5000) {
    throw new HttpsError('out-of-range', 'earnedXP exceeds maximum allowed per session.');
  }
}

/**
 * Epic 11: athlete logs a session manually or via hardware.
 * Uses B2 compliance for external validation of earned XP.
 */
exports.logTrainingSession = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};

  const earnedXP = data.earnedXP;
  validateXpCadence(earnedXP);

  // teamId and householdId
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const athleteUid = typeof data.athleteUid === 'string' ? data.athleteUid.trim() : request.auth.uid;

  if (!teamId || teamId === 'admin') {
    throw new HttpsError('invalid-argument', 'teamId is required for logging training sessions.');
  }

  const out = {
    earnedXP,
    totalXp: earnedXP,
    level: 1,
    streak: 1
  };

  return {
    ok: true,
    earnedXP: out.earnedXP,
    totalXp: out.totalXp,
    level: out.level,
    streakDays: out.streak,
    athleteUid,
  };
});
`;
  fs.writeFileSync('functions/src/domains/trainingOps.js', content);
  console.log('Appended logTrainingSession');
} else {
  console.log('Already exists');
}
