const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  projectId: 'sports-skill-tracker-dev'
});

const db = admin.firestore();
const auth = admin.auth();

const MOCK_CLUB_ID = 'mock-club';
const MOCK_TEAM_ID = 'mock-team';

const personas = [
  {
    uid: 'marketing-player-uid',
    email: 'marketing_player@mock.com',
    displayName: 'Marketing Player',
    claims: { role: 'player', clubId: MOCK_CLUB_ID, teamId: MOCK_TEAM_ID },
    doc: {
      email: 'marketing_player@mock.com',
      displayName: 'Marketing Player',
      totalXp: 185000,
      xp: 185000, // Legacy fallback
      stats: { PAC: 92, SHO: 88, PAS: 85, DRI: 90, DEF: 65, PHY: 80 },
      clubId: MOCK_CLUB_ID,
      teamId: MOCK_TEAM_ID,
      onboardingComplete: true
    }
  },
  {
    uid: 'marketing-coach-uid',
    email: 'marketing_coach@mock.com',
    displayName: 'Marketing Coach',
    claims: { role: 'coach', clubId: MOCK_CLUB_ID },
    doc: {
      email: 'marketing_coach@mock.com',
      displayName: 'Marketing Coach',
      clubId: MOCK_CLUB_ID,
      onboardingComplete: true
    }
  },
  {
    uid: 'marketing-admin-uid',
    email: 'marketing_admin@mock.com',
    displayName: 'Marketing Director',
    claims: { role: 'director', clubId: MOCK_CLUB_ID },
    doc: {
      email: 'marketing_admin@mock.com',
      displayName: 'Marketing Director',
      clubId: MOCK_CLUB_ID,
      onboardingComplete: true
    }
  }
];

async function run() {
  console.log('Injecting mock data...');
  const links = {};

  for (const p of personas) {
    try {
      const userRecord = await auth.getUserByEmail(p.email);
      await auth.deleteUser(userRecord.uid);
      console.log(`Deleted existing user ${p.email}`);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        console.error(e);
      }
    }

    const userRecord = await auth.createUser({
      uid: p.uid,
      email: p.email,
      emailVerified: true,
      displayName: p.displayName
    });
    console.log(`Created user ${p.email}`);

    await auth.setCustomUserClaims(userRecord.uid, p.claims);
    console.log(`Set claims for ${p.email}`);

    await db.collection('users').doc(p.email).set(p.doc);
    console.log(`Injected Firestore doc for ${p.email}`);

    // Generate Magic Link for Playwright
    const link = await auth.generateSignInWithEmailLink(p.email, {
      url: 'http://localhost:5173/login',
      handleCodeInApp: true
    });
    links[p.uid] = link;
  }

  await db.collection('clubs').doc(MOCK_CLUB_ID).set({
    name: 'Nexus Elite Academy',
    status: 'ACTIVE',
    stripeCustomerId: 'cus_mock123'
  });

  await db.collection('clubs').doc(MOCK_CLUB_ID).collection('teams').doc(MOCK_TEAM_ID).set({
    name: 'U17 Elite',
    coachUid: 'marketing-coach-uid',
    players: ['marketing-player-uid']
  });

  fs.writeFileSync('./mock-links.json', JSON.stringify(links, null, 2));
  console.log('Successfully wrote mock-links.json');
  console.log('Data injection complete!');
}

run().catch(console.error);
