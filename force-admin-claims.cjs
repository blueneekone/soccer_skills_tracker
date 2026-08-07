const admin = require('firebase-admin');

// 1. Initialize the firebase-admin SDK. Route traffic locally if FIREBASE_AUTH_EMULATOR_HOST is defined.
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}
admin.initializeApp({
  projectId: 'sports-skill-tracker-dev' // Connecting to dev environment
});

const auth = admin.auth();
const db = admin.firestore();

const coreDomains = [
  { email: 'ecwaechtler@gmail.com', role: 'admin' },
  { email: 'ecwaechtler+director@gmail.com', role: 'director' },
  { email: 'ecwaechtler+coach@gmail.com', role: 'coach' },
  { email: 'ecwaechtler+parent@gmail.com', role: 'parent' }
];

async function recoverClaims() {
  console.log("Starting Recovery Sequence...");
  for (const domain of coreDomains) {
    let userRecord;
    try {
      // 2. Verify if they exist in Firebase Auth
      userRecord = await auth.getUserByEmail(domain.email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // If not, create them
        userRecord = await auth.createUser({
          email: domain.email,
          password: 'Password123!',
          emailVerified: true
        });
        console.log(`Created new user: ${domain.email}`);
      } else {
        console.error(`Error fetching user ${domain.email}:`, error);
        continue;
      }
    }

    const uid = userRecord.uid;

    // 3. CRITICAL: Execute admin.auth().setCustomUserClaims
    await auth.setCustomUserClaims(uid, { role: domain.role });

    // 4. Set or merge the corresponding user documents in the Firestore users collection
    await db.collection('users').doc(domain.email.toLowerCase()).set({
      role: domain.role,
      isProfileComplete: true,
      email: domain.email
    }, { merge: true });

    // 5. Log the console outputs explicitly
    console.log(`SUCCESS: Custom Claims set on ${domain.email} [${uid}]`);
  }
  console.log("RECOVERY SEQUENCE COMPLETE");
  process.exit(0);
}

recoverClaims().catch(console.error);
