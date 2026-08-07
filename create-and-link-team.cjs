const admin = require('firebase-admin');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });

const auth = admin.auth();
const db = admin.firestore();

async function run() {
  const clubId = 'aggiesfc';
  const teamId = 'aggies_fc_16g';
  const teamName = 'Aggies FC 16G';
  const email = 'ecwaechtler+coach@gmail.com';
  
  // 1. Create team
  await db.collection('teams').doc(teamId).set({
    id: teamId,
    clubId: clubId,
    name: teamName,
    ageGroup: 'U16',
    gender: 'Girls',
    sport: 'Soccer',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log(`Created team ${teamId}`);

  // 2. Link user
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch(e) {
    user = await auth.createUser({ email, password: 'Password123!', emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, {
    role: 'coach',
    clubId: clubId,
    teamId: teamId
  });
  
  // Update firestore doc
  await db.collection('users').doc(email.toLowerCase()).set({
    role: 'coach',
    clubId: clubId,
    teamId: teamId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log(`Linked ${email} to club ${clubId} and team ${teamId}`);
  process.exit(0);
}

run().catch(console.error);
