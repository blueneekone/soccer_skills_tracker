/**
 * commsSprint45.test.ts — Epic 4.5 Slice A + Slice B
 * Slice A: Deployment calendar entry → team_broadcasts auto-announce
 * Slice B: Coach team_workouts scheduled-event → opt-in announce via safeSportBroadcast
 * Authority: ROADMAP Epic 4.5 · docs/DEPLOYMENT_CALENDAR_SCHEMA.md
 *
 * Source-scan tests: verify code structure, wiring, and safety invariants
 * without executing Firebase calls.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_ROOT = join(__dirname, '..', '..', '..', '..', 'functions');
const NOTIFICATION_OPS = join(FUNCTIONS_ROOT, 'src', 'domains', 'notificationOps.js');
const INDEX_JS = join(FUNCTIONS_ROOT, 'index.js');

const ops = readFileSync(NOTIFICATION_OPS, 'utf-8');
const idx = readFileSync(INDEX_JS, 'utf-8');

// ── Slice B: client-side sources ──────────────────────────────────────────────
const SRC_ROOT = join(__dirname, '..', '..');
const WORKOUTS_STORE = join(SRC_ROOT, 'stores', 'workouts.svelte.js');
const FIELD_OPS_MODULE = join(SRC_ROOT, 'components', 'director', 'os', 'FieldOpsModule.svelte');

const workoutsSrc = readFileSync(WORKOUTS_STORE, 'utf-8');
const fieldOpsSrc = readFileSync(FIELD_OPS_MODULE, 'utf-8');

// ── 1. Export presence ────────────────────────────────────────────────────────

describe('Epic 4.5 Slice A — export presence', () => {
	it('notificationOps.js exports onDeploymentCalendarEntryCreated', () => {
		expect(ops).toMatch(/exports\.onDeploymentCalendarEntryCreated\s*=/);
	});

	it('index.js re-exports onDeploymentCalendarEntryCreated from notificationOps', () => {
		expect(idx).toMatch(/onDeploymentCalendarEntryCreated/);
		expect(idx).toMatch(/notificationOps\.onDeploymentCalendarEntryCreated/);
	});
});

// ── 2. Trigger path and region ────────────────────────────────────────────────

describe('Epic 4.5 Slice A — trigger config', () => {
	it('listens on deployment_calendar_entries/{entryId}', () => {
		expect(ops).toMatch(/deployment_calendar_entries\/\{entryId\}/);
	});

	it('uses region us-east1 (matches all other notificationOps triggers)', () => {
		// The trigger block must contain the region declaration adjacent to the doc path
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/region:\s*REGION/);
		// REGION constant is 'us-east1'
		expect(ops).toMatch(/const REGION\s*=\s*['"]us-east1['"]/);
	});

	it('uses onDocumentCreated (create-only — no update/reschedule in v1)', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/onDocumentCreated/);
		expect(triggerBlock).not.toMatch(/onDocumentWritten/);
		expect(triggerBlock).not.toMatch(/onDocumentUpdated/);
	});
});

// ── 3. teamIds fan-out ────────────────────────────────────────────────────────

describe('Epic 4.5 Slice A — teamIds fan-out', () => {
	it('iterates entry.teamIds with a for...of loop', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/for\s*\(const teamId of teamIds\)/);
	});

	it('skips gracefully when teamIds is empty or absent', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/teamIds\.length\s*===\s*0/);
	});

	it('suppresses entries with visibility === staff_only', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/visibility\s*===\s*['"]staff_only['"]/);
	});
});

// ── 4. team_broadcasts doc shape ─────────────────────────────────────────────

describe('Epic 4.5 Slice A — team_broadcasts doc shape (mirrors safeSportBroadcast)', () => {
	it('writes teamId field', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/teamId,/);
	});

	it('writes teamClubId field (same field name as safeSportBroadcast)', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/teamClubId:/);
	});

	it('writes subject and body fields', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/subject,/);
		expect(triggerBlock).toMatch(/body,/);
	});

	it('writes bodyPreview (used by onTeamBroadcastCreated for push body)', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/bodyPreview:/);
	});

	it('writes ccParentEmails array', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/ccParentEmails,/);
	});

	it('writes createdAt: serverTimestamp', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/createdAt:\s*admin\.firestore\.FieldValue\.serverTimestamp\(\)/);
	});

	it('writes source: deployment_calendar marker', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/source:\s*['"]deployment_calendar['"]/);
	});

	it('writes fromUid: system (not a real user UID)', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/fromUid:\s*['"]system['"]/);
	});

	it('writes fromRole: director', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/fromRole:\s*['"]director['"]/);
	});
});

// ── 5. ccParentEmails resolution (mirrors safeSportBroadcast) ────────────────

describe('Epic 4.5 Slice A — ccParentEmails resolution', () => {
	it('queries player_lookup where teamId == teamId', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/player_lookup/);
		expect(triggerBlock).toMatch(/where\('teamId',\s*'==',\s*teamId\)/);
	});

	it('reads users/{email} profile to check isMinor via resolveIsMinor', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/resolveIsMinor/);
		expect(triggerBlock).toMatch(/collection\('users'\)/);
	});

	it('resolves parentEmails from households/{householdId}', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/households/);
		expect(triggerBlock).toMatch(/householdId/);
		expect(triggerBlock).toMatch(/parentEmails/);
	});

	it('runs filterParentsWithCommsConsent before adding to ccParentEmails', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/filterParentsWithCommsConsent/);
	});

	it('imports resolveIsMinor and filterParentsWithCommsConsent from commsPolicy', () => {
		expect(ops).toMatch(/resolveIsMinor/);
		expect(ops).toMatch(/filterParentsWithCommsConsent/);
		expect(ops).toMatch(/require\(['"]\.\/commsPolicy['"]\)/);
	});
});

// ── 6. Push delegation (does NOT call sendFcmToUids directly) ────────────────

describe('Epic 4.5 Slice A — push delegation to onTeamBroadcastCreated', () => {
	it('does NOT call sendFcmToUids inside onDeploymentCalendarEntryCreated', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).not.toMatch(/sendFcmToUids/);
	});

	it('writes to team_broadcasts collection (which triggers onTeamBroadcastCreated)', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/collection\('team_broadcasts'\)/);
		expect(triggerBlock).toMatch(/\.add\(/);
	});
});

// ── 7. Error handling / non-fatal guarantee ───────────────────────────────────

describe('Epic 4.5 Slice A — error handling', () => {
	it('wraps per-team work in try/catch', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		// Must have a catch block inside the for loop
		expect(triggerBlock).toMatch(/}\s*catch\s*\(err\)\s*\{/);
		expect(triggerBlock).toMatch(/logger\.error/);
	});

	it('per-team parent resolution errors are individually caught and logged as warn', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/logger\.warn/);
	});

	it('guards event.data absence before accessing data', () => {
		const triggerBlock = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(triggerBlock).toMatch(/if\s*\(!snap\)/);
	});
});

// ════════════════════════════════════════════════════════════════════════════
// Epic 4.5 SLICE B — coach team_workouts opt-in announce
// ════════════════════════════════════════════════════════════════════════════

// ── 8. saveTeamScheduledEvent accepts announceToTeam ─────────────────────────

describe('Epic 4.5 Slice B — saveTeamScheduledEvent signature', () => {
	it('exports saveTeamScheduledEvent', () => {
		expect(workoutsSrc).toMatch(/export\s+async\s+function\s+saveTeamScheduledEvent/);
	});

	it('accepts announceToTeam parameter (default false)', () => {
		expect(workoutsSrc).toMatch(/announceToTeam\s*=\s*false/);
	});

	it('imports httpsCallable from firebase/functions', () => {
		expect(workoutsSrc).toMatch(/import\s*\{[^}]*httpsCallable[^}]*\}\s*from\s*['"]firebase\/functions['"]/);
	});

	it('imports functions from $lib/firebase', () => {
		expect(workoutsSrc).toMatch(/import\s*\{[^}]*functions[^}]*\}\s*from\s*['"]\$lib\/firebase\.js['"]/);
	});
});

// ── 9. Broadcast call wiring ──────────────────────────────────────────────────

describe('Epic 4.5 Slice B — broadcast call wiring', () => {
	it('calls httpsCallable(functions, safeSportBroadcast)', () => {
		expect(workoutsSrc).toMatch(/httpsCallable\s*\(\s*functions\s*,\s*['"]safeSportBroadcast['"]\s*\)/);
	});

	it('fires broadcast only when announceToTeam is true', () => {
		expect(workoutsSrc).toMatch(/if\s*\(\s*announceToTeam\s*\)/);
	});

	it('passes teamId in the broadcast payload', () => {
		const broadcastBlock = workoutsSrc.slice(workoutsSrc.indexOf('if (announceToTeam)'));
		expect(broadcastBlock).toMatch(/teamId/);
	});

	it('passes subject in the broadcast payload', () => {
		const broadcastBlock = workoutsSrc.slice(workoutsSrc.indexOf('if (announceToTeam)'));
		expect(broadcastBlock).toMatch(/subject/);
	});

	it('passes body in the broadcast payload', () => {
		const broadcastBlock = workoutsSrc.slice(workoutsSrc.indexOf('if (announceToTeam)'));
		expect(broadcastBlock).toMatch(/body/);
	});

	it('derives subject from kindLabel and name (e.g. "New Game: ...")', () => {
		const broadcastBlock = workoutsSrc.slice(workoutsSrc.indexOf('if (announceToTeam)'));
		expect(broadcastBlock).toMatch(/`New \$\{kindLabel\}: \$\{name\}`/);
	});
});

// ── 10. Try/catch isolation — broadcast failure must not break event save ─────

describe('Epic 4.5 Slice B — broadcast try/catch isolation', () => {
	it('wraps the announce block in try/catch', () => {
		const announceBlock = workoutsSrc.slice(workoutsSrc.indexOf('if (announceToTeam)'));
		expect(announceBlock).toMatch(/try\s*\{/);
		expect(announceBlock).toMatch(/}\s*catch\s*\(/);
	});

	it('logs broadcast errors with console.error (non-fatal)', () => {
		const announceBlock = workoutsSrc.slice(workoutsSrc.indexOf('if (announceToTeam)'));
		expect(announceBlock).toMatch(/console\.error/);
	});

	it('addDoc call comes BEFORE the announceToTeam block (event always saved first)', () => {
		const addDocPos = workoutsSrc.indexOf("addDoc(collection(db, 'team_workouts')");
		const announcePos = workoutsSrc.indexOf('if (announceToTeam)');
		expect(addDocPos).toBeGreaterThan(0);
		expect(announcePos).toBeGreaterThan(addDocPos);
	});
});

// ── 11. FieldOpsModule.svelte — UI toggle wiring ─────────────────────────────

describe('Epic 4.5 Slice B — FieldOpsModule announce toggle', () => {
	it('declares announceToTeam $state(false)', () => {
		expect(fieldOpsSrc).toMatch(/announceToTeam\s*=\s*\$state\s*\(\s*false\s*\)/);
	});

	it('has an "Announce to team" checkbox in the template', () => {
		expect(fieldOpsSrc).toMatch(/Announce to team/);
		expect(fieldOpsSrc).toMatch(/bind:checked=\{announceToTeam\}/);
	});

	it('passes announceToTeam into saveTeamScheduledEvent call', () => {
		const saveBlock = fieldOpsSrc.slice(fieldOpsSrc.indexOf('saveTeamScheduledEvent('));
		expect(saveBlock).toMatch(/announceToTeam/);
	});

	it('announce checkbox is placed alongside the notify trigger toggles', () => {
		const notifyBlock = fieldOpsSrc.slice(fieldOpsSrc.indexOf('Notification triggers'));
		expect(notifyBlock).toMatch(/Announce to team/);
	});
});
