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
    
    // Create root-level team and roster for IntentEngine
    await db.collection('teams').doc(teamId).set({ 
        name: 'U17 Premier', 
        playerUids: ['mock-player-uid'],
        coachEmail: 'coach-test@sstracker.app',
        clubId: clubId
    });
    await db.collection('rosters').doc(teamId).set({ players: ['Leo Hernandez'] });

    // 2.5 Mock Team Drill
    await db.collection('teams').doc(teamId).collection('drills').doc('mock-drill-1').set({
        title: 'Toe Taps Mastery',
        attributeId: 'striking',
        baseXP: 150,
        createdAt: new Date().toISOString()
    });
    
    await db.collection('team_assignments').doc('assign-coach').set({
        teamId: teamId,
        clubId: clubId,
        uid: 'mock-coach-uid',
        role: 'coach',
        playerName: 'Coach Henderson',
        status: 'active'
    });

    await db.collection('team_assignments').doc('assign-player').set({
        teamId: teamId,
        clubId: clubId,
        uid: 'mock-player-uid',
        role: 'player',
        playerName: 'Leo Hernandez',
        email: 'player-test@sstracker.app',
        status: 'active'
    });

    // 4. Create Auth Users and Generate JWT Custom Tokens
    // We must ensure the auth user exists with an email so that authStore.user.email is populated for coach queries
    const authUsers = [
        { uid: 'mock-coach-uid', email: 'coach-test@sstracker.app' },
        { uid: 'mock-player-uid', email: 'player-test@sstracker.app' },
        { uid: 'mock-parent-uid', email: 'parent-test@sstracker.app' }
    ];
    for (const u of authUsers) {
        try {
            await admin.auth().updateUser(u.uid, { email: u.email });
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                await admin.auth().createUser({ uid: u.uid, email: u.email });
            }
        }
    }

    const coachToken = await admin.auth().createCustomToken('mock-coach-uid', { role: 'coach', clubId, teamId });
    const playerToken = await admin.auth().createCustomToken('mock-player-uid', { role: 'player', clubId, teamId, householdId: 'mock-household-1', isMinor: true });
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
