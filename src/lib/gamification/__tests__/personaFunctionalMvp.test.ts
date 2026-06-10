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

	it('ROADMAP lists LAUNCH-functional-os as current sprint', () => {
		expect(roadmap).toMatch(/Current sprint:\*\*\s*\*\*LAUNCH-functional-os\*\*/);
		expect(roadmap).toMatch(/\|\s*\*\*LAUNCH-functional-os\*\*\s*\|\s*\*\*In progress\*\*/i);
	});

	it('ROADMAP next build order includes 3.5k Done then Epic 4.1 comms', () => {
		expect(roadmap).toMatch(/3\.5k Done.*Epic 4\.1/s);
		expect(roadmap).toMatch(/4\.1.*4\.2.*4\.11.*4\.4.*4\.3/s);
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
		expect(readme).toMatch(/Do not wire/i);
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
		expect(src).toMatch(/team_assignments/);
		expect(src).toMatch(/bountyFromCoachIntent/);
		expect(src).toMatch(/deduplicateById/);
		expect(src).toMatch(/stashMissionHandoff/);
	});

	it('Train page logs sessions and records quest progress after coach handoff', () => {
		expect(existsSync(WORKOUT_PAGE)).toBe(true);
		const src = readFileSync(WORKOUT_PAGE, 'utf-8');
		expect(src).toMatch(/logTrainingSession/);
		expect(src).toMatch(/recordQuestProgressAfterLog/);
		expect(src).toMatch(/from '\$lib\/firebase\.js'/);
		expect(src).toMatch(/isCoachDirectedSession/);
		expect(src).toMatch(/lockedCoachDrillLabel/);
		expect(src).toMatch(/incomingMissions\.some/);
		expect(src).toMatch(/FREE_LOG_DURATION_MAX_MINUTES/);
		expect(src).toMatch(/sessionNotes/);
		// G1 source-level guard: targetAttributeId must be forwarded into executePlayerWorkoutLog
		// so the server can write xpByAttribute and trigger intent lifecycle fulfillment.
		expect(src).toMatch(/targetAttributeId/);
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
		expect(src).toMatch(/childEmails\[0\]/);
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
