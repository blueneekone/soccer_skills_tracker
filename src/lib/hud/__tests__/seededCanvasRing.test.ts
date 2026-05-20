import { describe, expect, it } from 'vitest';
import { drawSeededProgressRing, hashUidSeed, ringArcFromSeed } from '../seededCanvasRing.js';

describe('seededCanvasRing', () => {
	it('hashUidSeed is deterministic per UID', () => {
		expect(hashUidSeed('player-abc')).toBe(hashUidSeed('player-abc'));
		expect(hashUidSeed('player-abc')).not.toBe(hashUidSeed('player-xyz'));
	});

	it('ringArcFromSeed maps fill to sweep proportionally', () => {
		const half = ringArcFromSeed('uid-1', 0.5);
		const full = ringArcFromSeed('uid-1', 1);
		expect(half.sweep).toBeCloseTo(Math.PI, 5);
		expect(full.sweep).toBeCloseTo(Math.PI * 2, 5);
	});

	it('drawSeededProgressRing invokes canvas arc strokes', () => {
		const calls: string[] = [];
		const ctx = {
			clearRect: () => calls.push('clear'),
			beginPath: () => calls.push('begin'),
			arc: () => calls.push('arc'),
			stroke: () => calls.push('stroke'),
			save: () => calls.push('save'),
			restore: () => calls.push('restore'),
			strokeStyle: '',
			lineWidth: 0,
			lineCap: '',
			shadowColor: '',
			shadowBlur: 0,
		} as unknown as CanvasRenderingContext2D;

		drawSeededProgressRing({
			ctx,
			cx: 28,
			cy: 28,
			radius: 22,
			lineWidth: 4,
			fill: 0.75,
			uid: 'test-player',
			timeMs: 1000,
		});

		expect(calls.filter((c) => c === 'arc').length).toBeGreaterThanOrEqual(2);
		expect(calls).toContain('stroke');
	});
});
