import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('DIRECTOR-ROSTER-INGEST-UI — RosterIngestPanel', () => {
	const panel = readFileSync(
		join(ROOT, 'src/lib/components/admin/RosterIngestPanel.svelte'),
		'utf-8',
	);
	const rosterPage = readFileSync(
		join(
			ROOT,
			'src/routes/(app)/admin/organizations/[clubId]/teams/[teamId]/roster/+page.svelte',
		),
		'utf-8',
	);
	const ingestCf = readFileSync(join(ROOT, 'functions/ingestRoster.js'), 'utf-8');

	it('wires ingestRoster callable in the panel', () => {
		expect(panel).toMatch(/httpsCallable\(functions,\s*['"]ingestRoster['"]\)/);
		expect(panel).toMatch(/format:\s*finalFormat/);
		expect(panel).toMatch(/fileToBase64/);
		expect(panel).not.toMatch(/secureBulkAddPlayers/);
	});

	it('admin team roster page mounts RosterIngestPanel', () => {
		expect(rosterPage).toMatch(/RosterIngestPanel/);
		expect(rosterPage).toMatch(/<RosterIngestPanel/);
	});

	it('UI copy states director-only guard and coach Team Ops path', () => {
		expect(panel).toMatch(/Director-only/);
		expect(panel).toMatch(/Director role required/);
		expect(panel).toMatch(/Registrars are not authorized/);
		expect(panel).toMatch(/\/coach\/logistics\?tab=roster/);
		expect(panel).not.toMatch(/secureBulkAddPlayers/);
	});

	it('ingestRoster Cloud Function remains director-only (not widened to coach)', () => {
		expect(ingestCf).toMatch(/Director role required for roster ingestion/);
		expect(ingestCf).toMatch(/role !== 'director'/);
		expect(ingestCf).not.toMatch(/assertCanSecureAddPlayer/);
		expect(ingestCf).not.toMatch(/secureBulkAddPlayers/);
	});
});
