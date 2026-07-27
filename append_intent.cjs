const fs = require('fs');

let content = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

const missingDeployIntent = !content.includes('exports.secureDeployIntent =');
if (missingDeployIntent) {
  content += `

/**
 * secureDeployIntent
 */
exports.secureDeployIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return { ok: true };
});

/**
 * secureCancelIntent
 */
exports.secureCancelIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return { ok: true };
});

/**
 * secureExtendIntent
 */
exports.secureExtendIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return { ok: true };
});
`;
  fs.writeFileSync('functions/src/domains/trainingOps.js', content);
  console.log('Appended secureDeployIntent, secureCancelIntent, secureExtendIntent');
} else {
  console.log('Already exists');
}
