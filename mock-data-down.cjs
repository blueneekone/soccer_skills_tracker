const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'sports-skill-tracker-dev'
});

const db = admin.firestore();
const auth = admin.auth();

const MOCK_CLUB_ID = 'mock-club';
const MOCK_TEAM_ID = 'mock-team';

const mockEmails = [
  'marketing_player@mock.com',
  'marketing_coach@mock.com',
  'marketing_admin@mock.com'
];

async function run() {
  console.log('Tearing down mock data...');

  for (const email of mockEmails) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.deleteUser(userRecord.uid);
      console.log(`Deleted Auth user: ${email}`);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        console.error(`Failed to delete Auth for ${email}:`, e);
      }
    }

    try {
      await db.collection('users').doc(email).delete();
      console.log(`Deleted Firestore doc: users/${email}`);
    } catch (e) {
      console.error(`Failed to delete Firestore doc for ${email}:`, e);
    }
  }

  // Delete mock team
  try {
    await db.collection('clubs').doc(MOCK_CLUB_ID).collection('teams').doc(MOCK_TEAM_ID).delete();
    console.log(`Deleted mock team ${MOCK_TEAM_ID}`);
  } catch(e) {}

  // Delete mock club
  try {
    await db.collection('clubs').doc(MOCK_CLUB_ID).delete();
    console.log(`Deleted mock club ${MOCK_CLUB_ID}`);
  } catch(e) {}

  console.log('Teardown complete! Clean slate achieved.');
}

run().catch(console.error);
