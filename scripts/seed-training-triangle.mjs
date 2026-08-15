import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Seed authentic dummy data into the dev database for the marketing video
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    console.log('🌱 Seeding Training Triangle Mock State...');
    const clubId = 'mock-apex-fc';
    const teamId = 'mock-u17-premier';
    
    // 1. Create a coach user record
    await db.collection('users').doc('mock-coach-uid').set({
        email: 'coach-test@sstracker.app',
        role: 'coach',
        displayName: 'Coach Henderson',
        isProfileComplete: true,
        clubId: clubId,
        teamId: teamId,
        clearance: { status: 'cleared' }
    });

    // 2. Create a player user record
    await db.collection('users').doc('mock-player-uid').set({
        email: 'player-test@sstracker.app',
        role: 'player',
        displayName: 'Leo Hernandez',
        playerName: 'Leo Hernandez',
        isProfileComplete: true,
        clubId: clubId,
        teamId: teamId,
        householdId: 'mock-household-1',
        vpcStatus: 'not_required'
    });
    
    // 3. Create a parent user record
    await db.collection('users').doc('mock-parent-uid').set({
        email: 'parent-test@sstracker.app',
        role: 'parent',
        displayName: 'Elena Hernandez',
        isProfileComplete: true,
        clubId: clubId,
        householdId: 'mock-household-1'
    });

    // 4. Create the team and assignments
    await db.collection('clubs').doc(clubId).set({ name: 'Apex FC' });
    
    const teamRef = db.collection('clubs').doc(clubId).collection('teams').doc(teamId);
    await teamRef.set({ name: 'U17 Premier', ageGroup: 'U17' });
    
    await db.collection('team_assignments').doc('assign-coach').set({
        teamId: teamId,
        clubId: clubId,
        uid: 'mock-coach-uid',
        role: 'coach',
        playerName: 'Coach Henderson'
    });

    await db.collection('team_assignments').doc('assign-player').set({
        teamId: teamId,
        clubId: clubId,
        uid: 'mock-player-uid',
        role: 'player',
        playerName: 'Leo Hernandez',
        email: 'player-test@sstracker.app'
    });

    // Generate Custom Tokens
    const coachToken = await admin.auth().createCustomToken('mock-coach-uid', { role: 'coach', clubId, teamId });
    const playerToken = await admin.auth().createCustomToken('mock-player-uid', { role: 'player', clubId, teamId, householdId: 'mock-household-1' });
    const parentToken = await admin.auth().createCustomToken('mock-parent-uid', { role: 'parent', clubId, householdId: 'mock-household-1' });

    fs.writeFileSync('./scripts/mock-tokens.json', JSON.stringify({
        coach: coachToken,
        player: playerToken,
        parent: parentToken
    }));

    console.log('✅ Mock State Seeded and Tokens Generated!');
    process.exit(0);
}

run();
