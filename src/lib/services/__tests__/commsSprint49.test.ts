/**
 * commsSprint49.test.ts — Epic 4.9 compliance console guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const CONSOLE = join(ROOT, 'components', 'director', 'DirectorCommsCompliancePanel.svelte');
const DIRECTOR_PAGE = join(ROOT, '..', 'routes', '(app)', 'director', '+page.svelte');
const RULES = join(ROOT, '..', '..', 'firestore.rules');

const consoleSrc = readFileSync(CONSOLE, 'utf8');
const directorPage = readFileSync(DIRECTOR_PAGE, 'utf8');
const rules = readFileSync(RULES, 'utf8');

describe('Epic 4.9 — Director comms compliance console', () => {
	it('loads team_broadcasts, messaging_audit, and audit_logs for export', () => {
		expect(consoleSrc).toMatch(/team_broadcasts/);
		expect(consoleSrc).toMatch(/messaging_audit/);
		expect(consoleSrc).toMatch(/audit_logs/);
		expect(consoleSrc).toMatch(/Export audit JSON/);
	});

	it('mounted on /director?tab=comms below club broadcast composer', () => {
		expect(directorPage).toMatch(/DirectorCommsCompliancePanel/);
		expect(directorPage).toMatch(/DirectorClubBroadcastComposer/);
	});

	it('director can list messaging_audit scoped to club teams', () => {
		expect(rules).toMatch(/match \/messaging_audit\/\{docId\}/);
		expect(consoleSrc).toMatch(/where\(['"]teamId['"],\s*['"]==['"],\s*teamId\)/);
	});
});
