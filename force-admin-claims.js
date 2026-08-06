// force-admin-claims.js
// -----------------------------------------------------------------------------
// SSTRACKER EMERGENCY RBAC & PERMISSIONS RECOVERY SCRIPT (v1.0)
// Hardcodes and repairs Custom JWT Claims and Firestore Roles for your core accounts.
// Compatible with both the local Firebase Emulator and Production.
// -----------------------------------------------------------------------------

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Aligned account mapping from your engineering spec
const ACCOUNTS_TO_REPAIR = [
  { email: 'ecwaechtler@gmail.com', role: 'admin' },
  { email: 'ecwaechtler+director@gmail.com', role: 'director' },
  { email: 'ecwaechtler+coach@gmail.com', role: 'coach' },
  { email: 'ecwaechtler+parent@gmail.com', role: 'parent' }
];

// 1. Initialize Firebase Admin SDK
const isEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST;

if (isEmulator) {
  console.log('📡 [EMULATOR] Emulator environment detected. Connecting to local services...');
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'sstracker-nexus'
    });
  }
} else {
  console.log('🔒 [PRODUCTION] Emulator not detected. Attempting production credential load...');
  // Look for service account credentials in standard project directories
  const serviceAccountPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'functions', 'serviceAccountKey.json')
  ];

  let initialized = false;
  for (const certPath of serviceAccountPaths) {
    if (fs.existsSync(certPath)) {
      console.log(`[+] Found service account credentials at: ${certPath}`);
      admin.initializeApp({
        credential: admin.credential.cert(certPath),
        projectId: 'sstracker-nexus'
      });
      initialized = true;
      break;
    }
  }

  if (!initialized) {
    console.warn('[-] WARNING: No service account key found. Attempting default credentials...');
    try {
      admin.initializeApp();
    } catch (err) {
      console.error('❌ ERROR: Failed to initialize Firebase Admin SDK. Please place your serviceAccountKey.json in this directory and run again.');
      process.exit(1);
    }
  }
}

const auth = admin.auth();
const db = admin.firestore();

async function runRecovery() {
  console.log('\n=============================================================');
  console.log('🔥 STARTING EMERGENCY SSTRACKER PERMISSIONS RECOVERY...');
  console.log('=============================================================\n');

  for (const account of ACCOUNTS_TO_REPAIR) {
    try {
      console.log(`⏳ Processing: ${account.email} (${account.role})...`);
      
      // 1. Locate User in Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(account.email);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          console.warn(`[-] User ${account.email} does not exist in Auth. Creating account...`);
          userRecord = await auth.createUser({
            email: account.email,
            emailVerified: true,
            password: 'TemporaryEmergencyPassword123!' // Clean password for instant recovery access
          });
          console.log(`[+] Successfully created user account for: ${account.email}`);
        } else {
          throw authErr;
        }
      }

      const uid = userRecord.uid;

      // 2. Set Custom User Claims on JWT (This controls security rule bypasses)
      await auth.setCustomUserClaims(uid, { role: account.role });
      console.log(`[+] Set Custom JWT Claims: { role: "${account.role}" }`);

      // 3. Update/Merge Firestore Document Profile to prevent SvelteKit view locks
      const userDocRef = db.collection('users').doc(uid);
      await userDocRef.set({
        uid: uid,
        email: account.email,
        role: account.role,
        isProfileComplete: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`[+] Synced Firestore document "users/${uid}" -> role: "${account.role}"`);
      console.log(`✨ SUCCESS: ${account.email} is fully repaired.\n`);

    } catch (err) {
      console.error(`❌ FAILED TO REPAIR account ${account.email}:`, err.message, '\n');
    }
  }

  console.log('=============================================================');
  console.log('✅ RECOVERY SEQUENCE COMPLETE.');
  console.log('👉 Please log out of your active browser session, clear cache, and sign back in.');
  console.log('=============================================================');
}

runRecovery().catch(console.error);
