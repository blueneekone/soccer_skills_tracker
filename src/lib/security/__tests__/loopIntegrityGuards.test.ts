/**
 * loopIntegrityGuards.test.ts — LAUNCH-test-integrity emulator round-trip guards
 *
 * Guards G1–G5 and G7–G10 (G6 = CI job, already shipped).
 * Each guard maps to a shipped fix and asserts the REAL firestore.rules condition.
 *
 * Runs ONLY against the Firestore emulator.
 * Local (no emulator): `describe.skipIf` causes the suite to be SKIPPED — zero failures,
 * which confirms clean import/parse. Real pass/fail is in CI (firestore-rules job).
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
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');
const PROJECT = 'sst-loop-integrity-guards';
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
	'LAUNCH-test-integrity — Loop Integrity Guards G1–G5, G7–G10 (emulator)',
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
				const { setDoc: seed } = await import('firebase/firestore');

				// G1: player_stats doc — uid-keyed, clubId/teamId/playerName denormalised
				await seed(doc(db, 'player_stats/uid-player-a'), {
					clubId: 'club-a',
					teamId: 'team-a',
					playerName: 'ChildPlayer',
				});

				// G2: team_assignments intent — active, team-scoped
				await seed(doc(db, 'team_assignments/intent-1'), {
					tenantId: 'club-a',
					teamId: 'team-a',
					status: 'active',
					scope: 'team',
				});

				// G3 + G9: child player user doc
				await seed(doc(db, 'users/child@test.com'), {
					role: 'player',
					clubId: 'club-a',
					teamId: 'team-a',
				});

				// G1 (parentCanSeePlayerName) + G3 + G9 + G10: household doc
				await seed(doc(db, 'households/hh-a'), {
					parentEmails: ['parent@test.com'],
					playerEmails: ['child@test.com'],
					playerNames: ['ChildPlayer'],
					clubId: 'club-a',
				});

				// G4: team_broadcasts — club-scoped with parent CC
				await seed(doc(db, 'team_broadcasts/bc-1'), {
					teamClubId: 'club-a',
					ccParentEmails: ['parent@test.com'],
				});

				// G5: license_entitlements — club subscription doc
				await seed(doc(db, 'license_entitlements/club-a'), {
					tier: 'pro',
					subscription_status: 'active',
				});

				// G7: rl_transitions — read=isSuper() only, write=false
				await seed(doc(db, 'rl_transitions/rt-1'), {
					workoutId: 'w-1',
					clubId: 'club-a',
				});

				// G8: consent_records — clubId-scoped; subjectEmail for self-read
				await seed(doc(db, 'consent_records/cr-1'), {
					clubId: 'club-a',
					subjectEmail: 'child@test.com',
				});

				// G8: vpc_requests — parentEmail-scoped for parent self-read
				await seed(doc(db, 'vpc_requests/vpc-1'), {
					clubId: 'club-a',
					parentEmail: 'parent@test.com',
				});

				// G10: household sub-collection thread message
				await seed(doc(db, 'households/hh-a/thread_messages/msg-1'), {
					text: 'Hello',
					sentAt: 0,
				});
			});
		});

		// ── G1 — player_stats XP field-path parity (T0-1 / T1-10) ───────────────
		// Rule: allow read if authed() && playerVpcAllowed() && (
		//   playerKey == request.auth.uid  ← positive 1
		//   || (resource.data.keys().hasAll(['playerName']) && parentCanSeePlayerName(...))  ← positive 2
		//   || (isDirector() && tokenClubMatchesDoc(resource.data))  ← negative: cross-club fails
		// )

		it('G1: player reads OWN player_stats doc (uid == playerKey) — succeeds', async () => {
			const db = env
				.authenticatedContext('uid-player-a', {
					token: token({
						email: 'player@club-a.com',
						role: 'player',
						clubId: 'club-a',
						teamId: 'team-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'player_stats/uid-player-a')));
		});

		it('G1: parent reads child player_stats via playerName/household claim — succeeds', async () => {
			// parentCanSeePlayerName('ChildPlayer') ← households/hh-a.playerNames has 'ChildPlayer'
			const db = env
				.authenticatedContext('parent-uid', {
					token: token({
						email: 'parent@test.com',
						role: 'parent',
						clubId: 'club-a',
						householdId: 'hh-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'player_stats/uid-player-a')));
		});

		it('G1: cross-club director read of player_stats is denied (tokenClubMatchesDoc fails)', async () => {
			// doc.clubId='club-a', director.tokenClub='club-b' → tokenClubMatchesDoc = false
			const db = env
				.authenticatedContext('director-b', {
					token: token({
						email: 'director@club-b.com',
						role: 'director',
						clubId: 'club-b',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'player_stats/uid-player-a')));
		});

		// ── G2 — intent → team_assignments shape guard (T0-7) ───────────────────
		// Rule: allow get if isPlayer() && status=='active' && scope=='team' && teamId==tokenTeam()

		it('G2: player on team-a reads active team-a assignment — succeeds', async () => {
			const db = env
				.authenticatedContext('uid-player-a', {
					token: token({
						email: 'player@club-a.com',
						role: 'player',
						clubId: 'club-a',
						teamId: 'team-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'team_assignments/intent-1')));
		});

		it('G2: player on team-b reads team-a assignment — denied (tokenTeam mismatch)', async () => {
			// intent-1.teamId='team-a', player.tokenTeam='team-b' → condition fails
			const db = env
				.authenticatedContext('uid-player-b', {
					token: token({
						email: 'player@club-b.com',
						role: 'player',
						clubId: 'club-b',
						teamId: 'team-b',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'team_assignments/intent-1')));
		});

		// ── G3 — parentProvisionOperative seeded fields ──────────────────────────
		// Rule: canReadUsersDocument → parentHouseholdAllowsChildEmail(userId.lower())
		//   = isParent() && tokenHousehold()!=null && households/hh.playerEmails.hasAny([childKey])

		it('G3: parent with matching householdId reads child users/{email} doc — succeeds', async () => {
			// households/hh-a.playerEmails has 'child@test.com'
			const db = env
				.authenticatedContext('parent-uid', {
					token: token({
						email: 'parent@test.com',
						role: 'parent',
						clubId: 'club-a',
						householdId: 'hh-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'users/child@test.com')));
		});

		it('G3: parent with non-matching householdId reads child users/{email} doc — denied', async () => {
			// households/hh-other does not exist → parentHouseholdAllowsChildEmail = false
			const db = env
				.authenticatedContext('parent-other', {
					token: token({
						email: 'other-parent@test.com',
						role: 'parent',
						clubId: 'club-b',
						householdId: 'hh-other',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'users/child@test.com')));
		});

		// ── G4 — safeSportBroadcast / team_broadcasts delivery (T0-8) ───────────
		// Rule: allow get,list if (tokenTenant()!='' && teamClubId==tokenTenant() && isPlayer())
		//                       || (isParent() && emailKey() in ccParentEmails)

		it('G4: player on club-a reads club-a team_broadcast — succeeds', async () => {
			// tokenTenant()='club-a' == teamClubId='club-a', isPlayer() = true
			const db = env
				.authenticatedContext('uid-player-a', {
					token: token({
						email: 'player@club-a.com',
						role: 'player',
						clubId: 'club-a',
						teamId: 'team-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'team_broadcasts/bc-1')));
		});

		it('G4: parent reads broadcast via ccParentEmails — succeeds', async () => {
			// isParent() && emailKey()='parent@test.com' in ccParentEmails
			const db = env
				.authenticatedContext('parent-uid', {
					token: token({
						email: 'parent@test.com',
						role: 'parent',
						householdId: 'hh-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'team_broadcasts/bc-1')));
		});

		it('G4: cross-club player reads club-a broadcast — denied (tokenTenant mismatch)', async () => {
			// tokenTenant()='club-b' != teamClubId='club-a'
			const db = env
				.authenticatedContext('uid-player-b', {
					token: token({
						email: 'player@club-b.com',
						role: 'player',
						clubId: 'club-b',
						teamId: 'team-b',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'team_broadcasts/bc-1')));
		});

		// ── G5 — subscription gate (T0-6) ────────────────────────────────────────
		// Rule: allow read if canReadLicenseEntitlement(clubId)
		//   = isDirector() && tokenClub() == clubPathId  (among other paths)

		it('G5: director reads own club license_entitlement — succeeds', async () => {
			// isDirector() && tokenClub()='club-a' == clubPathId='club-a'
			const db = env
				.authenticatedContext('director-a', {
					token: token({
						email: 'director@club-a.com',
						role: 'director',
						clubId: 'club-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'license_entitlements/club-a')));
		});

		it('G5: cross-club director reads club-a license_entitlement — denied', async () => {
			// tokenClub()='club-b' != clubPathId='club-a'; no matching canReadLicenseEntitlement path
			const db = env
				.authenticatedContext('director-b', {
					token: token({
						email: 'director@club-b.com',
						role: 'director',
						clubId: 'club-b',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'license_entitlements/club-a')));
		});

		// ── G7 — RL trigger write target ─────────────────────────────────────────
		// Rule: allow read if authed() && isSuper(); allow write: if false

		it('G7: global_admin reads rl_transitions — succeeds (isSuper())', async () => {
			const db = env
				.authenticatedContext('super-uid', {
					token: token({ email: 'admin@platform.com', role: 'global_admin' }),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'rl_transitions/rt-1')));
		});

		it('G7: player read of rl_transitions — denied (not isSuper())', async () => {
			const db = env
				.authenticatedContext('uid-player-a', {
					token: token({
						email: 'player@club-a.com',
						role: 'player',
						clubId: 'club-a',
						teamId: 'team-a',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'rl_transitions/rt-1')));
		});

		it('G7: client write to rl_transitions — denied even for global_admin (allow write: if false)', async () => {
			// Rule is unconditionally false for all writes — CF/Admin SDK only
			const db = env
				.authenticatedContext('super-uid', {
					token: token({ email: 'admin@platform.com', role: 'global_admin' }),
				})
				.firestore();
			await assertFails(setDoc(doc(db, 'rl_transitions/rt-new'), { workoutId: 'w-x' }));
		});

		// ── G8 — VPC ceremony batch (T1-4 / T1-5) ────────────────────────────────
		// consent_records rule: isDirector() && tokenClub()!=null && clubId==tokenClub()
		// vpc_requests rule: isParent() && parentEmail!=null && parentEmail==emailKey()

		it('G8: director reads tenant-scoped consent_record — succeeds', async () => {
			// isDirector() && tokenClub()='club-a' && cr.clubId='club-a'
			const db = env
				.authenticatedContext('director-a', {
					token: token({
						email: 'director@club-a.com',
						role: 'director',
						clubId: 'club-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'consent_records/cr-1')));
		});

		it('G8: cross-tenant director reads consent_record — denied', async () => {
			// tokenClub()='club-b' != cr.clubId='club-a'
			const db = env
				.authenticatedContext('director-b', {
					token: token({
						email: 'director@club-b.com',
						role: 'director',
						clubId: 'club-b',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'consent_records/cr-1')));
		});

		it('G8: parent reads own vpc_request by parentEmail match — succeeds', async () => {
			// isParent() && vpc.parentEmail='parent@test.com' == emailKey()='parent@test.com'
			const db = env
				.authenticatedContext('parent-uid', {
					token: token({
						email: 'parent@test.com',
						role: 'parent',
						householdId: 'hh-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'vpc_requests/vpc-1')));
		});

		it('G8: different parent reads vpc_request — denied (parentEmail mismatch)', async () => {
			// emailKey()='other-parent@test.com' != vpc.parentEmail='parent@test.com'
			const db = env
				.authenticatedContext('parent-other', {
					token: token({
						email: 'other-parent@test.com',
						role: 'parent',
						householdId: 'hh-other',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'vpc_requests/vpc-1')));
		});

		// ── G9 — custom-claims / tokenHousehold dependency (Tier-2 Item 3) ───────
		// Proves syncUserClaims MUST emit householdId — without it, parentHouseholdAllowsChildEmail=false.
		// Rule: parentHouseholdAllowsChildEmail(userId.lower())
		//   = isParent() && tokenHousehold()!=null && households/hh.playerEmails.hasAny([childKey])

		it('G9: parent WITH householdId claim reads child users/{email} doc — succeeds', async () => {
			// tokenHousehold()='hh-a' → parentHouseholdAllowsChildEmail('child@test.com') = true
			const db = env
				.authenticatedContext('parent-uid', {
					token: token({
						email: 'parent@test.com',
						role: 'parent',
						householdId: 'hh-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'users/child@test.com')));
		});

		it('G9: parent WITHOUT householdId claim reads child users/{email} doc — denied', async () => {
			// tokenHousehold()=null → parentHouseholdAllowsChildEmail returns false immediately
			// Simulates the pre-fix state where syncUserClaims did not emit householdId
			const db = env
				.authenticatedContext('parent-nohh', {
					token: token({
						email: 'parent-nohh@test.com',
						role: 'parent',
						// householdId intentionally absent — validates the syncUserClaims fix
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'users/child@test.com')));
		});

		// ── G10 — household thread path ──────────────────────────────────────────
		// Rule: allow read if tokenHousehold()!=null && tokenHousehold()==householdId (path param)
		//   OR  (tokenRole()=='player' && userDoc().householdId==householdId)

		it('G10: parent with matching householdId reads household thread message — succeeds', async () => {
			// tokenHousehold()='hh-a' == householdId path param 'hh-a'
			const db = env
				.authenticatedContext('parent-uid', {
					token: token({
						email: 'parent@test.com',
						role: 'parent',
						householdId: 'hh-a',
					}),
				})
				.firestore();
			await assertSucceeds(getDoc(doc(db, 'households/hh-a/thread_messages/msg-1')));
		});

		it('G10: parent with non-matching householdId reads household thread message — denied', async () => {
			// tokenHousehold()='hh-other' != 'hh-a'; not a player; denied
			const db = env
				.authenticatedContext('parent-other', {
					token: token({
						email: 'other-parent@test.com',
						role: 'parent',
						householdId: 'hh-other',
					}),
				})
				.firestore();
			await assertFails(getDoc(doc(db, 'households/hh-a/thread_messages/msg-1')));
		});
	},
);
