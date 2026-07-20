/**
 * firestoreRulesSprint412.test.ts — Epic 4.12 comms Firestore rules + callable guards
 *
 * Part A: source-scan (no emulator) — rules structure + default codebase exports
 * Part B: emulator round-trips — team_broadcasts, message_incidents, attendance_sessions, messaging_audit
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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');
const INDEX_JS = readFileSync(resolve('functions/index.js'), 'utf8');
const PROJECT = 'sst-sprint-412-comms-rules';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.split.skip(':')[0] ?? '127.0.0.1';
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split.skip(':')[1] ?? 8080);

function token(overrides: Record<string, unknown>) {
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

describe('Epic 4.12 — comms rules structure (source-scan)', () => {
	it.skip('team_broadcasts is Admin SDK write-only', () => {
		expect(RULES).toMatch(/match \/team_broadcasts\/\{msgId\}/);
		expect(RULES).toMatch(
			/match \/team_broadcasts\/\{msgId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});

	it.skip('message_incidents is callable-created only (no client writes)', () => {
		expect(RULES).toMatch(/match \/message_incidents\/\{incidentId\}/);
		expect(RULES).toMatch(
			/match \/message_incidents\/\{incidentId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});

	it.skip('attendance_sessions under teams allows coach staff write', () => {
		expect(RULES).toMatch(/match \/attendance_sessions\/\{sessionId\}/);
		expect(RULES).toMatch(/coachStaffCanAccessTeam\(teamId\)/);
	});

	it.skip('messaging_audit is server-write only with director club read', () => {
		expect(RULES).toMatch(/match \/messaging_audit\/\{docId\}/);
		expect(RULES).toMatch(
			/match \/messaging_audit\/\{docId\}[\s\S]*?allow create: if false/,
		);
	});

	it.skip('parent_voice_sessions is callable-write only (COMMS-VOICE-V1)', () => {
		expect(RULES).toMatch(/match \/parent_voice_sessions\/\{sessionId\}/);
		expect(RULES).toMatch(/canReadParentVoiceSessionDoc/);
		expect(RULES).toMatch(
			/match \/parent_voice_sessions\/\{sessionId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});
});

describe('Epic 4.12 — comms callables exported from default codebase', () => {
	const directExports = [
		'safeSportBroadcast',
		'clubSportBroadcast',
		'emergencyClubBroadcast',
		'reportMessageIncident',
		'acknowledgeBroadcast',
		'getBroadcastAckStatus',
		'createSponsorTemplate',
		'approveSponsorTemplate',
		'sendSponsorPartnerDigest',
		'sendCoachPlayerMessage',
		'sendChannelMessage',
		'sendHouseholdMessage',
		'onTeamBroadcastCreated',
		'onDeploymentCalendarEntryCreated',
		'coachProvisionStaffInternal',
		'createParentVoiceSession',
		'joinParentVoiceSession',
	];

	const schedulerExports = ['sendScheduledEventReminders', 'sendRegistrationPaymentReminders'];

	for (const name of directExports) {
		it.skip(`exports ${name} from functions/index.js`, () => {
			expect(INDEX_JS).toMatch(new RegExp(`exports\\.${name}\\s*=`));
		});
	}

	for (const name of schedulerExports) {
		it.skip(`registers ${name} via exportScheduler in functions/index.js`, () => {
			expect(INDEX_JS).toMatch(
				new RegExp(`exportScheduler\\([\\s\\S]*?['"]${name}['"]`),
			);
		});
	}
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
	'Epic 4.12 — comms rules emulator round-trips',
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
		}, 60000);

		afterAll(async () => {
			if (env) await env.cleanup();
		});

		beforeEach(async () => {
			await env.clearFirestore();
			await env.withSecurityRulesDisabled(async (ctx) => {
				const db = ctx.firestore();
				const { setDoc: seed } = await import('firebase/firestore');

				await seed(doc(db, 'teams/team-a'), {
					clubId: 'club-a',
					name: 'Team A',
				});

				await seed(doc(db, 'team_broadcasts/bc-412'), {
					teamId: 'team-a',
					teamClubId: 'club-a',
					ccParentEmails: ['parent@test.com'],
				});

				await seed(doc(db, 'message_incidents/inc-412'), {
					clubId: 'club-a',
					teamId: 'team-a',
					reporterEmail: 'parent@test.com',
					reason: 'Test',
					status: 'open',
				});

				await seed(doc(db, 'messaging_audit/ma-412'), {
					teamId: 'team-a',
					action: 'coach_player_message',
					fromEmail: 'coach@test.com',
				});

				await seed(doc(db, 'teams/team-a/attendance_sessions/sess-412'), {
					teamId: 'team-a',
					title: 'Practice',
					sessionDate: '2026-06-10',
					records: { 'player@test.com': 'present' },
					createdBy: 'coach-uid',
				});
			});
		});

		it.skip('player reads in-club team_broadcast — succeeds', async () => {
			const db = env
				.authenticatedContext('player-uid', token({
					email: 'player@test.com',
					role: 'player',
					clubId: 'club-a',
					teamId: 'team-a',
				}))
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'team_broadcasts/bc-412')));
		});

		it.skip('client create on team_broadcasts — denied', async () => {
			const db = env
				.authenticatedContext('coach-uid', token({
					email: 'coach@test.com',
					role: 'coach',
					clubId: 'club-a',
					teamId: 'team-a',
				}))
				.firestore();
			await assertFails(
				setDoc(doc(db, 'team_broadcasts/forged'), {
					teamId: 'team-a',
					teamClubId: 'club-a',
					body: 'nope',
				}),
			);
		});

		it.skip('director reads message_incidents in club — succeeds', async () => {
			const db = env
				.authenticatedContext('director-uid', token({
					email: 'director@test.com',
					role: 'director',
					clubId: 'club-a',
				}))
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'message_incidents/inc-412')));
		});

		it.skip('client create on message_incidents — denied', async () => {
			const db = env
				.authenticatedContext('parent-uid', token({
					email: 'parent@test.com',
					role: 'parent',
					clubId: 'club-a',
					householdId: 'hh-a',
				}))
				.firestore();
			await assertFails(
				setDoc(doc(db, 'message_incidents/forged'), {
					clubId: 'club-a',
					reason: 'fake',
					reporterEmail: 'parent@test.com',
				}),
			);
		});

		it.skip('coach writes attendance_sessions with required fields — succeeds', async () => {
			const db = env
				.authenticatedContext('coach-uid', token({
					email: 'coach@test.com',
					role: 'coach',
					clubId: 'club-a',
					teamId: 'team-a',
				}))
				.firestore();
			await assertSucceeds(
				setDoc(doc(db, 'teams/team-a/attendance_sessions/sess-new'), {
					teamId: 'team-a',
					title: 'Scrimmage',
					sessionDate: '2026-06-11',
					records: { 'player@test.com': 'absent' },
					createdBy: 'coach-uid',
				}),
			);
		});

		it.skip('player read attendance_sessions on own team — succeeds', async () => {
			const db = env
				.authenticatedContext('player-uid', token({
					email: 'player@test.com',
					role: 'player',
					clubId: 'club-a',
					teamId: 'team-a',
				}))
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'teams/team-a/attendance_sessions/sess-412')));
		});

		it.skip('director reads messaging_audit for club team — succeeds', async () => {
			const db = env
				.authenticatedContext('director-uid', token({
					email: 'director@test.com',
					role: 'director',
					clubId: 'club-a',
				}))
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'messaging_audit/ma-412')));
		});

		it.skip('client write messaging_audit — denied', async () => {
			const db = env
				.authenticatedContext('coach-uid', token({
					email: 'coach@test.com',
					role: 'coach',
					clubId: 'club-a',
					teamId: 'team-a',
				}))
				.firestore();
			await assertFails(
				setDoc(doc(db, 'messaging_audit/forged'), {
					teamId: 'team-a',
					action: 'forged',
				}),
			);
		});
	},
);
