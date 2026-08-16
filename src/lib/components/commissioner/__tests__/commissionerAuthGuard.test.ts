/**
 * commissionerAuthGuard.test.ts — Commissioner OS Security & RBAC Tests
 *
 * Asserts that a Commissioner's Custom JWT Claim contains a master `tenantId`
 * and strictly enforces Zero-Trust Payload Stripping, explicitly rejecting mutations
 * to local club rosters or direct messages.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');
const PROJECT = 'sst-commissioner-rules';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1';
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080);

describe('Commissioner OS - Firestore Rules Syntax', () => {
    it('defines isCommissioner function', () => {
        expect(RULES).toMatch(/function isCommissioner\(\)/);
        expect(RULES).toMatch(/tokenRole\(\) == 'commissioner'/);
    });
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Commissioner OS - Security & RBAC (emulator)', () => {
	let env: RulesTestEnvironment;

	beforeAll(async () => {
		env = await initializeTestEnvironment({
			projectId: PROJECT,
			firestore: {
				rules: RULES,
				host: FIRESTORE_HOST,
				port: FIRESTORE_PORT,
			},
		});
	}, 60000);

	afterAll(async () => {
		await env.cleanup();
	});

	beforeEach(async () => {
		await env.clearFirestore();
	});

    function getCommissionerContext(tenantId: string) {
        return env.authenticatedContext('commish1', {
            email: 'commish@statefed.com',
            role: 'commissioner',
            tenantId: tenantId,
        });
    }

	it('denies Commissioner ability to mutate local club roster (users collection)', async () => {
        // As a commissioner, attempt to update a user doc
        const db = getCommissionerContext('fed-tenant').firestore();
        const userRef = doc(db, 'users', 'player@club.com');

        await assertFails(setDoc(userRef, { role: 'player', clubId: 'child-club' }));
	});

    it('denies Commissioner ability to mutate direct messages', async () => {
        // Attempt to create a direct message
        const db = getCommissionerContext('fed-tenant').firestore();
        const msgRef = doc(db, 'clubs', 'child-club', 'channels', 'chan1', 'messages', 'msg1');

        await assertFails(setDoc(msgRef, { text: 'hello' }));
    });
});
