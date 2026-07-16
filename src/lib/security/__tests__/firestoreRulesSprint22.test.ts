/**
 * firestoreRulesSprint22.test.ts — Sprint 2.2 structural guards (no emulator)
 *
 * NOTE: Tests in this file are source-scan assertions (no Firestore emulator).
 * They verify the rules text contains the expected guard expressions.
 * For emulator-based ALLOW/DENY verification see the project's
 * `npm run test:rules` script (requires Firebase emulator suite).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 2.2 — Firestore rules structure', () => {
	it('defines pii_vault with Admin SDK-only writes', () => {
		expect(RULES).toMatch(/match \/pii_vault\/\{sealId\}/);
		expect(RULES).toMatch(
			/match \/pii_vault\/\{sealId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});

	it('consents block includes DO NOT PURGE retention comment', () => {
		expect(RULES).toMatch(
			/DO NOT PURGE: Consents are legal attestations required for multi-year compliance retention/,
		);
	});

	it('consents remain Admin SDK-only writes after Sprint 2.2', () => {
		expect(RULES).toMatch(
			/match \/consents\/\{consentId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T0-7 — team_assignments list rule: cross-tenant enumeration fix
//
// Limitation: source-scan only (no Firestore emulator available in CI).
// The assertions below verify the rule text contains the required per-document
// team + tenant guards, preventing a player token from listing intents belonging
// to any other team or club.
// ─────────────────────────────────────────────────────────────────────────────
describe('T0-7 — team_assignments list rule tenant guard', () => {
	// Extract the allow list: block anchored inside the team_assignments match block.
	// We locate the allow list: rule by finding the second allow inside the team_assignments section.
	const teamAssignmentsListBlock = (() => {
		// Find the full team_assignments match block (ends at closing brace of the match block).
		const blockMatch = RULES.match(
			/match \/team_assignments\/\{intentId\}\s*\{[\s\S]*?\n\s*\}/,
		);
		if (!blockMatch) return '';
		// Within that block, extract just the allow list: … ; statement.
		const listMatch = blockMatch[0].match(/allow list:\s*if[\s\S]*?;/);
		return listMatch ? listMatch[0] : '';
	})();

	it('team_assignments allow list block is found in rules', () => {
		expect(teamAssignmentsListBlock).toBeTruthy();
		expect(teamAssignmentsListBlock).toContain('allow list:');
	});

	it('list rule player branch requires tokenTeam() guard — own-team access only (T0-7)', () => {
		// A player MUST be limited to their own team — bare isPlayer() is not sufficient.
		expect(teamAssignmentsListBlock).toMatch(
			/isPlayer\(\)[\s\S]*?resource\.data\.teamId\s*==\s*tokenTeam\(\)/,
		);
	});

	it('list rule player branch requires tenantId == tokenClub() when club claim present (T0-7)', () => {
		expect(teamAssignmentsListBlock).toMatch(/resource\.data\.tenantId\s*==\s*tokenClub\(\)/);
		expect(teamAssignmentsListBlock).toMatch(/tokenClub\(\)\s*==\s*null/);
	});

	it('list rule player branch is NOT a bare isPlayer() call — regression guard (T0-7)', () => {
		// The player branch must NOT appear as a standalone `|| isPlayer()` without further conditions.
		// Pattern: `|| isPlayer()` immediately followed by whitespace+close-paren.
		expect(teamAssignmentsListBlock).not.toMatch(/\|\|\s*isPlayer\(\)\s*[\n\r]\s*\)/);
	});

	it('list rule preserves isSuper() branch', () => {
		expect(teamAssignmentsListBlock).toContain('isSuper()');
	});

	it('list rule preserves coach/director branch with tokenClub() guard', () => {
		expect(teamAssignmentsListBlock).toMatch(
			/\(isCoach\(\) \|\| isDirector\(\)\) && tokenClub\(\) != null/,
		);
	});
});

describe('FORGE-MISSION-RAIL-VISIBILITY — player mission rail list access', () => {
	const teamAssignmentsListBlock = (() => {
		const blockMatch = RULES.match(
			/match \/team_assignments\/\{intentId\}\s*\{[\s\S]*?\n\s*\}/,
		);
		if (!blockMatch) return '';
		const listMatch = blockMatch[0].match(/allow list:\s*if[\s\S]*?;/);
		return listMatch ? listMatch[0] : '';
	})();

	it('player list does not require tokenClub() != null (team-only JWT operatives)', () => {
		expect(teamAssignmentsListBlock).not.toMatch(
			/isPlayer\(\)[\s\S]*?tokenClub\(\)\s*!=\s*null[\s\S]*?resource\.data\.teamId\s*==\s*tokenTeam\(\)/,
		);
	});

	it('player list still requires resource.data.teamId == tokenTeam()', () => {
		expect(teamAssignmentsListBlock).toMatch(
			/isPlayer\(\)[\s\S]*?resource\.data\.teamId\s*==\s*tokenTeam\(\)/,
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T0-5 — users block: privileged role self-elevation guard
//
// Source-scan only. These assertions verify:
//   (a) The users CREATE rule does NOT permit clients to self-assign the 'coach'
//       role via a coach_lookup branch — coach is exclusively server-assigned.
//   (b) 'parent' self-signup is still permitted in the create rule.
//   (c) The UPDATE rule requires role to be unchanged for all self-updates.
// ─────────────────────────────────────────────────────────────────────────────
describe('T0-5 — users block: privileged role self-elevation guard', () => {
	// These source-scan tests operate on the full RULES string rather than extracted
	// sub-blocks, to avoid brittle regex extraction across multi-line allow statements.

	it('users match /users/{userId} block exists in rules', () => {
		expect(RULES).toContain('match /users/{userId}');
	});

	it('create rule does NOT contain coach_lookup role branch (T0-5)', () => {
		// coach_lookup must NOT appear immediately before a role comparison — the
		// coach_lookup role bypass has been removed; clients cannot self-assign role:coach.
		expect(RULES).not.toMatch(
			/coach_lookup[\s\S]{0,200}request\.resource\.data\.role\s*==/,
		);
	});

	it("create rule allows 'parent' self-signup in users block (T0-5)", () => {
		// The T0-5 allowlist must still permit parents to self-onboard.
		expect(RULES).toMatch(/request\.resource\.data\.role\s*==\s*'parent'/);
	});

	it("create rule does NOT permit direct role:'coach' assignment by client (T0-5)", () => {
		// No rule branch should allow request.resource.data.role == 'coach'.
		// Coach role is exclusively assigned by claimCoachInvite (Admin SDK).
		expect(RULES).not.toMatch(/request\.resource\.data\.role\s*==\s*'coach'/);
	});

	it('update rule for users requires role to be unchanged for self-updates (T0-5)', () => {
		expect(RULES).toMatch(
			/request\.resource\.data\.get\('role',\s*null\)\s*==\s*resource\.data\.get\('role',\s*null\)/,
		);
	});

	it('update rule for users requires teamId to be unchanged for self-updates (T0-5)', () => {
		expect(RULES).toMatch(
			/request\.resource\.data\.get\('teamId',\s*null\)\s*==\s*resource\.data\.get\('teamId',\s*null\)/,
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T1-4 — consent_records: director tenant-scoped read
//
// Source-scan only. These assertions verify:
//   (a) The consent_records rule allows a director to read docs in their club
//       (isDirector() + tokenClub() != null + resource.data.clubId == tokenClub()).
//   (b) The allow write branch is still restricted to isSuper() — no client writes.
//   (c) The director branch is scoped by clubId == tokenClub() preventing
//       cross-tenant access (regression guard).
// ─────────────────────────────────────────────────────────────────────────────
describe('T1-4 — consent_records director read rule', () => {
	const consentBlock = (() => {
		const blockMatch = RULES.match(
			/match \/consent_records\/\{docId\}\s*\{[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('consent_records match block is found in rules (T1-4)', () => {
		expect(consentBlock).toBeTruthy();
		expect(consentBlock).toContain('match /consent_records/{docId}');
	});

	it('consent_records allow read includes isDirector() branch (T1-4)', () => {
		expect(consentBlock).toMatch(/isDirector\(\)/);
	});

	it('consent_records director branch requires tokenClub() != null (T1-4)', () => {
		expect(consentBlock).toMatch(/isDirector\(\)[\s\S]*?tokenClub\(\)\s*!=\s*null/);
	});

	it('consent_records director branch is scoped to resource.data.clubId == tokenClub() — cross-tenant guard (T1-4)', () => {
		expect(consentBlock).toMatch(
			/isDirector\(\)[\s\S]*?resource\.data\.clubId\s*==\s*tokenClub\(\)/,
		);
	});

	it('consent_records write is still isSuper()-only — no client write expansion (T1-4)', () => {
		expect(consentBlock).toMatch(/allow write:\s*if\s*isSuper\(\)/);
		expect(consentBlock).not.toMatch(/allow write:[\s\S]*?isDirector\(\)/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T1-5 — audit_logs: parent household-scoped read access
//
// Source-scan only. These assertions verify:
//   (a) The audit_logs rule allows a parent to read entries where targetEmail
//       belongs to their linked child (via parentHouseholdAllowsChildEmail).
//   (b) Parent access is scoped to targetEmail — cross-household entries denied.
//   (c) Parent write access remains false — no create/update/delete opened.
// ─────────────────────────────────────────────────────────────────────────────
describe('T1-5 — audit_logs parent household-scoped read rule', () => {
	const auditBlock = (() => {
		const blockMatch = RULES.match(
			/match \/audit_logs\/\{docId\}\s*\{[\s\S]*?allow create, update, delete: if false;[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('audit_logs match block is found in rules (T1-5)', () => {
		expect(auditBlock).toBeTruthy();
		expect(auditBlock).toContain('match /audit_logs/{docId}');
	});

	it('(a) audit_logs allow get includes isParent() + parentHouseholdAllowsChildEmail on targetEmail (T1-5)', () => {
		// A parent MUST be able to get a log entry for their linked child.
		expect(auditBlock).toMatch(
			/isParent\(\)\s*&&\s*parentHouseholdAllowsChildEmail\(resource\.data\.get\('targetEmail'/,
		);
	});

	it('(a) audit_logs allow list includes isParent() + parentHouseholdAllowsChildEmail on targetEmail (T1-5)', () => {
		// The list branch must use the same household-scoped helper so the
		// ParentPrivacyDashboard where('targetEmail','==',childEmail) query is allowed.
		const listMatch = auditBlock.match(/allow list:[\s\S]*?;/);
		expect(listMatch).toBeTruthy();
		expect(listMatch![0]).toMatch(
			/isParent\(\)\s*&&\s*parentHouseholdAllowsChildEmail\(resource\.data\.get\('targetEmail'/,
		);
	});

	it('(b) parent branch uses targetEmail field — cross-household entries are NOT reachable (T1-5)', () => {
		// The rule must reference targetEmail (not a bare isParent() without scoping).
		// This ensures documents belonging to other households are denied.
		expect(auditBlock).not.toMatch(/\|\|\s*isParent\(\)\s*[\n\r;]/);
	});

	it('(c) audit_logs write is still unconditionally false — no parent write opened (T1-5)', () => {
		expect(auditBlock).toContain('allow create, update, delete: if false;');
		// No isParent() should appear in the write branch.
		expect(auditBlock).not.toMatch(
			/allow create[\s\S]*?isParent\(\)/,
		);
	});
});

describe('T1-3 — drill_recommendations coach→director inbox rule', () => {
	const recBlock = (() => {
		const blockMatch = RULES.match(
			/match \/drill_recommendations\/\{recId\}\s*\{[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('drill_recommendations match block exists (T1-3)', () => {
		expect(recBlock).toBeTruthy();
		expect(recBlock).toContain('match /drill_recommendations/{recId}');
	});

	it('coach (or director) can create within their own club (T1-3)', () => {
		const createMatch = recBlock.match(/allow create:[\s\S]*?;/);
		expect(createMatch).toBeTruthy();
		expect(createMatch![0]).toMatch(/isCoach\(\)/);
		expect(createMatch![0]).toMatch(/request\.resource\.data\.clubId == tokenClub\(\)/);
	});

	it('read is tenant-scoped to clubId == tokenClub() (no cross-club leak) (T1-3)', () => {
		const readMatch = recBlock.match(/allow read:[\s\S]*?;/);
		expect(readMatch).toBeTruthy();
		expect(readMatch![0]).toMatch(/resource\.data\.clubId == tokenClub\(\)/);
	});

	it('only director/super may triage (update/delete) (T1-3)', () => {
		const writeMatch = recBlock.match(/allow update, delete:[\s\S]*?;/);
		expect(writeMatch).toBeTruthy();
		expect(writeMatch![0]).toMatch(/isDirector\(\)/);
		expect(writeMatch![0]).not.toMatch(/isCoach\(\)/);
	});
});

describe('B2 — drill_completions player-own list rule (cadence reader)', () => {
	const dcBlock = (() => {
		const blockMatch = RULES.match(
			/match \/drill_completions\/\{recordId\}\s*\{[\s\S]*?allow update, delete: if false;[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('drill_completions match block is found (B2)', () => {
		expect(dcBlock).toBeTruthy();
		expect(dcBlock).toContain('match /drill_completions/{recordId}');
	});

	it('allow list lets a player list their OWN completions (playerUid == auth.uid) (B2)', () => {
		// Cadence progress + MemoryCapsule query with where('playerUid','==',uid);
		// the list rule must permit that or the reads are silently denied.
		const listMatch = dcBlock.match(/allow list:[\s\S]*?;/);
		expect(listMatch).toBeTruthy();
		expect(listMatch![0]).toMatch(
			/request\.auth\.uid == resource\.data\.playerUid/,
		);
	});

	it('player list branch is ownership-scoped, not a blanket isPlayer() (B2)', () => {
		const listMatch = dcBlock.match(/allow list:[\s\S]*?;/);
		expect(listMatch![0]).not.toMatch(/\|\|\s*isPlayer\(\)\s*[\n\r)]/);
	});

	it('create still requires playerUid == auth.uid + userKey == emailKey (regression)', () => {
		const createMatch = dcBlock.match(/allow create:[\s\S]*?;/);
		expect(createMatch).toBeTruthy();
		expect(createMatch![0]).toMatch(/request\.resource\.data\.playerUid == request\.auth\.uid/);
		expect(createMatch![0]).toMatch(/request\.resource\.data\.userKey == emailKey\(\)/);
	});

	it('update/delete remain disabled — audit records are write-once (regression)', () => {
		expect(dcBlock).toContain('allow update, delete: if false;');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T0-5 — setup page source-scan: coach path calls claimCoachInvite
// ─────────────────────────────────────────────────────────────────────────────
const SETUP_PAGE = readFileSync(resolve('src/routes/setup/+page.svelte'), 'utf8');

describe('T0-5 — setup page: coach path uses claimCoachInvite, not direct setDoc', () => {
	it('setup page declares claimCoachInvite callable (T0-5)', () => {
		expect(SETUP_PAGE).toContain("httpsCallable(functions, 'claimCoachInvite')");
	});

	it("setup page does NOT contain role: 'coach' in any setDoc argument (T0-5)", () => {
		// Regression guard: the old path did setDoc({role: 'coach', ...}).
		// After T0-5 the literal object property `role: 'coach'` (with space) must not appear.
		expect(SETUP_PAGE).not.toContain("role: 'coach'");
	});

	it('setup page calls claimCoachInviteCallable in the coach branch (T0-5)', () => {
		expect(SETUP_PAGE).toContain('claimCoachInviteCallable({})');
	});
});

describe('SETUP-UNBLOCK — setup wizard uses callables not client clubs query', () => {
	it('setup page declares listJoinableClubs and resolveDispatchCode callables', () => {
		expect(SETUP_PAGE).toContain("'listJoinableClubs'");
		expect(SETUP_PAGE).toContain("'resolveDispatchCode'");
	});

	it('setup page does not load teamsStore with setup scope', () => {
		expect(SETUP_PAGE).not.toContain('teamsStore');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T1-10 — player_stats: director read path stays within the 10-get() budget
//
// Source-scan only. These assertions verify:
//   (a) The director branch in the player_stats read rule uses tokenClubMatchesDoc()
//       (a zero-get token + denormalized-field check) instead of directorScopedToTeam()
//       (which transitively calls teamClubId() — 1 get per document evaluation).
//   (b) directorScopedToTeam() is NOT present in the player_stats match block.
//   (c) Cross-tenant reads are still denied: tokenClubMatchesDoc checks
//       docClubId(data) == tokenClub(), which resolves the denormalized clubId/tenantId
//       on the player_stats doc against the caller's JWT claim.
//   (d) The tokenClubMatchesDoc helper itself is zero-get (no get()/exists() inside it).
//   (e) The player_stats read rule's inline get() calls ≤ 10 (Firestore per-evaluation budget).
// ─────────────────────────────────────────────────────────────────────────────
describe('T1-10 — player_stats director read uses token claims, get() budget ≤ 10', () => {
	const playerStatsBlock = (() => {
		const blockMatch = RULES.match(
			/match \/player_stats\/\{playerKey\}\s*\{[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('player_stats match block is found in rules (T1-10)', () => {
		expect(playerStatsBlock).toBeTruthy();
		expect(playerStatsBlock).toContain('match /player_stats/{playerKey}');
	});

	it('(a) director branch uses isDirector() + tokenClubMatchesDoc(resource.data) — zero-get path (T1-10)', () => {
		expect(playerStatsBlock).toMatch(
			/isDirector\(\)\s*&&\s*tokenClubMatchesDoc\(resource\.data\)/,
		);
	});

	it('(b) player_stats block does NOT call directorScopedToTeam (which costs 1 get via teamClubId) (T1-10)', () => {
		expect(playerStatsBlock).not.toMatch(/directorScopedToTeam\(/);
	});

	it('(c) cross-tenant guard: tokenClubMatchesDoc helper checks docClubId == tokenClub() (T1-10)', () => {
		// Verify the helper still enforces the tenant boundary.
		expect(RULES).toMatch(
			/function tokenClubMatchesDoc[\s\S]*?docClubId\(data\)\s*!=\s*''[\s\S]*?docClubId\(data\)\s*==\s*tokenClub\(\)/,
		);
	});

	it('(d) tokenClubMatchesDoc helper contains no get() or exists() calls — zero-get guarantee (T1-10)', () => {
		const helperMatch = RULES.match(
			/function tokenClubMatchesDoc\([^)]*\)\s*\{[\s\S]*?\n\s*\}/,
		);
		expect(helperMatch).toBeTruthy();
		const helperBody = helperMatch![0];
		expect(helperBody).not.toMatch(/\bget\s*\(/);
		expect(helperBody).not.toMatch(/\bexists\s*\(/);
	});

	it('(e) player_stats read rule inline get()/exists() calls ≤ 10 (Firestore budget) (T1-10)', () => {
		// Source-scan counts get() and exists() inside the allow read: block text only.
		// Helper function calls (userDoc, parentCanSeePlayerName) are not inlined — each
		// costs at most 1 get in its own evaluation, keeping the total well under 10.
		const readMatch = playerStatsBlock.match(/allow read:[\s\S]*?;/);
		expect(readMatch).toBeTruthy();
		const readBlock = readMatch![0];
		const inlineGetCount = (readBlock.match(/\bget\s*\(/g) ?? []).length;
		const inlineExistsCount = (readBlock.match(/\bexists\s*\(/g) ?? []).length;
		expect(inlineGetCount + inlineExistsCount).toBeLessThanOrEqual(10);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// B4a — completion_verifications rules
//
// Source-scan only (no emulator). These assertions verify:
//   (a) The collection match block exists.
//   (b) All writes (create/update/delete) are denied to clients (CF-only path).
//   (c) Player reads own records via playerUid match.
//   (d) Parent reads via parentHouseholdAllowsChildEmail(userKey) — household scope.
//   (e) Coach/director reads via clubId tenant scope.
// ─────────────────────────────────────────────────────────────────────────────
describe('B4a — completion_verifications rules', () => {
	const cvBlock = (() => {
		const blockMatch = RULES.match(
			/match \/completion_verifications\/\{vId\}\s*\{[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('completion_verifications match block is found in rules', () => {
		expect(cvBlock).toBeTruthy();
		expect(cvBlock).toContain('match /completion_verifications/{vId}');
	});

	it('client writes (create, update, delete) are permanently denied', () => {
		expect(cvBlock).toMatch(/allow create, update, delete:\s*if false/);
	});

	it('player can read their own records (playerUid match)', () => {
		expect(cvBlock).toMatch(/request\.auth\.uid\s*==\s*resource\.data\.playerUid/);
	});

	it('parent read is scoped via parentHouseholdAllowsChildEmail(userKey)', () => {
		expect(cvBlock).toMatch(/parentHouseholdAllowsChildEmail\(resource\.data\.userKey\)/);
	});

	it('parent list query where(householdId) aligns with parentOwnsHouseholdId', () => {
		expect(cvBlock).toMatch(
			/isParent\(\)\s*&&\s*parentOwnsHouseholdId\(resource\.data\.householdId\)/,
		);
	});

	it('coach/director read is scoped to resource.data.clubId == tokenClub()', () => {
		expect(cvBlock).toMatch(
			/\(isCoach\(\) \|\| isDirector\(\)\)[\s\S]*?resource\.data\.clubId\s*==\s*tokenClub\(\)/,
		);
	});

	it('isSuper() branch is present', () => {
		expect(cvBlock).toMatch(/isSuper\(\)/);
	});

	it('allow get, list uses authed() guard', () => {
		expect(cvBlock).toMatch(/allow get, list:\s*if\s*authed\(\)/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// B4b — completion_verifications: client update stays denied; parent read works
//
// Source-scan only. These assertions verify:
//   (a) Client update (and create/delete) remain denied — parent review is CF-only.
//   (b) Parent household-scoped read (list) is still allowed via
//       parentHouseholdAllowsChildEmail(resource.data.userKey) — required for
//       ProofReviewQueue Firestore subscription.
//   (c) The rules have NOT been relaxed to allow client writes.
// ─────────────────────────────────────────────────────────────────────────────
describe('B4b — completion_verifications: write stays CF-only; parent list enabled', () => {
	const cvB4bBlock = (() => {
		const blockMatch = RULES.match(
			/match \/completion_verifications\/\{vId\}\s*\{[\s\S]*?\n\s*\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('(a) client create/update/delete still denied — parentReviewCompletionProof uses CF/Admin SDK', () => {
		expect(cvB4bBlock).toMatch(/allow create, update, delete:\s*if false/);
	});

	it('(a) no isParent() branch opens client write access (regression guard)', () => {
		const writeMatch = cvB4bBlock.match(/allow create[\s\S]*?if[\s\S]*?;/);
		if (writeMatch) {
			expect(writeMatch[0]).not.toMatch(/isParent\(\)/);
		}
	});

	it('(b) parent list access uses parentHouseholdAllowsChildEmail(resource.data.userKey)', () => {
		expect(cvB4bBlock).toMatch(/parentHouseholdAllowsChildEmail\(resource\.data\.userKey\)/);
	});

	it('(b) parent list query uses parentOwnsHouseholdId(resource.data.householdId)', () => {
		expect(cvB4bBlock).toMatch(
			/parentOwnsHouseholdId\(resource\.data\.householdId\)/,
		);
	});

	it('(b) player own-record read remains accessible (playerUid match)', () => {
		expect(cvB4bBlock).toMatch(/request\.auth\.uid\s*==\s*resource\.data\.playerUid/);
	});

	it('(c) Storage and legacy assignments untouched — completion_verifications rule block has no mediaStoragePath write', () => {
		// The rules block must never open a client write for mediaStoragePath (B4c territory).
		expect(cvB4bBlock).not.toMatch(/allow create[\s\S]*?mediaStoragePath/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// PARENT-JWT-PROOF — parentResolvedHouseholdId (Firestore-first household parity)
// ─────────────────────────────────────────────────────────────────────────────
describe('PARENT-JWT-PROOF — parentResolvedHouseholdId rules parity', () => {
	const parentHouseholdFn = (() => {
		const blockMatch = RULES.match(
			/function parentHouseholdAllowsChildEmail\(childKey\)\s*\{[\s\S]*?\n {4}\}/,
		);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('parentResolvedHouseholdId helper exists in firestore.rules', () => {
		expect(RULES).toMatch(/function parentResolvedHouseholdId\(\)/);
	});

	it('parentHouseholdAllowsChildEmail uses parentResolvedHouseholdId (not raw tokenHousehold)', () => {
		expect(parentHouseholdFn).toBeTruthy();
		expect(parentHouseholdFn).toMatch(/parentResolvedHouseholdId\(\)/);
		expect(parentHouseholdFn).not.toMatch(/tokenHousehold\(\)/);
	});

	it('parentResolvedHouseholdId prefers users/{email}.householdId over JWT fallback', () => {
		expect(RULES).toMatch(
			/function parentResolvedHouseholdId\(\)[\s\S]*?userDoc\(\)\.householdId[\s\S]*?tokenHousehold\(\)/,
		);
	});

	it('parentHouseholdChildOnTeam checks household children (not parent userDoc.teamId)', () => {
		expect(RULES).toMatch(/function parentHouseholdChildOnTeam\(teamId\)/);
		const fnBlock = RULES.match(
			/function canReadScheduleOrWorkoutDoc\(\)\s*\{[\s\S]*?\n {4}\}/,
		)?.[0];
		expect(fnBlock).toBeTruthy();
		expect(fnBlock).toMatch(/parentHouseholdChildOnTeam\(resource\.data\.teamId\)/);
		expect(fnBlock).not.toMatch(/userDoc\(\)\.teamId == resource\.data\.teamId/);
	});

	it('bounties parent read uses parentOwnsHouseholdId (Firestore-first household)', () => {
		const bountyBlock = RULES.match(/match \/bounties\/\{bountyId\}\s*\{[\s\S]*?\n {4}\}/)?.[0];
		expect(bountyBlock).toBeTruthy();
		expect(bountyBlock).toMatch(/parentOwnsHouseholdId\(resource\.data\.householdId\)/);
		expect(bountyBlock).not.toMatch(/resource\.data\.householdId == tokenHousehold\(\)/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier-2 Item 2 — trials identity backlink (uid + email stable read branches)
//
// Source-scan only. Verifies:
//   (a) The trials read rule adds a uid-keyed branch (playerId == request.auth.uid).
//   (b) The trials read rule adds an email-keyed branch (playerEmail == emailKey()).
//   (c) The legacy name-string branch (player == userDoc().playerName) is retained.
//   (d) The write rules are unchanged — no uid/email create/update bypass added.
// ─────────────────────────────────────────────────────────────────────────────
describe('Tier-2 Item 2 — trials collection identity backlink read rule', () => {
	const trialsBlock = (() => {
		const blockMatch = RULES.match(/match \/trials\/\{docId\}\s*\{[\s\S]*?\n\s*\}/);
		return blockMatch ? blockMatch[0] : '';
	})();

	it('trials match block is found in rules', () => {
		expect(trialsBlock).toBeTruthy();
	});

	it('(a) trials read allows playerId == request.auth.uid (stable uid branch)', () => {
		expect(trialsBlock).toMatch(/resource\.data\.playerId\s*==\s*request\.auth\.uid/);
	});

	it('(b) trials read allows playerEmail == emailKey() (stable email branch)', () => {
		expect(trialsBlock).toMatch(/resource\.data\.playerEmail\s*==\s*emailKey\(\)/);
	});

	it('(c) legacy name-string branch is retained (backward compat)', () => {
		expect(trialsBlock).toMatch(/resource\.data\.player\s*==\s*userDoc\(\)\.playerName/);
	});

	it('(d) write rules do NOT include a playerId or playerEmail create/update bypass', () => {
		const writeBlock = trialsBlock.match(/allow create, update:[\s\S]*?;/);
		if (writeBlock) {
			expect(writeBlock[0]).not.toMatch(/playerId/);
			expect(writeBlock[0]).not.toMatch(/playerEmail/);
		}
	});
});
