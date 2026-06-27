import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');

describe('SURFACE-MERGE-TRIAL-EVAL guards', () => {
	it('trial-builder route redirects to Scouting roster eval tab', () => {
		const server = readFileSync(
			join(ROOT, 'routes/(app)/coach/trial-builder/+page.server.ts'),
			'utf-8',
		);
		expect(server).toMatch(/redirect\(302,\s*['"]\/coach\/scouting\?tab=roster-eval['"]\)/);
	});

	it('detached CoachTrialBuilderPanel removed', () => {
		expect(() =>
			readFileSync(join(ROOT, 'lib/components/coach/CoachTrialBuilderPanel.svelte'), 'utf-8'),
		).toThrow();
	});

	it('CoachScoutingView includes CoachRosterQuickEvalPanel', () => {
		const scouting = readFileSync(join(ROOT, 'lib/coach/scouting/CoachScoutingView.svelte'), 'utf-8');
		expect(scouting).toMatch(/CoachRosterQuickEvalPanel/);
		expect(scouting).toMatch(/tab=roster-eval|roster-eval/);
	});

	it('workspaceNav has no trial-builder href', () => {
		const nav = readFileSync(join(ROOT, 'lib/shell/workspaceNav.js'), 'utf-8');
		expect(nav).not.toMatch(/href:\s*'\/coach\/trial-builder'/);
	});

	it('SquadTelemetryView still queries trials by teamId', () => {
		const telemetry = readFileSync(join(ROOT, 'lib/components/hud/SquadTelemetryView.svelte'), 'utf-8');
		expect(telemetry).toMatch(/collection\(db, 'trials'\)/);
		expect(telemetry).toMatch(/where\('teamId', '==', currentTeamId\)/);
	});
});
