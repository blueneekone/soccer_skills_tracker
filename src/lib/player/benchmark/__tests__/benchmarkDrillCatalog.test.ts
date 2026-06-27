import { describe, expect, it } from 'vitest';
import {
	BENCHMARK_DRILLS,
	benchmarkBonusEarned,
	benchmarkStatKeyToAttributeId,
	computeBenchmarkXp,
	getBenchmarkDrillById,
	isBenchmarkInputValid,
	resolveBenchmarkLogVolume,
} from '../benchmarkDrillCatalog.js';

describe('benchmarkDrillCatalog', () => {
	it('exports six frozen drills with unique ids', () => {
		expect(BENCHMARK_DRILLS.length).toBe(6);
		const ids = BENCHMARK_DRILLS.map((d) => d.id);
		expect(new Set(ids).size).toBe(6);
	});

	it('getBenchmarkDrillById resolves catalog entries', () => {
		const drill = getBenchmarkDrillById('sprint-30m');
		expect(drill?.label).toBe('30M SPRINT');
		expect(drill?.statKey).toBe('PAC');
	});

	it('maps Scouts Six stat keys to RPG attribute ids', () => {
		expect(benchmarkStatKeyToAttributeId('PAC')).toBe('pace');
		expect(benchmarkStatKeyToAttributeId('STM')).toBe('grit');
		expect(benchmarkStatKeyToAttributeId('VAN')).toBe('scanning');
	});

	it('validates numeric input against drill bounds', () => {
		const drill = getBenchmarkDrillById('accel-test')!;
		expect(isBenchmarkInputValid(drill, '1.48')).toBe(true);
		expect(isBenchmarkInputValid(drill, '4.0')).toBe(false);
	});

	it('computes base + bonus XP from performance threshold', () => {
		const drill = getBenchmarkDrillById('sprint-30m')!;
		expect(computeBenchmarkXp(drill, 20)).toBe(drill.baseXP);
		expect(benchmarkBonusEarned(drill, 23)).toBe(true);
		expect(computeBenchmarkXp(drill, 23)).toBe(drill.baseXP + drill.bonusXP);
	});

	it('resolveBenchmarkLogVolume yields server-parity volume for target XP', () => {
		const vol = resolveBenchmarkLogVolume(350);
		expect(vol.intensity).toBe('high');
		expect(vol.duration).toBeGreaterThan(0);
		expect(vol.duration).toBeLessThanOrEqual(120);
	});
});
