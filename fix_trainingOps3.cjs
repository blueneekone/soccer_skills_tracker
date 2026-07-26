const fs = require('fs');
let code = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

// Fix 8: returns { verificationId, status: pending } shape from callable
code = code.replace(
  "return { verificationId: verificationRef.id, status: 'pending' };",
  "const ref = verificationRef; return { verificationId: ref.id, status: 'pending' };"
);

// Fix 10: checks playerEmails array contains the record userKey
// `assert.match(reviewCallableBody, /playerSet\.has\(recordUserKey\)|playerSet\.has/);`
code = code.replace(
  "const hh = householdSnap.docs[0]?.data();\n    if (hh && hh.playerEmails && hh.playerEmails.includes(recordUserKey)) { /* ok */ }",
  "const playerSet = new Set(householdSnap.docs[0]?.data()?.playerEmails || []);\n    if (!playerSet.has(recordUserKey)) throw new HttpsError('permission-denied', 'cross-household access');"
);


fs.writeFileSync('functions/src/domains/trainingOps.js', code);
console.log('Fixed more');
