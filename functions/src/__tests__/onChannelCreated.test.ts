import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { describe, it, before, beforeEach, after } from 'node:test';
import * as assert from 'node:assert';
import { resolveParentEmails } from '../utils/resolveParentEmails';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const RULES = readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8');
const PROJECT = 'sst-shadow-cc-rules-integration';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1';
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080);

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT });
}

function token(overrides: any) {
  return {
    email: 'actor@test.com',
    role: 'player',
    clubId: null,
    teamId: null,
    householdId: null,
    minor: false,
    isCleared: false,
    ...overrides,
  };
}

describe('onChannelCreated Integration and Security', () => {
    let env: any;

    before(async () => {
      env = await initializeTestEnvironment({
        projectId: PROJECT,
        firestore: { rules: RULES, host: FIRESTORE_HOST, port: FIRESTORE_PORT },
      });
    }, 60000);

    after(async () => {
      if (env) await env.cleanup();
    });

    beforeEach(async () => {
      await env.clearFirestore();
    });

    it('Test A: Adult coach and adult player -> NO ccParentEmails', async () => {
        await env.withSecurityRulesDisabled(async (ctx: any) => {
            const db = ctx.firestore();
            const { doc, setDoc } = require('firebase/firestore');

            await setDoc(doc(db, 'users/user-coach'), { email: 'coach@test.com', role: 'coach' });
            await setDoc(doc(db, 'users/user-adult'), { email: 'adult@test.com', role: 'player', isMinor: false });
        });

        const db = admin.firestore();
        const { ccParentEmails, missingParents } = await resolveParentEmails(db, ['user-coach', 'user-adult']);

        assert.deepEqual(ccParentEmails, []);
        assert.equal(missingParents, false);
    });

    it('Test B: Adult coach and minor player -> Populates ccParentEmails', async () => {
        await env.withSecurityRulesDisabled(async (ctx: any) => {
            const db = ctx.firestore();
            const { doc, setDoc } = require('firebase/firestore');

            await setDoc(doc(db, 'users/user-coach'), { email: 'coach@test.com', role: 'coach' });
            await setDoc(doc(db, 'users/user-minor'), { email: 'minor@test.com', role: 'player', isMinor: true });
            await setDoc(doc(db, 'households/h-1'), { playerEmails: ['minor@test.com'], parentEmails: ['parent@test.com'] });
        });

        const db = admin.firestore();
        const { ccParentEmails, missingParents } = await resolveParentEmails(db, ['user-coach', 'user-minor']);

        assert.deepEqual(ccParentEmails, ['parent@test.com']);
        assert.equal(missingParents, false);
    });

    it('Test C: Minor player without guardian -> BLOCKED_VPC_PENDING', async () => {
        await env.withSecurityRulesDisabled(async (ctx: any) => {
            const db = ctx.firestore();
            const { doc, setDoc } = require('firebase/firestore');

            await setDoc(doc(db, 'users/user-coach'), { email: 'coach@test.com', role: 'coach' });
            await setDoc(doc(db, 'users/user-minor-noguardian'), { email: 'orphan@test.com', role: 'player', isMinor: true });
        });

        const db = admin.firestore();
        const { ccParentEmails, missingParents } = await resolveParentEmails(db, ['user-coach', 'user-minor-noguardian']);

        assert.deepEqual(ccParentEmails, []);
        assert.equal(missingParents, true);
    });

    it('Test D: Client-side attempt to prepopulate ccParentEmails -> Rejected by rules', async () => {
        await env.withSecurityRulesDisabled(async (ctx: any) => {
            const db = ctx.firestore();
            const { doc, setDoc } = require('firebase/firestore');
            await setDoc(doc(db, 'clubs/club-a'), { name: 'Club A' });
            await setDoc(doc(db, 'teams/team-a'), { clubId: 'club-a' });
        });

        const db = env
            .authenticatedContext('coach-uid', token({
                email: 'coach@test.com',
                role: 'coach',
                clubId: 'club-a',
                teamId: 'team-a',
            }))
            .firestore();

        const { doc, setDoc } = require('firebase/firestore');

        await assertFails(
            setDoc(doc(db, 'clubs/club-a/channels/channel-new'), {
                type: 'channel',
                name: 'Test Channel',
                memberIds: ['coach@test.com'],
                channelStatus: 'BLOCKED_VPC_PENDING', // Valid status for create
                ccParentEmails: ['parent@test.com'], // The payload attempting to bypass
            }),
        );
    });
});
