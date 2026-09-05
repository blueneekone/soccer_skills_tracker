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
  { email: 'ecwaechtler@gmail.com', role: 'super_admin', clubId: 'qa_launch_2026', teamId: 'qa_launch_2026_ppc', isSuperAdmin: true, isGlobalAdmin: true },
  { email: 'ecwaechtler+director@gmail.com', role: 'director', clubId: 'aggiesfc', teamId: null },
  { email: 'ecwaechtler+coach@gmail.com', role: 'coach', clubId: 'aggiesfc', teamId: 'aggiesfc_u11_16gew' },
  { email: 'ecwaechtler+parent@gmail.com', role: 'parent', clubId: null, teamId: null }
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

    // 3. CRITICAL: Execute admin.auth().setCustomUserClaims without wiping existing properties
    const newClaims = {
      ...(userRecord.customClaims || {}),
      role: domain.role,
      clubId: domain.clubId,
      teamId: domain.teamId,
      isCleared: true,
      cellId: 'default'
    };
    if (domain.isSuperAdmin) {
      newClaims.isSuperAdmin = true;
      newClaims.isGlobalAdmin = true;
    }
    await auth.setCustomUserClaims(uid, newClaims);

    // 4. Set or merge the corresponding user documents in the Firestore users collection
    await db.collection('users').doc(domain.email.toLowerCase()).set({
      uid: uid,
      role: domain.role,
      clubId: domain.clubId,
      teamId: domain.teamId,
      isProfileComplete: true,
      isCleared: true,
      email: domain.email,
      emailLower: domain.email.toLowerCase()
    }, { merge: true });

    // Clean up split-brain UID document if exists
    const uidDoc = await db.collection('users').doc(uid).get();
    if (uidDoc.exists) {
      await db.collection('users').doc(uid).delete();
    }

    // 5. Log the console outputs explicitly
    console.log(`SUCCESS: Custom Claims and profile set on ${domain.email} [${uid}]`);
  }
  console.log("RECOVERY SEQUENCE COMPLETE");
  process.exit(0);
}

recoverClaims().catch(console.error);
