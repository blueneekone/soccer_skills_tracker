const admin = require('firebase-admin');
const { resolve } = require('path');
const { readFileSync } = require('fs');

const keyPath = resolve(__dirname, '../serviceAccountKey.json');
const json = readFileSync(keyPath, 'utf8');
const cert = JSON.parse(json);

admin.initializeApp({
  credential: admin.credential.cert(cert)
});

const db = admin.firestore();

async function run() {
  const clubId = 'aggiesfc';
  
  // Create Team
  const teamId = 'aggiesfc_u11_16gew';
  const teamRef = db.collection('clubs').doc(clubId).collection('teams').doc(teamId);
  
  await teamRef.set({
    name: 'Aggies FC 16G Grey',
    ageGroup: 'U11',
    gender: 'Girls',
    sport: 'soccer',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`Team ${teamId} recreated/updated successfully.`);

  // Link Coach
  const userEmail = 'ecwaechtler+coach@gmail.com';
  const userSnap = await admin.auth().getUserByEmail(userEmail);
  const uid = userSnap.uid;

  // Set the claims on the auth object
  const currentClaims = userSnap.customClaims || {};
  currentClaims.role = 'coach';
  currentClaims.clubId = clubId;
  await admin.auth().setCustomUserClaims(uid, currentClaims);
  
  // Link to team in Firestore
  const roleRef = teamRef.collection('roles').doc(uid);
  await roleRef.set({
    role: 'head_coach',
    email: userEmail,
    addedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update user's passport
  const passportRef = db.collection('passports').doc(uid);
  await passportRef.set({
    role: 'coach',
    clubId: clubId,
    activeTeamId: teamId
  }, { merge: true });

  console.log(`Coach ${userEmail} linked to team ${teamId} successfully.`);
}

run().catch(console.error).finally(() => process.exit(0));
