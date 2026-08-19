import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { IntentEngine } from '../IntentEngine.svelte.ts';

vi.mock('firebase/firestore', async () => {
	const actual = await vi.importActual('firebase/firestore');
	return {
		...actual,
		collection: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		onSnapshot: vi.fn(() => vi.fn())
	};
});

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn(),
	auth: {},
	db: {}
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn()
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		isAuthenticated: true,
		user: { uid: 'test-user' }
	}
}));

describe('IntentEngine Physiological Feedback Loop', () => {
	let engine: IntentEngine;

	beforeEach(() => {
		engine = new IntentEngine();
		vi.clearAllMocks();
	});

	it('asserts that isFirestoreReady() gates all state hydration listeners', () => {
		vi.mocked(isFirestoreReady).mockReturnValue(false);
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		engine.connect('team-abc');

		expect(getActiveDb).not.toHaveBeenCalled();
		expect(engine.isLoading).toBe(false);

		vi.mocked(isFirestoreReady).mockReturnValue(true);
		engine.connect('team-abc');

		expect(getActiveDb).toHaveBeenCalled();
		expect(engine.isLoading).toBe(true);
	});

	it('mocks input heart-rate arrays showing acute cardiac fatigue and asserts drill volume decrements mathematically', () => {
		// Player with base volume of 100 reps, target recovery of 30 bpm
		engine.players = [
			{
				uid: 'player-fatigued',
				playerName: 'John Doe',
				baseDrillVolume: 100,
				targetRecovery: 30,
				heartRates: [
					{ bpm: 120, timestamp: 10 },
					{ bpm: 180, timestamp: 60 }, // Peak HR
					{ bpm: 170, timestamp: 90 },
					{ bpm: 160, timestamp: 120 } // Min HR after peak -> recovery = 180 - 160 = 20 bpm (below 30 target)
				]
			}
		];

		const metrics = engine.playerMetrics;
		expect(metrics).toHaveLength(1);
		const p = metrics[0];

		expect(p.actualRecovery).toBe(20);
		expect(p.isFatigued).toBe(true);
		// 15% reduction from 100 is 85
		expect(p.adjustedDrillVolume).toBe(85);
		// workload fatigue coefficient should be > 1.0 (deficiency of 10 bpm relative to 30 bpm target)
		expect(p.workloadFatigueCoefficient).toBe(1.3333);
	});

	it('verifies that players with healthy recovery maintain their base drill volumes', () => {
		// Player with base volume of 100 reps, target recovery of 30 bpm
		engine.players = [
			{
				uid: 'player-healthy',
				playerName: 'Jane Doe',
				baseDrillVolume: 100,
				targetRecovery: 30,
				heartRates: [
					{ bpm: 120, timestamp: 10 },
					{ bpm: 180, timestamp: 60 }, // Peak HR
					{ bpm: 150, timestamp: 90 },
					{ bpm: 140, timestamp: 120 } // Min HR after peak -> recovery = 180 - 140 = 40 bpm (above 30 target)
				]
			}
		];

		const metrics = engine.playerMetrics;
		expect(metrics).toHaveLength(1);
		const p = metrics[0];

		expect(p.actualRecovery).toBe(40);
		expect(p.isFatigued).toBe(false);
		expect(p.adjustedDrillVolume).toBe(100);
		expect(p.workloadFatigueCoefficient).toBe(1.0);
	});

	it('tracks player heart-rate velocity in Hz', () => {
		engine.players = [
			{
				uid: 'player-vel',
				playerName: 'Sprint Star',
				baseDrillVolume: 80,
				targetRecovery: 25,
				heartRates: [
					{ bpm: 120, timestamp: 10 } // 120 bpm = 2.0 Hz
				]
			}
		];

		let metrics = engine.playerMetrics;
		expect(metrics[0].heartRateVelocityHz).toBe(2.0);

		// Update to 150 bpm -> 2.5 Hz
		engine.players[0].heartRates.push({ bpm: 150, timestamp: 20 });
		metrics = engine.playerMetrics;
		expect(metrics[0].heartRateVelocityHz).toBe(2.5);
	});
});
