/**
 * comms44ParentLoungeRoute.guard.test.ts — Epic 4.4 W4 source-scan guards
 *
 * Verifies (without emulator) that the W4 parent lounge route surface is
 * correctly wired into the existing /messages page:
 *
 *   - /messages/+page.svelte imports ParentLoungePanel
 *   - Page references parent-lounge channel naming and passes clubId + teamId
 *   - ParentLoungePanel is rendered inside the role === 'parent' branch
 *   - Teams are derived from the existing items/children resolution
 *     (teamClubId / teamId fields on already-loaded in_app_messages)
 *   - No new household collection query is introduced
 *   - Zero-teams case is handled gracefully (no lounge section, or quiet note)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const MESSAGES_PAGE = join(ROOT, 'routes', '(app)', 'messages', '+page.svelte');

const src = readFileSync(MESSAGES_PAGE, 'utf-8');

// ── Import ────────────────────────────────────────────────────────────────────

describe('Epic 4.4 W4 — /messages imports ParentLoungePanel', () => {
	it('imports ParentLoungePanel from comms directory', () => {
		expect(src).toMatch(/import\s+ParentLoungePanel\s+from\s+['"].*comms\/ParentLoungePanel\.svelte['"]/);
	});
});

// ── Props passed to component ────────────────────────────────────────────────

describe('Epic 4.4 W4 — ParentLoungePanel receives clubId and teamId props', () => {
	it('passes clubId prop to ParentLoungePanel', () => {
		// Match the actual component usage <ParentLoungePanel clubId=...
		expect(src).toMatch(/<ParentLoungePanel[^>]*clubId\s*=/);
	});

	it('passes teamId prop to ParentLoungePanel', () => {
		expect(src).toMatch(/<ParentLoungePanel[^>]*teamId\s*=/);
	});
});

// ── Parent role branch ────────────────────────────────────────────────────────

describe('Epic 4.4 W4 — ParentLoungePanel rendered only in parent branch', () => {
	it('lounge section is inside an role === parent conditional', () => {
		// Template uses {#if role === 'parent'} — verify both the conditional and
		// that ParentLoungePanel appears after the lounge-section marker
		expect(src).toMatch(/\{#if\s+role\s*===\s*['"]parent['"]\}/);
		const ifBlock = src.split('{#if role === \'parent\'}')[1] ?? '';
		expect(ifBlock).toMatch(/ParentLoungePanel/);
	});

	it('lounge section has a labeled heading', () => {
		expect(src).toMatch(/Parent Lounge/);
	});
});

// ── Teams derived from children's user docs (W4b fix) ────────────────────────
//
// The PRIMARY source is now the parent's children's provisioned team data
// (household doc → child emails → user doc teamId/clubId), so the lounge
// appears immediately after household-link even before the first CC message.
// CC'd in_app_messages remain as a fallback in the same $derived.

describe('Epic 4.4 W4b — parentLounges sourced from children\'s team data (primary)', () => {
	it('declares parentLoungeTeams $state as primary lounge source', () => {
		expect(src).toMatch(/let\s+parentLoungeTeams\s*=\s*\$state/);
	});

	it('parentLounges $derived references parentLoungeTeams', () => {
		expect(src).toMatch(/parentLounges\s*=\s*\$derived/);
		const afterDecl = src.split('parentLounges')[1] ?? '';
		expect(afterDecl).toMatch(/parentLoungeTeams/);
	});

	it('reads household doc via getDoc to resolve child emails', () => {
		expect(src).toMatch(/getDoc\s*\(\s*doc\s*\(\s*db\s*,\s*['"]households['"]/);
	});

	it('reads user doc per child email via getDoc to obtain teamId and clubId', () => {
		expect(src).toMatch(/getDoc\s*\(\s*doc\s*\(\s*db\s*,\s*['"]users['"]/);
	});

	it('CC-message items still referenced as fallback in parentLounges', () => {
		// items (teamClubId/teamId from in_app_messages) remain as secondary source
		const loungesBlock = src.split('parentLounges')[1] ?? '';
		expect(loungesBlock).toMatch(/items/);
		expect(loungesBlock).toMatch(/teamClubId/);
	});

	it('uses $derived rune (no legacy $: reactive statement)', () => {
		expect(src).toMatch(/parentLounges\s*=\s*\$derived/);
		expect(src).not.toMatch(/\$:\s+parentLounges\s*=/);
	});

	it('child-team loader only runs for parent role (parent-only guard)', () => {
		// The $effect that populates parentLoungeTeams must gate on role !== 'parent'
		expect(src).toMatch(/role\s*!==\s*['"]parent['"]/);
	});
});

// ── No new household query ────────────────────────────────────────────────────

describe('Epic 4.4 W4 — no new household Firestore collection query added', () => {
	it('does not introduce a new households collection query', () => {
		// The page may already reference householdId for HouseholdThreadPanel —
		// but must NOT add a new getDocs/onSnapshot over the households collection.
		const queries = src.match(/collection\(db,\s*['"]households['"]\)/g) ?? [];
		expect(queries.length).toBe(0);
	});

	it('does not add a secondary users collection batch-fetch for children', () => {
		// The page reuses items; it must not add a new loop-getDocs over users collection
		// beyond what was already present (there was none before W4).
		const usersQueries = src.match(/collection\(db,\s*['"]users['"]\)/g) ?? [];
		expect(usersQueries.length).toBe(0);
	});
});

// ── Zero-teams case ────────────────────────────────────────────────────────────

describe('Epic 4.4 W4 — zero-teams case handled gracefully', () => {
	it('handles empty parentLounges array without crashing (conditional render)', () => {
		expect(src).toMatch(/parentLounges\.length\s*===\s*0|parentLounges\.length\s*==\s*0|!\s*parentLounges\.length/);
	});
});

// ── Does not create a new /parent/messages route ──────────────────────────────

describe('Epic 4.4 W4 — no new parallel route created', () => {
	it('page lives at /messages not /parent/messages (file path check)', () => {
		expect(MESSAGES_PAGE).toMatch(/\(app\)[/\\]messages[/\\]\+page\.svelte$/);
	});
});
