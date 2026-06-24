import { describe, expect, it, vi } from 'vitest';
import {
	buildWorkoutDrillType,
	executePlayerWorkoutLog,
	expectedWorkoutXp,
	intensityApiFromStep,
	validatePlayerWorkoutLog,
	workoutLogErrorMessage,
} from '$lib/player/workoutLog.js';

describe('workoutLog', () => {
	it('intensityApiFromStep maps RPE steps to API bands', () => {
		expect(intensityApiFromStep(2)).toBe('low');
		expect(intensityApiFromStep(5)).toBe('medium');
		expect(intensityApiFromStep(9)).toBe('high');
	});

	it('buildWorkoutDrillType caps drill label length', () => {
		const long = 'x'.repeat(300);
		expect(buildWorkoutDrillType('Technical', long)).toHaveLength(200);
	});

	it('validatePlayerWorkoutLog allows VPC-verified teamless players', () => {
		const result = validatePlayerWorkoutLog({
			selectedFocus: 'technical',
			selectedDrill: 'Juggling',
			logSubmitting: false,
			role: 'player',
			profile: { playerName: 'Ace', vpcStatus: 'verified', clubId: 'c1' },
		});
		expect(result.ok).toBe(true);
	});

	it('validatePlayerWorkoutLog blocks teamless player before VPC', () => {
		const result = validatePlayerWorkoutLog({
			selectedFocus: 'technical',
			selectedDrill: 'Juggling',
			logSubmitting: false,
			role: 'player',
			profile: { playerName: 'Ace', vpcStatus: 'pending_parent' },
		});
		expect(result.ok).toBe(false);
	});

	it('validatePlayerWorkoutLog blocks non-players', () => {
		const result = validatePlayerWorkoutLog({
			selectedFocus: 'technical',
			selectedDrill: 'Juggling',
			logSubmitting: false,
			role: 'parent',
			profile: { teamId: 't1', playerName: 'Ace' },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.title).toBe('Players only');
		}
	});

	it('expectedWorkoutXp returns a non-negative integer', () => {
		expect(expectedWorkoutXp(30, 5)).toBeGreaterThanOrEqual(0);
	});

	it('workoutLogErrorMessage extracts Error.message', () => {
		expect(workoutLogErrorMessage(new Error('boom'))).toBe('boom');
		expect(workoutLogErrorMessage('nope')).toBe('Could not log workout.');
	});

	it('workoutLogErrorMessage maps functions/internal to diegetic fallback', () => {
		expect(
			workoutLogErrorMessage({ code: 'functions/internal', message: 'INTERNAL' }),
		).toBe('Transmit failed — try again or ask staff.');
	});

	it('workoutLogErrorMessage passes through failed-precondition server messages', () => {
		expect(
			workoutLogErrorMessage({
				code: 'functions/failed-precondition',
				message: 'Cadence limit: one session per day toward this assignment.',
			}),
		).toBe('Cadence limit: one session per day toward this assignment.');
	});

	it('executePlayerWorkoutLog passes subjectiveRpe 1–10 alongside intensity bucket', async () => {
		let captured: Record<string, unknown> | undefined;
		const logTrainingSession = vi.fn(async (data: Record<string, unknown>) => {
			captured = data;
			return { data: { earnedXP: 42, totalXp: 500, level: 3 } };
		});

		await executePlayerWorkoutLog({
			drillType: '[Technical] Juggling (Player workout)',
			durationMin: 30,
			totalReps: 0,
			intensityCall: 'medium',
			focusLabel: 'Technical',
			selectedDrill: 'Juggling',
			activeMissionId: null,
			missionSource: null,
			totalXpHud: 458,
			oldLevel: 3,
			intensityStep: 7,
			authUser: { uid: 'player-1', email: 'ace@example.com' },
			profile: { teamId: 'team-1', playerName: 'Ace' },
			logTrainingSession,
			writePlayerOsWorkout: vi.fn(),
			commitWorkoutCompletion: vi.fn(),
			dopamineOnCommit: vi.fn(async (p) => p),
		});

		expect(captured?.subjectiveRpe).toBe(7);
		expect(captured?.intensity).toBe('medium');
	});

	it('validatePlayerWorkoutLog returns readable message when drill missing', () => {
		const result = validatePlayerWorkoutLog({
			selectedFocus: 'technical',
			selectedDrill: null,
			logSubmitting: false,
			role: 'player',
			profile: { teamId: 't1', playerName: 'Ace' },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.title).toBe('Select a drill');
			expect(result.text.length).toBeGreaterThan(0);
		}
	});

	it('validatePlayerWorkoutLog returns readable message when focus missing', () => {
		const result = validatePlayerWorkoutLog({
			selectedFocus: null,
			selectedDrill: 'Juggling',
			logSubmitting: false,
			role: 'player',
			profile: { teamId: 't1', playerName: 'Ace' },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.title).toBe('Select a focus area');
		}
	});

	it('buildCoachHomeworkHandoff carries assignment drillId', async () => {
		const { buildCoachHomeworkHandoff } = await import('$lib/player/workout/coachMissionFlow.js');
		const handoff = buildCoachHomeworkHandoff({
			missionId: 'hw-1',
			drillTitle: 'Wall Passing',
			drillId: 'drill-platform-1',
			targetAttributeId: 'ball_mastery',
		});
		expect(handoff.source).toBe('coach_homework');
		expect(handoff.drillId).toBe('drill-platform-1');
		expect(handoff.drillTitle).toBe('Wall Passing');
	});

	it('executePlayerWorkoutLog forwards physio fields for Train readiness strip', async () => {
		let captured: Record<string, unknown> | undefined;
		const logTrainingSession = vi.fn(async (data: Record<string, unknown>) => {
			captured = data;
			return { data: { earnedXP: 42, totalXp: 500, level: 3 } };
		});

		await executePlayerWorkoutLog({
			drillType: '[Technical] Juggling (Player workout)',
			durationMin: 30,
			totalReps: 0,
			intensityCall: 'medium',
			focusLabel: 'Technical',
			selectedDrill: 'Juggling',
			activeMissionId: null,
			missionSource: null,
			totalXpHud: 458,
			oldLevel: 3,
			intensityStep: 7,
			physio: {
				sleepHoursLastNight: 7.5,
				soreness: 2,
				mood: 4,
				restingFeel: 3,
			},
			authUser: { uid: 'player-1', email: 'ace@example.com' },
			profile: { teamId: 'team-1', playerName: 'Ace' },
			logTrainingSession,
			writePlayerOsWorkout: vi.fn(),
			commitWorkoutCompletion: vi.fn(),
			dopamineOnCommit: vi.fn(async (p) => p),
		});

		expect(captured?.sleepHoursLastNight).toBe(7.5);
		expect(captured?.soreness).toBe(2);
		expect(captured?.mood).toBe(4);
		expect(captured?.restingFeel).toBe(3);
	});
});
