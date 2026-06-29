import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQUAD_TELEMETRY = join(
	__dirname,
	'..',
	'..',
	'components',
	'hud',
	'SquadTelemetryView.svelte',
);

describe('COACH-DASHBOARD-LIVE-DATA — Daily Intel readiness matrix', () => {
	const src = readFileSync(SQUAD_TELEMETRY, 'utf-8');

	it('SquadTelemetryView has no READINESS_ROSTER mock constant', () => {
		expect(src).not.toMatch(/READINESS_ROSTER/);
	});

	it('SquadTelemetryView has no hardcoded mock operative names', () => {
		expect(src).not.toMatch(/J\. MARTINEZ/);
		expect(src).not.toMatch(/A\. SILVA/);
		expect(src).not.toMatch(/PLR-01/);
		expect(src).not.toMatch(/ALPHA UNIT/);
	});

	it('readiness cards derive from live roster + vpc queue', () => {
		expect(src).toMatch(/readinessRoster\s*=\s*\$derived\.by/);
		expect(src).toMatch(/players\.map/);
		expect(src).toMatch(/vpcPendingNameKeys/);
		expect(src).toMatch(/linkedPlayers\.has/);
	});

	it('shows honest empty state when roster is empty', () => {
		expect(src).toMatch(/readinessRoster\.length === 0/);
		expect(src).toMatch(/No athletes on roster/);
	});

	it('squad uptime score derives from live readiness counts (not hardcoded 88)', () => {
		expect(src).toMatch(/squadUptimePct\s*=\s*\$derived/);
		expect(src).not.toMatch(/SQUAD_UPTIME_PCT\s*=\s*88/);
	});
});
