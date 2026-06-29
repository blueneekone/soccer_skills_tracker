/**
 * coachRosterImport.test.ts — COACH-ROSTER-IMPORT drift guards
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
const COACH_LIB = join(ROOT, 'src/lib/coach');
const ROSTER_PANEL = join(COACH_LIB, 'logistics/CoachTeamRosterPanel.svelte');
const IMPORT_PANEL = join(COACH_LIB, 'logistics/CoachRosterImportPanel.svelte');
const SQUAD_TELEMETRY = join(ROOT, 'src/lib/components/hud/SquadTelemetryView.svelte');
const INGEST_ROSTER = join(ROOT, 'functions/ingestRoster.js');
const INTEGRATIONS_INDEX = join(ROOT, 'functions-integrations/index.js');
const PLATFORM_INDEX = join(ROOT, 'functions-platform/index.js');
const PACKAGE_JSON = join(ROOT, 'package.json');

describe('COACH-ROSTER-IMPORT — Team Ops wiring', () => {
	it('CoachTeamRosterPanel imports CoachRosterImportPanel', () => {
		const src = readFileSync(ROSTER_PANEL, 'utf-8');
		expect(src).toMatch(/CoachRosterImportPanel/);
		expect(src).toMatch(/<CoachRosterImportPanel/);
	});

	it('secureBulkAddPlayers is wired in the client import panel', () => {
		const src = readFileSync(IMPORT_PANEL, 'utf-8');
		expect(src).toMatch(/httpsCallable\(functions,\s*['"]secureBulkAddPlayers['"]\)/);
	});

	it('coachRosterIngest is wired for PDF parse preview', () => {
		const src = readFileSync(IMPORT_PANEL, 'utf-8');
		expect(src).toMatch(/httpsCallable\(functions,\s*['"]coachRosterIngest['"]\)/);
		expect(src).toMatch(/format:\s*['"]pdf['"]/);
	});

	it('import panel accepts CSV and PDF file types', () => {
		const src = readFileSync(IMPORT_PANEL, 'utf-8');
		expect(src).toMatch(/accept="[^"]*\.pdf[^"]*application\/pdf/);
		expect(src).toMatch(/accept="[^"]*\.csv[^"]*text\/csv/);
		expect(src).toMatch(/Parsing…/);
	});

	it('Daily Intel links coaches to Team Ops roster import', () => {
		const src = readFileSync(SQUAD_TELEMETRY, 'utf-8');
		expect(src).toMatch(/Import CSV on Team Ops/);
		expect(src).toMatch(/\/coach\/logistics\?tab=roster/);
		expect(src).not.toMatch(/secureBulkAddPlayers/);
	});

	it('ingestRoster Cloud Function remains director-only', () => {
		const src = readFileSync(INGEST_ROSTER, 'utf-8');
		expect(src).toMatch(/Director role required for roster ingestion/);
		expect(src).toMatch(/role !== 'director'/);
		expect(src).not.toMatch(/assertCanSecureAddPlayer/);
	});

	it('secureBulkAddPlayers is exported for platform deploy', () => {
		const platform = readFileSync(PLATFORM_INDEX, 'utf-8');
		expect(platform).toMatch(/secureBulkAddPlayers/);
		const pkg = readFileSync(PACKAGE_JSON, 'utf-8');
		expect(pkg).toMatch(/functions:platform:secureBulkAddPlayers/);
	});

	it('coachRosterIngest is exported for integrations deploy', () => {
		const integrations = readFileSync(INTEGRATIONS_INDEX, 'utf-8');
		expect(integrations).toMatch(/coachRosterIngest/);
		const pkg = readFileSync(PACKAGE_JSON, 'utf-8');
		expect(pkg).toMatch(/functions:integrations:coachRosterIngest/);
	});
});
