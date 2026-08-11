import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentEngine } from '$lib/coach/intent/IntentEngine.svelte.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { getActiveDb } from '$lib/firebase.js';

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn(() => false)
}));

vi.mock('$lib/firebase.js', () => ({
	db: {},
	functions: {},
	getActiveDb: vi.fn()
}));

vi.mock('firebase/firestore', async () => {
	const actual = await vi.importActual('firebase/firestore');
	return {
		...actual,
		collection: vi.fn(),
		doc: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn(),
		onSnapshot: vi.fn(() => vi.fn()),
		getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
		getDocs: vi.fn().mockResolvedValue({ docs: [] })
	};
});

vi.mock('$lib/config/sports.js', () => ({
	getRpgSportConfig: vi.fn(() => ({
		attributes: [
			{ id: 'pace', name: 'Pace', hexColor: '#14b8a6' }
		]
	}))
}));

describe('IntentEngine Physiological Feedback & Hydration Guard Tests', () => {
	let engine: IntentEngine;

	beforeEach(() => {
		vi.clearAllMocks();
		engine = new IntentEngine();
	});

	describe('Physiological Feedback Loop Calculations', () => {
		it('should have default state representing no fatigue with empty heart rate array', () => {
			expect(engine.playerHeartRates).toEqual([]);
			expect(engine.heartRateHz).toBe(0);
			expect(engine.heartRateVelocity).toBe(0);
			expect(engine.heartRateRecovery).toBe(0);
			expect(engine.workloadFatigueCoefficient).toBe(0);
			expect(engine.volumeScaleFactor).toBe(1.0);
			expect(engine.adjustedPrescriptionSets).toBe(engine.draftPrescriptionSets);
			expect(engine.adjustedPrescriptionReps).toBe(engine.draftPrescriptionRepsPerSet);
		});

		it('should calculate correct average heart rate Hz and velocity', () => {
			// Heart rate of 120 bpm is 2.0 Hz.
			engine.playerHeartRates = [120, 150];

			// Avg BPM is 135 bpm. Hz = 135 / 60 = 2.25 Hz.
			expect(engine.heartRateHz).toBeCloseTo(2.25);

			// Rate of change in Hz (beats per second)
			// velocity = (150 - 120) / 60 / 1 = 0.5 Hz
			expect(engine.heartRateVelocity).toBeCloseTo(0.5);
		});

		it('should correctly calculate heart-rate recovery', () => {
			// Peak of 160, final of 100. Recovery = 60 bpm.
			engine.playerHeartRates = [110, 160, 140, 100];
			expect(engine.heartRateRecovery).toBe(60);
		});

		it('should apply 15% reduction in drill volume if recovery is below threshold (acute cardiac fatigue)', () => {
			engine.draftPrescriptionSets = 10;
			engine.draftPrescriptionRepsPerSet = 20;
			engine.heartRateRecoveryThreshold = 15;

			// Peak is 160, final is 150. Recovery = 10 bpm (below threshold of 15).
			engine.playerHeartRates = [140, 160, 155, 150];

			expect(engine.heartRateRecovery).toBe(10);
			expect(engine.volumeScaleFactor).toBe(0.85);

			// Derived targets scale down by 15%
			// sets: 10 * 0.85 = 8.5 -> round to 9
			expect(engine.adjustedPrescriptionSets).toBe(9);
			// reps: 20 * 0.85 = 17 -> round to 17
			expect(engine.adjustedPrescriptionReps).toBe(17);

			// Verify that buildDeployPrescription outputs are adjusted as well
			const prescription = engine.buildDeployPrescription();
			expect(prescription.sets).toBe(9);
			expect(prescription.repsPerSet).toBe(17);
		});

		it('should not scale down drill volumes if recovery meets or exceeds threshold', () => {
			engine.draftPrescriptionSets = 10;
			engine.draftPrescriptionRepsPerSet = 20;
			engine.heartRateRecoveryThreshold = 15;

			// Peak is 160, final is 140. Recovery = 20 bpm (above threshold of 15).
			engine.playerHeartRates = [140, 160, 150, 140];

			expect(engine.heartRateRecovery).toBe(20);
			expect(engine.volumeScaleFactor).toBe(1.0);

			expect(engine.adjustedPrescriptionSets).toBe(10);
			expect(engine.adjustedPrescriptionReps).toBe(20);

			const prescription = engine.buildDeployPrescription();
			expect(prescription.sets).toBe(10);
			expect(prescription.repsPerSet).toBe(20);
		});

		it('should compute continuous workload fatigue coefficient correctly', () => {
			engine.heartRateRecoveryThreshold = 15;

			// Peak of 160, final of 150 -> Recovery = 10 bpm (Deficit of 5)
			// Avg BPM = (140 + 160 + 150) / 3 = 150 bpm
			// workloadFatigueCoefficient = (150 / 100) * (1 + 5 / 10) = 1.5 * 1.5 = 2.25
			engine.playerHeartRates = [140, 160, 150];
			expect(engine.workloadFatigueCoefficient).toBeCloseTo(2.25);
		});
	});

	describe('Firestore Readiness Hydration Guard Gates', () => {
		it('should block intents subscription if firestore is not ready', () => {
			vi.mocked(isFirestoreReady).mockReturnValue(false);

			engine.connect('team-123', 'tenant-123', 'club-123', 'soccer');

			expect(engine.isLoadingIntents).toBe(false);
			expect(engine.isLoadingRoster).toBe(false);
		});

		it('should proceed with subscriptions and fetches if firestore is ready', () => {
			vi.mocked(isFirestoreReady).mockReturnValue(true);

			engine.connect('team-123', 'tenant-123', 'club-123', 'soccer');

			expect(engine.isLoadingIntents).toBe(true);
			expect(engine.isLoadingRoster).toBe(true);
		});
	});
});
