const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function whitelistAdmin() {
  const email = 'ecwaechtler@gmail.com';
  const ref = db.collection('platform_config').doc('admins');
  
  try {
    const doc = await ref.get();
    let emails = [];
    if (doc.exists) {
      emails = doc.data().emails || [];
    }
    
    if (!emails.includes(email)) {
      emails.push(email);
      await ref.set({ emails }, { merge: true });
      console.log(`Successfully added ${email} to platform_config/admins`);
    } else {
      console.log(`${email} is already in platform_config/admins`);
    }

    // Now update the user doc to re-trigger the syncUserClaims CF
    await db.collection('users').doc(email).update({ role: 'global_admin' });
    console.log(`Triggered syncUserClaims for ${email} with role: global_admin`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

whitelistAdmin();
