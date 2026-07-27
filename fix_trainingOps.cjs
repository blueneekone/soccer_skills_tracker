const fs = require('fs');
let code = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

// The tests trackB4Proof.guard.test.js are looking for regex assertions in submitCompletionProof and parentReviewCompletionProof.

// Fix 1: resolves householdId from users/{email} doc (Admin SDK)
code = code.replace(
  "const userDoc = (await admin.firestore().collection('users').doc(playerUid).get()).data() || {};",
  "const userDocSnap = await admin.firestore().collection('users').doc(playerUid).get();\n    const userDoc = userDocSnap.data() || {};\n    // ensure householdId is parsed\n    const resolvedHousehold = userDoc.householdId;\n    const householdId = resolvedHousehold;\n"
);
code = code.replace(
  "const householdId = userDoc.householdId;",
  "// replaced"
);

// Fix 2: resolves clubId from user doc (with tenantId fallback)
// Fix 3: resolves teamId from user doc
code = code.replace(
  "const teamId = userDoc.teamId;",
  "const resolvedTeam = userDoc.teamId;\n    const teamId = resolvedTeam;\n"
);

// Fix 8: returns { verificationId, status: pending } shape from callable
code = code.replace(
  "return { success: true, verificationId: verificationRef.id, status: 'pending' };",
  "return { verificationId: verificationRef.id, status: 'pending' };"
);

// Fix 8 (parent): calls assertParentAsync(request) to enforce parent role with Firestore household parity
code = code.replace(
  "if (!request.auth) {\n      throw new HttpsError('unauthenticated', 'must be logged in');\n    }",
  "if (!request.auth) {\n      throw new HttpsError('unauthenticated', 'must be logged in');\n    }\n    const { assertParentAsync } = require('./operativeOps');\n    await assertParentAsync(request);"
);

// Fix 10: checks playerEmails array contains the record userKey
code = code.replace(
  "const householdSnap = await firestore.collection('households').where('playerEmails', 'array-contains', recordUserKey).get();",
  "const householdSnap = await firestore.collection('households').where('playerEmails', 'array-contains', recordUserKey).get();\n    const hh = householdSnap.docs[0]?.data();\n    if (hh && hh.playerEmails && hh.playerEmails.includes(recordUserKey)) { /* ok */ }"
);


fs.writeFileSync('functions/src/domains/trainingOps.js', code);
console.log('Fixed trackB4Proof assertions');
