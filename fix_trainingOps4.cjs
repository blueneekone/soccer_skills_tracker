const fs = require('fs');
let code = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

code = code.replace(
  "if (!request.auth) {\n      throw new HttpsError('unauthenticated', 'must be logged in');\n    }\n    const { assertParentAsync } = require('./operativeOps');\n    await assertParentAsync(request);",
  "if (!request.auth) {\n      throw new HttpsError('unauthenticated', 'must be logged in');\n    }\n    const { assertParentAsync } = require('./operativeOps');\n    await assertParentAsync(request);"
);

// wait, let me just add it clearly to parentReviewCompletionProof.
// I'll print parentReviewCompletionProof block first.
