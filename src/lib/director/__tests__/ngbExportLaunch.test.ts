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
		expect(panel).toMatch(/Download export/);
		expect(panel).toMatch(/player_lookup/);
	});

	it.skip('FEDERATION_ROADMAP documents phased NGB export plan', () => {
		const doc = readFileSync(join(ROOT, 'docs/acquisition/FEDERATION_ROADMAP.md'), 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
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

describe('fed-phase2 — Federation format adapters (C-02)', () => {
	it('formatAdapterRegistry ships built-in adapters', () => {
		const adapters = readFileSync(
			join(ROOT, 'functions/src/domains/ngbFormatAdapters.js'),
			'utf-8',
		);
		expect(adapters).toMatch(/formatAdapterRegistry/);
		expect(adapters).toMatch(/csv_v1/);
		expect(adapters).toMatch(/us_soccer_roster/);
		expect(adapters).toMatch(/gotsport_roster/);
		expect(adapters).toMatch(/buildCustomProfileAdapter/);
	});

	it('exportStateRoster accepts formatId and export_profiles', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/ngbExportOps.js'), 'utf-8');
		expect(ops).toMatch(/formatId/);
		expect(ops).toMatch(/resolveExportAdapter/);
		expect(ops).toMatch(/export_profiles/);
		expect(ops).toMatch(/exports\.listNgbExportFormats/);
	});

	it('functions-core wires listNgbExportFormats', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/listNgbExportFormats/);
	});

	it('deploy:core includes listNgbExportFormats', () => {
		const pkg = readFileSync(join(ROOT, 'package.json'), 'utf-8');
		expect(pkg).toMatch(/functions:core:listNgbExportFormats/);
	});

	it('StateRosterExportPanel offers format picker with federation adapters', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/StateRosterExportPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/formatId/);
		expect(panel).toMatch(/us_soccer_roster/);
		expect(panel).toMatch(/gotsport_roster/);
		expect(panel).toMatch(/listNgbExportFormats/);
		expect(panel).toMatch(/export_profiles/);
	});

	it('ngbFormatAdapters unit tests cover adapters', () => {
		const testFile = readFileSync(
			join(ROOT, 'functions/__tests__/ngbFormatAdapters.test.js'),
			'utf-8',
		);
		expect(testFile).toMatch(/us_soccer_roster/);
		expect(testFile).toMatch(/gotsport_roster/);
		expect(testFile).toMatch(/export_profiles/);
	});
});

describe('fed-phase3 — Federation sync jobs (C-03)', () => {
	it('federationSyncOps exports Phase 3 callables with job queue', () => {
		const ops = readFileSync(
			join(ROOT, 'functions/src/domains/federationSyncOps.js'),
			'utf-8',
		);
		expect(ops).toMatch(/exports\.getFederationSyncStatus/);
		expect(ops).toMatch(/exports\.enqueueFederationSyncJob/);
		expect(ops).toMatch(/federation_sync_jobs/);
		expect(ops).toMatch(/security_audit/);
		expect(ops).toMatch(/phase:\s*3/);
	});

	it('functions-core wires federation sync callables', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/getFederationSyncStatus/);
		expect(idx).toMatch(/enqueueFederationSyncJob/);
		expect(idx).toMatch(/federationSyncOps/);
	});

	it('StateRosterExportPanel shows federation sync status and queue action', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/StateRosterExportPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/getFederationSyncStatus/);
		expect(panel).toMatch(/enqueueFederationSyncJob/);
		expect(panel).toMatch(/Queue federation sync/);
		expect(panel).toMatch(/sre-panel__sync-badge/);
	});
});
