import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { setDoc, doc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
        projectId: 'soccer-skills-tracker',
        firestore: { rules }
    });
}, 30000);

afterAll(async () => {
    if (testEnv) {
        await testEnv.cleanup();
    }
});

describe('coachExpandedStaffControls', () => {
    it('allows a coach in the expandedStaff list to read the team document', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'teams', 'teamA'), {
                clubId: 'clubA',
                coachEmail: 'headcoach@test.com',
                expandedStaff: ['expandedcoach@test.com']
            });
            await setDoc(doc(db, 'users', 'expandedcoach@test.com'), {
                role: 'coach',
                clubId: 'clubA'
            });
        });

        const expandedCoachContext = testEnv.authenticatedContext('expandedcoach_uid', {
            email: 'expandedcoach@test.com',
            role: 'coach',
            clubId: 'clubA'
        });

        const db = expandedCoachContext.firestore();
        const teamDocRef = doc(db, 'teams', 'teamA');

        await assertSucceeds(getDoc(teamDocRef));
    });

    it('allows a coach in the expandedStaff list to read team workouts', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'team_workouts', 'workoutA'), {
                teamId: 'teamA',
                clubId: 'clubA'
            });
        });

        const expandedCoachContext = testEnv.authenticatedContext('expandedcoach_uid', {
            email: 'expandedcoach@test.com',
            role: 'coach',
            clubId: 'clubA'
        });

        const db = expandedCoachContext.firestore();
        const workoutDocRef = doc(db, 'team_workouts', 'workoutA');

        await assertSucceeds(getDoc(workoutDocRef));
    });

    it('denies access to a coach not in the expandedStaff list', async () => {
        const unrelatedCoachContext = testEnv.authenticatedContext('unrelated_uid', {
            email: 'unrelated@test.com',
            role: 'coach',
            clubId: 'clubB'
        });

        const db = unrelatedCoachContext.firestore();
        const teamDocRef = doc(db, 'teams', 'teamA');

        await assertFails(getDoc(teamDocRef));
    });
});
