import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BENCHMARK_DRILLS } from '$lib/player/benchmark/benchmarkDrillCatalog.js';
import { buildCoachIntentHandoff, isBenchmarkMissionHandoff } from '$lib/player/workout/coachMissionFlow.js';
import { bountyFromCoachIntent, loadQuestProgress } from '$lib/player/dashboard/activeBounties.js';

const ROOT = join(process.cwd(), 'src');

describe('SURFACE-MERGE-BENCHMARKS guards', () => {
	it('benchmarkDrillCatalog is the single source of truth', () => {
		expect(BENCHMARK_DRILLS.length).toBeGreaterThanOrEqual(6);
		const provingGrounds = readFileSync(
			join(ROOT, 'lib/components/player/ProvingGrounds.svelte'),
			'utf-8',
		);
		expect(provingGrounds).toMatch(/benchmarkDrillCatalog/);
		expect(provingGrounds).not.toMatch(/id: 'sprint-30m'/);
	});

	it('Forge deploy panel exposes benchmark mission kind', () => {
		const forge = readFileSync(join(ROOT, 'lib/coach/intent/ForgeDeployPanel.svelte'), 'utf-8');
		expect(forge).toMatch(/draftMissionKind/);
		expect(forge).toMatch(/Benchmark/);
	});

	it('IntentEngine deploys missionKind benchmark', () => {
		const engine = readFileSync(join(ROOT, 'lib/coach/intent/IntentEngine.svelte.ts'), 'utf-8');
		expect(engine).toMatch(/draftMissionKind/);
		expect(engine).toMatch(/missionKind: this\.draftMissionKind/);
		expect(engine).toMatch(/benchmarkDrillId/);
	});

	it('OperativeQuickOps has no proving-grounds deep link', () => {
		const quickOps = readFileSync(
			join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte'),
			'utf-8',
		);
		expect(quickOps).not.toMatch(/\/player\/proving-grounds/);
	});

	it('proving-grounds route redirects to Train benchmark mode', () => {
		const server = readFileSync(
			join(ROOT, 'routes/(app)/player/proving-grounds/+page.server.ts'),
			'utf-8',
		);
		expect(server).toMatch(/redirect\(302,\s*['"]\/player\/workout\?mode=benchmark['"]\)/);
	});

	it('Train workout mounts benchmark panel for benchmark handoffs', () => {
		const workout = readFileSync(
			join(ROOT, 'routes/(app)/player/workout/+page.svelte'),
			'utf-8',
		);
		expect(workout).toMatch(/BenchmarkTrainSession/);
		expect(workout).toMatch(/resolveTrainBenchmarkContext/);
	});

	it('buildCoachIntentHandoff marks benchmark prescriptions', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-bench-1',
			targetAttributeId: 'pace',
			prescription: {
				sets: 1,
				bilateral: false,
				benchmarkDrillId: 'sprint-30m',
				drillTitle: '30M SPRINT',
			},
		});
		expect(isBenchmarkMissionHandoff(handoff)).toBe(true);
		expect(handoff.benchmarkDrillId).toBe('sprint-30m');
	});

	it('bountyFromCoachIntent labels benchmark missions for Train', () => {
		const quest = bountyFromCoachIntent(
			'int-b1',
			{
				targetAttributeId: 'pace',
				requiredXp: 350,
				missionKind: 'benchmark',
				prescription: { sets: 1, bilateral: false, benchmarkDrillId: 'sprint-30m' },
			},
			loadQuestProgress(),
			'player-1',
		);
		expect(quest?.actionHref).toBe('/player/workout');
		expect(quest?.title).toMatch(/30M SPRINT/);
		expect(quest?.senderLabel).toBe('Coach Benchmark');
	});
});
