const fs = require('fs');
let code = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

code = code.replace(
  "exports.parentReviewCompletionProof = onCall(\n  LAUNCH_CORE_CALLABLE_OPTS,\n  async (request) => {\n    if (!request.auth) {\n      throw new HttpsError('unauthenticated', 'must be logged in');\n    }\n\n    const { verificationId",
  "exports.parentReviewCompletionProof = onCall(\n  LAUNCH_CORE_CALLABLE_OPTS,\n  async (request) => {\n    if (!request.auth) {\n      throw new HttpsError('unauthenticated', 'must be logged in');\n    }\n    await assertParentAsync(request);\n\n    const { verificationId"
);

fs.writeFileSync('functions/src/domains/trainingOps.js', code);
console.log('Fixed auth check');
