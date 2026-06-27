/**
 * Benchmark drill catalogue — single source of truth (formerly ProvingGrounds.svelte DRILLS).
 * Coach assigns via Forge (missionKind benchmark); player executes in Train.
 */

import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte';
import { calculateTrainingSessionEarnedXp } from '$lib/gamification/level.js';

export type BenchmarkStatKey = keyof ScoutsSix;

export type BenchmarkDrill = {
	id: string;
	label: string;
	description: string;
	category: string;
	categoryAccent: string;
	statKey: BenchmarkStatKey;
	unit: string;
	placeholder: string;
	inputMin: number;
	inputMax: number;
	baseXP: number;
	bonusXP: number;
	bonusThreshold: number;
	higherIsBetter: boolean;
	format: (v: number) => string;
};

/** RPG attribute id used for xpByAttribute / coach intent progress. */
const STAT_TO_ATTRIBUTE: Record<BenchmarkStatKey, string> = {
	PAC: 'pace',
	ACC: 'pace',
	AGI: 'pace',
	STM: 'grit',
	POW: 'grit',
	VAN: 'scanning',
};

export const BENCHMARK_DRILLS: readonly BenchmarkDrill[] = Object.freeze([
	{
		id: 'sprint-30m',
		label: '30M SPRINT',
		description:
			'Top-end velocity over 30 metres from a stationary start. Measures pure speed ceiling.',
		category: 'SPEED',
		categoryAccent: '#14b8a6',
		statKey: 'PAC',
		unit: 'MPH',
		placeholder: 'e.g. 24.1',
		inputMin: 5,
		inputMax: 40,
		baseXP: 350,
		bonusXP: 150,
		bonusThreshold: 22,
		higherIsBetter: true,
		format: (v) => `${v.toFixed(1)} MPH`,
	},
	{
		id: 'accel-test',
		label: 'ACCELERATION TEST',
		description:
			'Time from stationary to first full stride. Lower is faster — measures explosive first step.',
		category: 'SPEED',
		categoryAccent: '#14b8a6',
		statKey: 'ACC',
		unit: 's',
		placeholder: 'e.g. 1.48',
		inputMin: 0.5,
		inputMax: 3.5,
		baseXP: 300,
		bonusXP: 100,
		bonusThreshold: 1.5,
		higherIsBetter: false,
		format: (v) => `${v.toFixed(2)}s`,
	},
	{
		id: 'shuttle-5-10-5',
		label: '5-10-5 SHUTTLE',
		description:
			'Change-of-direction agility across a 20-yard course. Lateral quickness and deceleration.',
		category: 'AGILITY',
		categoryAccent: '#a78bfa',
		statKey: 'AGI',
		unit: 's',
		placeholder: 'e.g. 4.12',
		inputMin: 3,
		inputMax: 6.5,
		baseXP: 250,
		bonusXP: 100,
		bonusThreshold: 4.2,
		higherIsBetter: false,
		format: (v) => `${v.toFixed(2)}s`,
	},
	{
		id: 'stamina-protocol',
		label: 'STAMINA PROTOCOL',
		description: 'Progressive aerobic threshold test. Enter the level reached before failure.',
		category: 'ENDURANCE',
		categoryAccent: '#4ade80',
		statKey: 'STM',
		unit: 'LVL',
		placeholder: 'e.g. 18',
		inputMin: 1,
		inputMax: 40,
		baseXP: 400,
		bonusXP: 150,
		bonusThreshold: 15,
		higherIsBetter: true,
		format: (v) => `Lvl ${Math.round(v)}`,
	},
	{
		id: 'broad-jump',
		label: 'STANDING BROAD JUMP',
		description:
			'Explosive lower-body power output. Maximum horizontal distance from a standing two-foot takeoff.',
		category: 'POWER',
		categoryAccent: '#fb923c',
		statKey: 'POW',
		unit: 'IN',
		placeholder: 'e.g. 38',
		inputMin: 10,
		inputMax: 80,
		baseXP: 300,
		bonusXP: 150,
		bonusThreshold: 34,
		higherIsBetter: true,
		format: (v) => `${Math.round(v)} in`,
	},
	{
		id: 'combine-composite',
		label: 'COMBINE COMPOSITE',
		description:
			'Full scouting composite score synthesising all six field metrics into the VAN Rating (0–100).',
		category: 'COMPOSITE',
		categoryAccent: '#fbbf24',
		statKey: 'VAN',
		unit: 'PTS',
		placeholder: 'e.g. 94',
		inputMin: 0,
		inputMax: 100,
		baseXP: 500,
		bonusXP: 250,
		bonusThreshold: 85,
		higherIsBetter: true,
		format: (v) => `${Math.round(v)}`,
	},
]);

export function getBenchmarkDrillById(id: string): BenchmarkDrill | undefined {
	const key = id.trim();
	return BENCHMARK_DRILLS.find((d) => d.id === key);
}

export function benchmarkStatKeyToAttributeId(statKey: BenchmarkStatKey): string {
	return STAT_TO_ATTRIBUTE[statKey] ?? 'pace';
}

export function isBenchmarkInputValid(drill: BenchmarkDrill, raw: string): boolean {
	const num = parseFloat(raw);
	return (
		raw.trim() !== '' &&
		!Number.isNaN(num) &&
		num >= drill.inputMin &&
		num <= drill.inputMax
	);
}

export function benchmarkBonusEarned(drill: BenchmarkDrill, numInput: number): boolean {
	return drill.higherIsBetter
		? numInput >= drill.bonusThreshold
		: numInput <= drill.bonusThreshold;
}

export function computeBenchmarkXp(drill: BenchmarkDrill, numInput: number): number {
	const bonus = benchmarkBonusEarned(drill, numInput);
	return drill.baseXP + (bonus ? drill.bonusXP : 0);
}

export function formatBenchmarkBonusHint(drill: BenchmarkDrill): string {
	const op = drill.higherIsBetter ? '≥' : '≤';
	const val = drill.unit ? `${drill.bonusThreshold} ${drill.unit}` : String(drill.bonusThreshold);
	return `${op} ${val} unlocks +${drill.bonusXP} XP performance bonus`;
}

/**
 * Map catalog XP to logTrainingSession volume (server calculates earned XP from duration/reps).
 * Uses high intensity + duration minutes only (reps=0) for predictable parity with level.js.
 */
export function resolveBenchmarkLogVolume(targetXp: number): {
	duration: number;
	reps: number;
	intensity: 'high';
} {
	const goal = Math.max(1, Math.floor(targetXp));
	for (let duration = 1; duration <= 120; duration++) {
		const earned = calculateTrainingSessionEarnedXp({
			duration,
			reps: 0,
			intensity: 'high',
		});
		if (earned >= goal) {
			return { duration, reps: 0, intensity: 'high' };
		}
	}
	return { duration: 120, reps: 0, intensity: 'high' };
}
