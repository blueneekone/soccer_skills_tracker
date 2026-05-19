import { describe, it, expect } from 'vitest';
import {
	buildVanguardProtocolRows,
	extractPowerMetrics,
	hasVanguardTelemetry,
	VANGUARD_PROTOCOL_AXES,
} from '../vanguardProtocol.js';

describe('vanguardProtocol — axis catalog', () => {
	it('defines exactly six Vanguard Protocol attributes in prism order', () => {
		expect(VANGUARD_PROTOCOL_AXES).toHaveLength(6);
		expect(VANGUARD_PROTOCOL_AXES.map((a) => a.id)).toEqual([
			'PAC',
			'ACC',
			'POW',
			'COMP',
			'STM',
			'AGI',
		]);
	});
});

describe('vanguardProtocol — buildVanguardProtocolRows', () => {
	it('maps prism array indices to labeled rows with pct fill', () => {
		const rows = buildVanguardProtocolRows([80, 70, 60, 50, 40, 30]);
		expect(rows[0]).toMatchObject({ id: 'PAC', display: '80', pct: expect.closeTo(80.8, 0.5) });
		expect(rows[3]).toMatchObject({ id: 'COMP', display: '50' });
		expect(rows[5]).toMatchObject({ id: 'AGI', display: '30' });
	});

	it('clamps invalid values to 0–99', () => {
		const rows = buildVanguardProtocolRows([120, -5, NaN as unknown as number, 0, 0, 0]);
		expect(rows[0].value).toBe(99);
		expect(rows[1].value).toBe(0);
		expect(rows[2].value).toBe(0);
	});
});

describe('vanguardProtocol — extractPowerMetrics', () => {
	it('returns xG and passing metrics from nested technical object', () => {
		const m = extractPowerMetrics({
			technical: { xg: 1.42, pass_accuracy: '87%', passing: 92 },
		});
		const keys = m.map((x) => x.key);
		expect(keys).toContain('xg');
		expect(keys).toContain('pass_accuracy');
		expect(keys).toContain('passing');
	});

	it('returns empty array when stats are null', () => {
		expect(extractPowerMetrics(null)).toEqual([]);
	});
});

describe('vanguardProtocol — hasVanguardTelemetry', () => {
	it('is false for all-zero prism', () => {
		expect(hasVanguardTelemetry([0, 0, 0, 0, 0, 0])).toBe(false);
	});

	it('is true when any axis is non-zero', () => {
		expect(hasVanguardTelemetry([0, 12, 0, 0, 0, 0])).toBe(true);
	});
});
