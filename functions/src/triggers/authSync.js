const { auth } = require('firebase-functions/v1');
const admin = require('firebase-admin');

exports.authOnCreate = auth.user().onCreate(async (user) => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = () => admin.firestore();

  const { uid, email, displayName } = user;

  if (!email) {
    console.warn(`[authSync] User ${uid} created without an email.`);
    return;
  }

  const emailLower = email.toLowerCase();

  try {
    await db().collection('users').doc(emailLower).set({
      uid,
      email: emailLower,
      displayName: displayName || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[authSync] Profile created for ${emailLower}`);
  } catch (err) {
    console.error(`[authSync] Failed to create profile for ${emailLower}`, err);
    try {
      await db().collection('security_audits').add({
        event: 'auth_sync_failure',
        uid,
        email: emailLower,
        error: err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (auditErr) {
       console.error(`[authSync] Failed to write to security_audits`, auditErr);
    }
  }
});
