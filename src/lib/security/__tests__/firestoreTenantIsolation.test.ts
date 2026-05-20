/**
 * firestoreTenantIsolation.test.ts — Sprint 1.3 semantic isolation
 *
 * Verifies cross-club reads fail with permission-denied when JWT clubId
 * does not match the document partition.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');
const PROJECT = 'sst-sprint-13-rules';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1';
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080);

function token(overrides: Record<string, unknown>) {
	return {
		email: 'actor@test.com',
		role: 'player',
		clubId: null,
		teamId: null,
		...overrides,
	};
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
	'Sprint 1.3 — Firestore tenant isolation (emulator)',
	() => {
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
	});

	afterAll(async () => {
		if (env) await env.cleanup();
	});

	beforeEach(async () => {
		await env.clearFirestore();
		await env.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			const { setDoc } = await import('firebase/firestore');

			await setDoc(doc(db, 'users/player@club-a.com'), {
				role: 'player',
				clubId: 'club-a',
				teamId: 'team-a',
			});
			await setDoc(doc(db, 'users/player@club-b.com'), {
				role: 'player',
				clubId: 'club-b',
				teamId: 'team-b',
			});
			await setDoc(doc(db, 'teams/team-a'), {
				clubId: 'club-a',
				coachEmail: 'coach@club-a.com',
			});
			await setDoc(doc(db, 'teams/team-b'), {
				clubId: 'club-b',
				coachEmail: 'coach@club-b.com',
			});
			await setDoc(doc(db, 'organizations/club-a'), {
				clubId: 'club-a',
				name: 'Club A',
			});
			await setDoc(doc(db, 'organizations/club-b'), {
				clubId: 'club-b',
				name: 'Club B',
			});
			await setDoc(doc(db, 'workouts/w-cross'), {
				userId: 'uid-b',
				teamId: 'team-b',
				clubId: 'club-b',
				player: 'Player B',
			});
			await setDoc(doc(db, 'clubs/club-a'), { name: 'Club A' });
			await setDoc(doc(db, 'clubs/club-b'), { name: 'Club B' });
		});
	});

	it('denies director (club-a) reading users doc in club-b', async () => {
		const db = env
			.authenticatedContext('director-a', {
				token: token({ role: 'director', clubId: 'club-a', email: 'director@club-a.com' }),
			})
			.firestore();
		await assertFails(getDoc(doc(db, 'users/player@club-b.com')));
	});

	it('allows director (club-a) reading users doc in club-a', async () => {
		const db = env
			.authenticatedContext('director-a', {
				token: token({ role: 'director', clubId: 'club-a', email: 'director@club-a.com' }),
			})
			.firestore();
		await assertSucceeds(getDoc(doc(db, 'users/player@club-a.com')));
	});

	it('denies director (club-a) reading organizations/club-b', async () => {
		const db = env
			.authenticatedContext('director-a', {
				token: token({ role: 'director', clubId: 'club-a', email: 'director@club-a.com' }),
			})
			.firestore();
		await assertFails(getDoc(doc(db, 'organizations/club-b')));
	});

	it('denies director (club-a) reading workouts in club-b', async () => {
		const db = env
			.authenticatedContext('director-a', {
				token: token({ role: 'director', clubId: 'club-a', email: 'director@club-a.com' }),
			})
			.firestore();
		await assertFails(getDoc(doc(db, 'workouts/w-cross')));
	});

	it('denies coach (club-a) reading clubs/club-b', async () => {
		const db = env
			.authenticatedContext('coach-a', {
				token: token({
					role: 'coach',
					clubId: 'club-a',
					teamId: 'team-a',
					email: 'coach@club-a.com',
				}),
			})
			.firestore();
		await assertFails(getDoc(doc(db, 'clubs/club-b')));
	});

	it('allows coach (club-a) reading clubs/club-a', async () => {
		const db = env
			.authenticatedContext('coach-a', {
				token: token({
					role: 'coach',
					clubId: 'club-a',
					teamId: 'team-a',
					email: 'coach@club-a.com',
				}),
			})
			.firestore();
		await assertSucceeds(getDoc(doc(db, 'clubs/club-a')));
	});
});
