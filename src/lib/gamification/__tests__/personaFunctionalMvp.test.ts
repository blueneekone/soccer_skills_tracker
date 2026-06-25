/**
 * personaFunctionalMvp.test.ts — Sprint LAUNCH-functional-os (doc + gate guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergeAdminRoster } from '../../admin/rosterMerge.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const FUNCTIONAL_MVP = join(ROOT, '..', 'docs/vision/FUNCTIONAL_MVP.md');
const WORKSPACE_NAV = join(ROOT, 'lib/shell/workspaceNav.js');
const RESEARCH_README = join(ROOT, '..', 'docs/vision/references/ui/research/README.md');
const LAUNCH_FOCUS_RULE = join(ROOT, '..', '.cursor/rules/launch-focus.mdc');

describe('Sprint LAUNCH-functional-os — FUNCTIONAL_MVP.md', () => {
	it('FUNCTIONAL_MVP.md exists with persona acceptance sections', () => {
		expect(existsSync(FUNCTIONAL_MVP)).toBe(true);
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/## Player OS/);
		expect(doc).toMatch(/## Parent OS/);
		expect(doc).toMatch(/## Coach OS/);
		expect(doc).toMatch(/## Cross-persona/);
		expect(doc).toMatch(/## Gaps/);
		expect(doc).toMatch(/Login → HQ loads missions, identity, telemetry/);
		expect(doc).toMatch(/Logistics compose \+ send to parents/);
	});

	it('FUNCTIONAL_MVP.md documents audit gaps with sprint hints', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/\/coach\/logistics/);
		expect(doc).toMatch(/Epic 4\.1/);
		expect(doc).toMatch(/Epic 4\.2/);
		expect(doc).toMatch(/Epic 4\.4/);
	});
});

describe('Sprint LAUNCH-functional-os — ROADMAP', () => {
	const roadmap = readFileSync(ROADMAP, 'utf-8');

	it('ROADMAP marks LAUNCH-functional-os done (all functional gaps closed)', () => {
		expect(roadmap).toMatch(/Current sprint:\*\*\s*\*\*LAUNCH-functional-os Done\*\*/);
		expect(roadmap).toMatch(/\|\s*\*\*LAUNCH-functional-os\*\*\s*\|\s*\*\*Done\*\*/i);
	});

	it('ROADMAP next build order includes Epic 5 after Epic 4 comms complete', () => {
		expect(roadmap).toMatch(/Epic 4\.1–4\.16b/);
		expect(roadmap).toMatch(/Epic 4\/5\/2\.2 done/i);
	});

	it('ROADMAP defers owner QA until all epics complete', () => {
		expect(roadmap).toMatch(/no owner QA until all epics complete/i);
	});

	it('ROADMAP documents personaFunctionalMvp test proof', () => {
		expect(roadmap).toMatch(/personaFunctionalMvp\.test\.ts/);
	});

	it('ROADMAP tables Platform visual system (Gemini research)', () => {
		expect(roadmap).toMatch(/TABLED.*Platform visual system.*Gemini research/is);
		expect(roadmap).toMatch(/Flow asset generation/);
		expect(roadmap).toMatch(/3\.6b\+/);
	});
});

describe('Sprint LAUNCH-functional-os — research README', () => {
	it('research/README tables visual system as post-launch', () => {
		expect(existsSync(RESEARCH_README)).toBe(true);
		const readme = readFileSync(RESEARCH_README, 'utf-8');
		expect(readme).toMatch(/TABLED/i);
		expect(readme).toMatch(/post-launch visual system/i);
		expect(readme).toMatch(/Gemini Deep Research/i);
		expect(readme).toMatch(/wire PNG chrome/i);
	});
});

describe('Sprint LAUNCH-nav — workspaceNav discoverability', () => {
	const nav = readFileSync(WORKSPACE_NAV, 'utf-8');

	it('coach sidebar links The Forge to intent deploy surface', () => {
		expect(nav).toMatch(/The Forge/);
		expect(nav).toMatch(/href:\s*'\/coach\/forge'/);
		expect(nav).not.toMatch(/href:\s*'\/coach\/assignments'/);
	});

	it('parent sidebar links Co-op Command to /parent/dashboard', () => {
		expect(nav).toMatch(/Co-op Command/);
		expect(nav).toMatch(/href:\s*'\/parent\/dashboard'/);
	});

	it('athlete household links use HQ / Train labels (not Command Center)', () => {
		expect(nav).toMatch(/label:\s*'HQ'/);
		expect(nav).toMatch(/href:\s*'\/player\/dashboard'/);
		expect(nav).toMatch(/label:\s*'Train'/);
		expect(nav).toMatch(/href:\s*'\/player\/workout'/);
		expect(nav).not.toMatch(/Command Center/);
	});

	it('athlete household Settings links to /player/settings', () => {
		expect(nav).toMatch(/href:\s*'\/player\/settings'/);
	});

	it('athlete household links Tracker to /player/tracker', () => {
		expect(nav).toMatch(/label:\s*'Tracker'/);
		expect(nav).toMatch(/href:\s*'\/player\/tracker'/);
	});
});

describe('Sprint LAUNCH-nav — FUNCTIONAL_MVP settings + gaps', () => {
	it('documents /player/settings vs /settings and resolved nav gaps', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/Settings paths:/);
		expect(doc).toMatch(/\/player\/settings/);
		expect(doc).toMatch(/\/settings/);
		expect(doc).toMatch(/Resolved \(LAUNCH-nav\).*\/coach\/forge/s);
		expect(doc).toMatch(/Resolved \(LAUNCH-nav\).*\/parent\/dashboard/s);
	});

	it('PlayerSettingsPanel danger tab exposes handleSignOut for QA account switching', () => {
		const panel = readFileSync(
			join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/handleSignOut/);
		expect(panel).toMatch(/Sign out/);
		expect(panel).toMatch(/activeTab === 'danger'/);
	});
});

describe('Sprint LAUNCH-functional-os — launch-focus rule', () => {
	it('launch-focus.mdc exists with functional guardrails', () => {
		expect(existsSync(LAUNCH_FOCUS_RULE)).toBe(true);
		const rule = readFileSync(LAUNCH_FOCUS_RULE, 'utf-8');
		expect(rule).toMatch(/functionality over pixels/i);
		expect(rule).toMatch(/references\/ui\/research/);
		expect(rule).toMatch(/MUST NOT/i);
		expect(rule).toMatch(/avatar-builder-deferred/);
		expect(rule).toMatch(/Epic 4/);
	});
});

describe('Sprint LAUNCH-functional-os — Coach→Player bounty handoff', () => {
	const INTENT_ENGINE = join(ROOT, 'lib/coach/intent/IntentEngine.svelte.ts');
	const ACTIVE_BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
	const WORKOUT_PAGE = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
	const FIREBASE = join(ROOT, 'lib/firebase.js');
	const OPERATIVE_OPS = join(ROOT, '..', 'functions/src/domains/operativeOps.js');

	it('IntentEngine deploys intents via us-east1 functions bundle', () => {
		expect(existsSync(INTENT_ENGINE)).toBe(true);
		const src = readFileSync(INTENT_ENGINE, 'utf-8');
		expect(src).toMatch(/from '\$lib\/firebase\.js'/);
		expect(src).toMatch(/httpsCallable[\s\S]*functions[\s\S]*'secureDeployIntent'/);
		expect(src).not.toMatch(/getFunctions\(\)/);
		expect(src).toMatch(/refreshIntents/);
		expect(src).toMatch(/_removeIntentFromList/);
	});

	it('ActiveBounties subscribes to team_assignments and deduplicates missions', () => {
		expect(existsSync(ACTIVE_BOUNTIES)).toBe(true);
		const src = readFileSync(ACTIVE_BOUNTIES, 'utf-8');
		const coachIntents = readFileSync(
			join(ROOT, 'lib/player/dashboard/missionRailCoachIntents.ts'),
			'utf-8',
		);
		const questSubs = readFileSync(
			join(ROOT, 'lib/player/dashboard/missionRailQuestSubscriptions.ts'),
			'utf-8',
		);
		expect(coachIntents).toMatch(/team_assignments/);
		expect(coachIntents).toMatch(/bountyFromCoachIntent/);
		expect(src).toMatch(/attachMissionQuestSubscriptions|runCoachIntentRefetch/);
		expect(questSubs).toMatch(/team_assignments|fetchCoachIntentQuests|mapCoachIntentRows/);
		expect(src).toMatch(/deduplicateById/);
		expect(src).toMatch(/stashQuestTrainHandoff/);
	});

	it('QA-142 ActiveBounties refreshes stale JWT team scope before mission subscribe', () => {
		const authSync = join(ROOT, 'lib/player/dashboard/missionRailAuth.ts');
		const src = readFileSync(ACTIVE_BOUNTIES, 'utf-8');
		const sync = readFileSync(authSync, 'utf-8');
		expect(sync).toMatch(/getIdTokenResult/);
		expect(sync).toMatch(/refreshClaimsIfProfileTeamStale/);
		expect(src).toMatch(/MissionRailClaimsSync/);
		expect(src).toMatch(/MissionSnapshotRetryGate/);
		expect(src).toMatch(/missionClaimsSync\.claimsSyncNonce/);
		expect(src).toMatch(/missionRailEmptyMessageFor|missionRailEmptyMessage/);
		expect(src).toMatch(/missionSyncBlocked/);
	});

	it('QA-142 parentLinkOperativeToTeam stamps custom claims on link', () => {
		expect(existsSync(OPERATIVE_OPS)).toBe(true);
		const ops = readFileSync(OPERATIVE_OPS, 'utf-8');
		expect(ops).toMatch(/stampOperativeTeamClaims/);
		expect(ops).toMatch(/setCustomUserClaims/);
		expect(ops).toMatch(/teamId: teamIdForUser/);
	});

	it('Train page logs sessions and records quest progress after coach handoff', () => {
		expect(existsSync(WORKOUT_PAGE)).toBe(true);
		const src = readFileSync(WORKOUT_PAGE, 'utf-8');
		expect(src).toMatch(/logTrainingSession/);
		expect(src).toMatch(/recordQuestProgressAfterLog/);
		expect(src).toMatch(/from '\$lib\/firebase\.js'/);
		expect(src).toMatch(/isCoachDirectedSession/);
		expect(src).toMatch(/lockedCoachDrillLabel/);
		expect(src).toMatch(/isCoachDirectedHandoff|armedHandoff\.missionId !== activeMissionId/);
		expect(src).toMatch(/FREE_LOG_DURATION_MAX_MINUTES/);
		expect(src).toMatch(/sessionNotes/);
		// G1 source-level guard: targetAttributeId must be forwarded into executePlayerWorkoutLog
		// so the server can write xpByAttribute and trigger intent lifecycle fulfillment.
		expect(src).toMatch(/targetAttributeId/);
		expect(src).toMatch(/playerEngine\.bumpBy/);
		expect(src).toMatch(/authStore\.refresh/);
	});

	it('GP-ACQ-04a ActiveBounties explains coach assign path when rail has no bounties', () => {
		const src = readFileSync(ACTIVE_BOUNTIES, 'utf-8');
		expect(src).toMatch(/missionRailEmptyMessageFor|missionRailEmptyMessage/);
		expect(src).toMatch(/showCoachAssignHint/);
		expect(src).not.toMatch(/NO ACTIVE MISSIONS/);
	});

	it('IntentEngine loads team drill library for coach sub-drill picker', () => {
		expect(existsSync(INTENT_ENGINE)).toBe(true);
		const src = readFileSync(INTENT_ENGINE, 'utf-8');
		expect(src).toMatch(/teamDrillLibrary/);
		expect(src).toMatch(/loadTeamDrillsForIntent/);
		expect(src).toMatch(/draftDrillTitle/);
		expect(src).toMatch(/drillTitle/);
		expect(src).not.toMatch(/global_drills/);
	});

	it('platformDrillLibrary supports copy-to-team from multi-sport basics', () => {
		const lib = join(ROOT, 'lib/coach/platformDrillLibrary.ts');
		expect(existsSync(lib)).toBe(true);
		const src = readFileSync(lib, 'utf-8');
		expect(src).toMatch(/loadPlatformBasics/);
		expect(src).toMatch(/copyPlatformDrillToTeam/);
		expect(src).toMatch(/buildDirectorDrillRecommendation/);
		expect(src).toMatch(/sportId/);
	});

	it('coach drills page copies platform basics to team library', () => {
		const drillsPage = join(ROOT, 'routes/(app)/coach/drills/+page.svelte');
		const drillsView = join(ROOT, 'lib/coach/drills/CoachDrillsView.svelte');
		expect(existsSync(drillsPage)).toBe(true);
		expect(existsSync(drillsView)).toBe(true);
		const routeSrc = readFileSync(drillsPage, 'utf-8');
		expect(routeSrc).toMatch(/\$lib\/coach\/drills/);
		const src = readFileSync(drillsView, 'utf-8');
		expect(src).toMatch(/copyPlatformDrillToTeam/);
		expect(src).toMatch(/Platform basics/);
		expect(src).toMatch(/recommendToDirector/);
		expect(src).toMatch(/CoachTeamScope/);
	});

	it('firebase.js pins Cloud Functions to us-east1', () => {
		expect(existsSync(FIREBASE)).toBe(true);
		const src = readFileSync(FIREBASE, 'utf-8');
		expect(src).toMatch(/getFunctions\(app,\s*'us-east1'\)/);
	});

	it('parentProvisionOperative persists Firebase uid on users doc for roster targeting', () => {
		expect(existsSync(OPERATIVE_OPS)).toBe(true);
		const src = readFileSync(OPERATIVE_OPS, 'utf-8');
		expect(src).toMatch(/uid:\s*childUid/);
	});

	it('LAUNCH_CORE_CALLABLE_OPTS sets public invoker for browser CORS preflight', () => {
		const trainingOps = readFileSync(
			join(ROOT, '..', 'functions/src/domains/trainingOps.js'),
			'utf-8',
		);
		expect(trainingOps).toMatch(/invoker:\s*'public'/);
	});
});

describe('Sprint LAUNCH-epic53 — Director deployment calendar', () => {
	const CAL = join(ROOT, 'lib/components/director/os/DeploymentCalendar.svelte');
	const FIELD_OPS = join(ROOT, 'lib/components/director/os/FieldOpsModule.svelte');
	const EPIC53_TEST = join(
		ROOT,
		'lib/components/director/os/__tests__/epic53DeploymentCalendar.test.ts',
	);

	it('ROADMAP documents LAUNCH-epic53 Done', () => {
		const roadmap = readFileSync(ROADMAP, 'utf-8');
		expect(roadmap).toMatch(/\*\*LAUNCH-epic53\*\*\s*\|\s*\*\*Done\*\*/);
	});

	it('Field Ops wires DeploymentCalendar with create + announce toggle', () => {
		expect(existsSync(CAL)).toBe(true);
		expect(existsSync(FIELD_OPS)).toBe(true);
		const cal = readFileSync(CAL, 'utf-8');
		expect(cal).toMatch(/announceToTeams/);
		expect(cal).toMatch(/staff_only/);
		const fieldOps = readFileSync(FIELD_OPS, 'utf-8');
		expect(fieldOps).toMatch(/DeploymentCalendar/);
	});

	it('epic53DeploymentCalendar regression guards exist', () => {
		expect(existsSync(EPIC53_TEST)).toBe(true);
	});
});

describe('T0-10 — Parent dashboard resolves children from households doc', () => {
	const DASHBOARD = join(ROOT, 'routes/(app)/parent/dashboard/+page.svelte');

	it('dashboard fetches childEmails via getDoc on households collection', () => {
		expect(existsSync(DASHBOARD)).toBe(true);
		const src = readFileSync(DASHBOARD, 'utf-8');
		// Must use Firestore getDoc against the households collection
		expect(src).toMatch(/getDoc\s*\(/);
		expect(src).toMatch(/households/);
		// Must NOT derive childEmails from profile.playerEmails (never populated by provision)
		expect(src).not.toMatch(/profile\?\.playerEmails/);
		expect(src).not.toMatch(/profile\.playerEmails/);
	});

	it('dashboard passes resolved childEmails into engine.init and carRideEngine.init', () => {
		const src = readFileSync(DASHBOARD, 'utf-8');
		expect(src).toMatch(/engine\.init\s*\(\s*parentEmail\s*,\s*householdId\s*,\s*childEmails/);
		expect(src).toMatch(/carRideEngine\.init\s*\(\s*linkedPlayerEmail/);
		expect(src).toMatch(/resolvedChildren\[0\]/);
	});
});

// ── Tier-2 Item 1 — name-only roster visibility ──────────────────────────────

describe('Tier-2 Item 1 — admin roster reads both player_lookup and rosters collection', () => {
	const ADMIN_ROSTER = join(
		ROOT,
		'routes/(app)/admin/organizations/[clubId]/teams/[teamId]/roster/+page.svelte',
	);

	it('admin roster page file exists', () => {
		expect(existsSync(ADMIN_ROSTER)).toBe(true);
	});

	it('admin roster page reads the rosters collection (name array source)', () => {
		const src = readFileSync(ADMIN_ROSTER, 'utf-8');
		// Must reference rosters/{teamId} doc to load name-only players
		expect(src).toMatch(/['"`]rosters['"`]/);
	});

	it('admin roster page still reads player_lookup (no regression)', () => {
		const src = readFileSync(ADMIN_ROSTER, 'utf-8');
		expect(src).toMatch(/player_lookup/);
	});

	it('admin roster page imports and calls mergeAdminRoster', () => {
		const src = readFileSync(ADMIN_ROSTER, 'utf-8');
		expect(src).toMatch(/mergeAdminRoster/);
		expect(src).toMatch(/rosterMerge/);
	});

	it('admin roster page marks name-only rows with a "No account" indicator', () => {
		const src = readFileSync(ADMIN_ROSTER, 'utf-8');
		expect(src).toMatch(/nameOnly/);
		expect(src).toMatch(/No account/i);
	});
});

describe('Tier-2 Item 1 — mergeAdminRoster unit tests', () => {

	it('name-only player appears when not in linkedRows', () => {
		const result = mergeAdminRoster([], ['Alice'], 'team1');
		expect(result).toHaveLength(1);
		expect(result[0].playerName).toBe('Alice');
		expect(result[0].nameOnly).toBe(true);
		expect(result[0].email).toBe('');
		expect(result[0].key).toBe('nameonly:Alice');
	});

	it('email-linked player appears with nameOnly=false', () => {
		const linked = [{ email: 'bob@x.com', playerName: 'Bob', ageGroup: 'U14', teamId: 'team1' }];
		const result = mergeAdminRoster(linked, [], 'team1');
		expect(result).toHaveLength(1);
		expect(result[0].nameOnly).toBe(false);
		expect(result[0].email).toBe('bob@x.com');
	});

	it('name in both sources deduplicates — email-linked wins (name-only is dropped)', () => {
		const linked = [{ email: 'carol@x.com', playerName: 'Carol', ageGroup: null, teamId: 't1' }];
		const result = mergeAdminRoster(linked, ['Carol'], 't1');
		expect(result).toHaveLength(1);
		expect(result[0].nameOnly).toBe(false);
		expect(result[0].email).toBe('carol@x.com');
	});

	it('deduplication is case-insensitive', () => {
		const linked = [{ email: 'dave@x.com', playerName: 'dave', ageGroup: null, teamId: 't1' }];
		const result = mergeAdminRoster(linked, ['Dave', 'DAVE'], 't1');
		// All three represent the same player; only email-linked survives
		expect(result).toHaveLength(1);
		expect(result[0].email).toBe('dave@x.com');
	});

	it('mixed list: email-linked + name-only combined, no duplicates, sorted by name', () => {
		const linked = [
			{ email: 'z@x.com', playerName: 'Zara', ageGroup: null, teamId: 't1' },
			{ email: 'a@x.com', playerName: 'Alice', ageGroup: 'U12', teamId: 't1' },
		];
		const names = ['Alice', 'Bob', 'Charlie'];
		const result = mergeAdminRoster(linked, names, 't1');
		expect(result).toHaveLength(4); // Alice (linked), Bob (name-only), Charlie (name-only), Zara (linked)
		expect(result.map((r) => r.playerName)).toEqual(['Alice', 'Bob', 'Charlie', 'Zara']);
		expect(result[0].nameOnly).toBe(false);
		expect(result[1].nameOnly).toBe(true);
		expect(result[2].nameOnly).toBe(true);
		expect(result[3].nameOnly).toBe(false);
	});

	it('empty inputs produce empty result', () => {
		expect(mergeAdminRoster([], [], 'team1')).toHaveLength(0);
	});
});

describe('Functional audit — E5 streak freeze mount', () => {
	it('player HQ mounts PlayerActivityStreak with ArmoryEngine', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/player/dashboard/+page.svelte'), 'utf-8');
		expect(src).toMatch(/PlayerActivityStreak/);
		expect(src).toMatch(/armory\.loadPlayerData/);
	});
});

describe('Functional audit backlog A–F — regression guards', () => {
	const BACKLOG = join(ROOT, '..', 'docs/FUNCTIONAL_AUDIT_BACKLOG.md');

	it('backlog marks A–F complete except F4 deferred', () => {
		const doc = readFileSync(BACKLOG, 'utf-8');
		expect(doc).toMatch(/A1–A7.*Done/);
		expect(doc).toMatch(/D9.*Done/);
		expect(doc).toMatch(/F4.*Done/);
		expect(doc).not.toMatch(/F4.*Deferred/);
	});

	it('A1 commerce uses us-east1 for createRegistrationIntent', () => {
		const src = readFileSync(join(ROOT, 'lib/services/commerce.svelte.ts'), 'utf-8');
		expect(src).toMatch(/getFunctions\(undefined,\s*'us-east1'\)/);
	});

	it('A3 CoOpEngine reads root totalXp', () => {
		const src = readFileSync(join(ROOT, 'lib/states/CoOpEngine.svelte.ts'), 'utf-8');
		expect(src).toMatch(/totalXp/);
	});

	it('A4 AdaptiveHomework keys users by email', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/player/dashboard/AdaptiveHomework.svelte'), 'utf-8');
		expect(src).toMatch(/doc\(db,\s*'users',\s*email\)/);
	});

	it('B1 War Room has no placeholder player tokens', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/coach/tactical/+page.svelte'), 'utf-8');
		expect(src).not.toMatch(/PLAYER 01|SLOT 01/);
		expect(src).toMatch(/wrBucketXi = \[\]/);
	});

	it('C1 parent bounty claim gates on verified status', () => {
		const src = readFileSync(join(ROOT, 'lib/player/dashboard/activeBounties.ts'), 'utf-8');
		expect(src).toMatch(/status === 'verified'/);
	});

	it('C2 War Room deployPlay persists tactics', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/coach/tactical/+page.svelte'), 'utf-8');
		expect(src).toMatch(/async function deployPlay/);
		expect(src).toMatch(/setDoc\(docRef/);
	});

	it('C4 War Room has explicit exit control', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/coach/tactical/+page.svelte'), 'utf-8');
		expect(src).toMatch(/Exit War Room/);
		expect(src).toMatch(/goto\('\/coach'\)/);
	});

	it('D1 SeasonRegistration rejects pay without Stripe', () => {
		const src = readFileSync(join(ROOT, 'lib/components/parent/SeasonRegistration.svelte'), 'utf-8');
		expect(src).toMatch(/Secure payment is unavailable/);
		expect(src).toMatch(/never fabricate a "paid" state/);
		expect(src).not.toMatch(/demo mode/i);
	});

	it('D9 team-scope Forge deploy requires assignable roster (not name-only void)', () => {
		const engine = readFileSync(join(ROOT, 'lib/coach/intent/IntentEngine.svelte.ts'), 'utf-8');
		const hud = readFileSync(join(ROOT, 'lib/coach/intent/ForgeDeployPanel.svelte'), 'utf-8');
		expect(engine).toMatch(/draftScope === 'team'\s*\?\s*\n?\s*this\.assignableRosterCount > 0/);
		expect(hud).toMatch(/draftScope === 'team'/);
		expect(hud).toMatch(/assignableRosterCount === 0 && roster\.length > 0/);
		expect(hud).toMatch(/excluded from deploy until player accounts are linked/);
	});

	it('F2 coach nav includes Field Station; War Room excluded per PRODUCT_SURFACE_REGISTRY', () => {
		const nav = readFileSync(WORKSPACE_NAV, 'utf-8');
		expect(nav).toMatch(/href:\s*'\/coach\/drills'/);
		expect(nav).not.toMatch(/href:\s*'\/coach\/tactical'/);
	});

	it('F5 parent log-workout loads drills from Firestore', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/parent/log-workout/+page.svelte'), 'utf-8');
		expect(src).toMatch(/loadDrillTitlesForFocus/);
	});

	it('F4 skill-tree launches Train from unlocked nodes', () => {
		const hud = readFileSync(join(ROOT, 'lib/components/player/skill-tree/SkillTreeHUD.svelte'), 'utf-8');
		const arena = readFileSync(join(ROOT, 'lib/components/player/skill-tree/SkillTreeArena.svelte'), 'utf-8');
		const prefill = readFileSync(join(ROOT, 'lib/player/workout/workoutDrillPrefill.ts'), 'utf-8');
		expect(hud).toMatch(/Launch training/);
		expect(hud).toMatch(/\/player\/workout/);
		expect(arena).toMatch(/launchNodeTraining/);
		expect(prefill).toMatch(/skillNode/);
	});

	it('match-day scoreboard persists to match_sessions', () => {
		const src = readFileSync(join(ROOT, 'lib/coach/match-day/CoachMatchDayView.svelte'), 'utf-8');
		const rules = readFileSync(join(ROOT, '..', 'firestore.rules'), 'utf-8');
		expect(src).toMatch(/match_sessions/);
		expect(src).toMatch(/persistMatchSession/);
		expect(rules).toMatch(/match \/match_sessions\/\{sessionId\}/);
	});
});

describe('Functional audit — player workout surfaces (E1/E2/E3/E4)', () => {
	it('proving-grounds route mounts ProvingGrounds with ArmoryEngine', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/player/proving-grounds/+page.svelte'), 'utf-8');
		expect(src).toMatch(/ProvingGrounds/);
		expect(src).toMatch(/armory\.loadPlayerData/);
	});

	it('media route mounts ClipAnalyzer and MediaVault', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/player/media/+page.svelte'), 'utf-8');
		expect(src).toMatch(/ClipAnalyzer/);
		expect(src).toMatch(/MediaVault/);
	});

	it('tracker mounts IntrinsicSanctuary session reflection', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/player/tracker/+page.svelte'), 'utf-8');
		expect(src).toMatch(/IntrinsicSanctuary/);
	});
});

describe('Functional audit — E-series coach/director mounts', () => {
	it('ClipAnalyzer has no client mock analysis responses', () => {
		const src = readFileSync(join(ROOT, 'lib/components/player/ClipAnalyzer.svelte'), 'utf-8');
		expect(src).not.toMatch(/MOCK_RESPONSES/);
		expect(src).toMatch(/waitForClipProcessing/);
	});

	it('MessagesTab mounts NewMessageModal for channel creation', () => {
		const src = readFileSync(join(ROOT, 'lib/components/coach/MessagesTab.svelte'), 'utf-8');
		expect(src).toMatch(/NewMessageModal/);
	});

	it('Field Station schedule mounts FacilityScheduler', () => {
		const src = readFileSync(join(ROOT, 'lib/coach/drills/CoachDrillsView.svelte'), 'utf-8');
		expect(src).toMatch(/FacilityScheduler/);
	});

	it('coach tactics-board route mounts TacticalCommandBoard', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/coach/tactics-board/+page.svelte'), 'utf-8');
		expect(src).toMatch(/CoachTacticsBoardView|TacticalCommandBoard/);
	});

	it('parent household and director registrars mount TransferPortal', () => {
		const household = readFileSync(join(ROOT, 'routes/(app)/parent/household/+page.svelte'), 'utf-8');
		const director = readFileSync(join(ROOT, 'routes/(app)/director/+page.svelte'), 'utf-8');
		expect(household).toMatch(/TransferPortal/);
		expect(director).toMatch(/TransferPortal/);
	});

	it('player workout uses transmit-only coach session (no DrillExecution panel)', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/player/workout/+page.svelte'), 'utf-8');
		expect(src).not.toMatch(/CoachMissionDrillExecutionPanel/);
		expect(src).toMatch(/EXEC_COMMIT|logWorkout/);
		expect(src).toMatch(/isCoachDirectedSession/);
	});

	it('ActionInbox has no coach mock fallback rows', () => {
		const src = readFileSync(join(ROOT, 'lib/components/shell/ActionInbox.svelte'), 'utf-8');
		expect(src).not.toMatch(/MOCK_COACH_ACTIONS/);
	});

	it('MessagesTab loads custom club channels and sendChannelMessage path', () => {
		const src = readFileSync(join(ROOT, 'lib/components/coach/MessagesTab.svelte'), 'utf-8');
		expect(src).toMatch(/mapClubChannelDoc/);
		expect(src).toMatch(/sendChannelMessage/);
		expect(src).toMatch(/clubs', cId, 'channels'/);
	});

	it('Team Ops schedule embeds FacilityScheduler for pitch booking', () => {
		const src = readFileSync(
			join(ROOT, 'lib/coach/logistics/CoachTeamSchedulePanel.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/FacilityScheduler/);
	});
});

describe('Player/parent launch — discoverability and payment refresh', () => {
	it('PlayerShell bottom rail includes Comms → /messages', () => {
		const nav = readFileSync(join(ROOT, 'lib/player/shell/playerPrimaryNav.ts'), 'utf-8');
		const shell = readFileSync(join(ROOT, 'lib/components/shell/PlayerShell.svelte'), 'utf-8');
		expect(nav).toMatch(/href:\s*'\/messages'/);
		expect(nav).toMatch(/label:\s*'Comms'/);
		expect(shell).toContain('playerRailNav');
	});

	it('PlayerShell bottom rail includes Tracker → /player/tracker', () => {
		const nav = readFileSync(join(ROOT, 'lib/player/shell/playerPrimaryNav.ts'), 'utf-8');
		const shell = readFileSync(join(ROOT, 'lib/components/shell/PlayerShell.svelte'), 'utf-8');
		expect(nav).toMatch(/href:\s*'\/player\/tracker'/);
		expect(nav).toMatch(/label:\s*'Tracker'/);
		expect(nav).toMatch(/icon:\s*'game\.zap'/);
		expect(shell).toContain('playerRailNav');
	});

	it('PlayerShell rail exposes always-visible sign out for QA account switching', () => {
		const src = readFileSync(join(ROOT, 'lib/components/shell/PlayerShell.svelte'), 'utf-8');
		expect(src).toMatch(/handleSignOut/);
		expect(src).toMatch(/nav\.sign-out/);
		expect(src).toMatch(/aria-label=\{signingOut \? 'Signing out' : 'Sign out'\}/);
	});

	it('EnterpriseConsoleShell exposes sign out under System actions only (not top bar)', () => {
		const src = readFileSync(join(ROOT, 'lib/components/shell/EnterpriseConsoleShell.svelte'), 'utf-8');
		const systemBlock =
			src.match(/class="ec-sidebar__system"[\s\S]*?<\/div>\s*<\/div>\s*<\/aside>/)?.[0] ?? '';
		expect(systemBlock).toMatch(/ec-nav-link--sign-out/);
		expect(systemBlock).toMatch(/Sign out/);
		expect(src).not.toMatch(/ec-topbar__right[\s\S]*?aria-label="Sign out"/);
	});

	it('admin toolbar pages use AdminConsoleSearch flex cluster (not overlay adm-search-wrap)', () => {
		const orgToolbar = readFileSync(
			join(ROOT, 'lib/components/admin/OrganizationsToolbar.svelte'),
			'utf-8',
		);
		const auditPage = readFileSync(join(ROOT, 'routes/(app)/admin/audit-log/+page.svelte'), 'utf-8');
		const recruitersPage = readFileSync(
			join(ROOT, 'routes/(app)/admin/recruiters/+page.svelte'),
			'utf-8',
		);
		expect(orgToolbar).toMatch(/AdminConsoleSearch/);
		expect(auditPage).toMatch(/AdminConsoleSearch/);
		expect(recruitersPage).toMatch(/AdminConsoleSearch/);
		expect(orgToolbar).not.toMatch(/adm-search-wrap/);
		expect(auditPage).not.toMatch(/adm-search-wrap/);
		expect(recruitersPage).not.toMatch(/adm-search-wrap/);
	});

	it('OperativeQuickOps links Today\'s quests to /player/tracker', () => {
		const src = readFileSync(
			join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/Today's quests/);
		expect(src).toMatch(/href:\s*'\/player\/tracker'/);
	});

	it('parent payments handlePaid re-fetches season_registrations from Firestore', () => {
		const src = readFileSync(join(ROOT, 'routes/(app)/parent/payments/+page.svelte'), 'utf-8');
		expect(src).toMatch(/void loadData\(parentEmail, tid\)/);
		expect(src).not.toMatch(/players\[idx\]\s*=\s*\{\s*\.\.\.players\[idx\],\s*paymentStatus:\s*'paid'/);
	});

	it('BountyTerminal links unfunded deploy to parent funding panel anchor', () => {
		const terminal = readFileSync(
			join(ROOT, 'routes/(app)/parent/dashboard/BountyTerminal.svelte'),
			'utf-8',
		);
		const arena = readFileSync(join(ROOT, 'lib/components/parent/co-op/CoOpArena.svelte'), 'utf-8');
		expect(terminal).toMatch(/#parent-funding-source/);
		expect(arena).toMatch(/id="parent-funding-source"/);
	});
});
