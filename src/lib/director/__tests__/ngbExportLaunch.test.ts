import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('LAUNCH-fed-ngb — state roster CSV export', () => {
	it('exports exportStateRoster callable from ngbExportOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/ngbExportOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.exportStateRoster/);
		expect(ops).toMatch(/player_lookup/);
		expect(ops).toMatch(/households/);
		expect(ops).toMatch(/CSV_HEADERS/);
		expect(ops).toMatch(/director.*registrar/s);
	});

	it('functions-core wires exportStateRoster', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/exportStateRoster/);
		expect(idx).toMatch(/ngbExportOps/);
	});

	it('deploy:core includes exportStateRoster', () => {
		const pkg = readFileSync(join(ROOT, 'package.json'), 'utf-8');
		expect(pkg).toMatch(/functions:core:exportStateRoster/);
	});

	it('TeamsTab mounts StateRosterExportPanel on Roster tab', () => {
		const tab = readFileSync(
			join(ROOT, 'src/lib/components/director/TeamsTab.svelte'),
			'utf-8',
		);
		expect(tab).toMatch(/StateRosterExportPanel/);
	});

	it('StateRosterExportPanel calls exportStateRoster with club and optional team', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/StateRosterExportPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/exportStateRoster/);
		expect(panel).toMatch(/clubId/);
		expect(panel).toMatch(/teamId/);
		expect(panel).toMatch(/Download CSV/);
		expect(panel).toMatch(/player_lookup/);
	});

	it('FEDERATION_ROADMAP documents phased NGB export plan', () => {
		const doc = readFileSync(join(ROOT, 'docs/acquisition/FEDERATION_ROADMAP.md'), 'utf-8');
		expect(doc).toMatch(/Phase 1/);
		expect(doc).toMatch(/CSV v1/);
		expect(doc).toMatch(/Phase 2/);
		expect(doc).toMatch(/format adapters/i);
		expect(doc).toMatch(/Phase 3/);
		expect(doc).toMatch(/sync jobs/i);
		expect(doc).toMatch(/Phase 4/);
		expect(doc).toMatch(/API per body/i);
	});

	it('CSV v1 columns cover roster + household filing fields', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/ngbExportOps.js'), 'utf-8');
		expect(ops).toMatch(/player_name/);
		expect(ops).toMatch(/player_email/);
		expect(ops).toMatch(/guardian_emails/);
		expect(ops).toMatch(/household_id/);
		expect(ops).toMatch(/vpc_status/);
	});
});
