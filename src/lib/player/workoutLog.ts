import type { HttpsCallableResult } from 'firebase/functions';
import { calculateTrainingSessionEarnedXp } from '$lib/gamification/level.js';

export type WorkoutIntensityApi = 'low' | 'medium' | 'high';

export type WorkoutLogBlock =
	| { ok: true }
	| { ok: false; title: string; text: string; icon: 'info' | 'warning' };

export type WorkoutSessionPayload = {
	earnedXP?: number;
	totalXp?: number;
	level?: number;
};

export type WorkoutLogSuccess = {
	earned: number;
	newTotal: number;
	level: number | undefined;
	missionCloseNote: string;
	clearMission: boolean;
	levelUpFrom: number | null;
	levelUpTo: number | null;
};

export function intensityApiFromStep(step: number): WorkoutIntensityApi {
	if (step <= 3) return 'low';
	if (step <= 7) return 'medium';
	return 'high';
}

export function buildWorkoutDrillType(focusLabel: string, selectedDrill: string): string {
	return `[${focusLabel}] ${selectedDrill} (Player workout)`.slice(0, 200);
}

export function validatePlayerWorkoutLog(input: {
	selectedFocus: string | null;
	selectedDrill: string | null;
	logSubmitting: boolean;
	role: string | null | undefined;
	profile: { teamId?: unknown; playerName?: unknown } | null | undefined;
}): WorkoutLogBlock {
	if (!input.selectedFocus || !input.selectedDrill || input.logSubmitting) {
		return { ok: false, title: '', text: '', icon: 'info' };
	}
	if (input.role !== 'player') {
		return {
			ok: false,
			title: 'Players only',
			text: 'Use the parent workout log for your player.',
			icon: 'info',
		};
	}
	if (!input.profile?.teamId || !input.profile?.playerName) {
		return {
			ok: false,
			title: 'Profile incomplete',
			text: 'Team and player name are required.',
			icon: 'warning',
		};
	}
	return { ok: true };
}

async function persistPlayerOsWorkout(input: {
	email: string;
	userUid: string;
	teamId: string;
	focusLabel: string;
	selectedDrill: string;
	duration: number;
	intensity: number;
	earnedXp: number;
	writePlayerOsWorkout: (args: {
		emailKey: string;
		userUid: string;
		teamId: string;
		focus: string;
		drill: string;
		duration: number;
		intensityRpe: number;
		earnedXp: number;
	}) => Promise<void>;
}): Promise<void> {
	try {
		await input.writePlayerOsWorkout({
			emailKey: input.email.toLowerCase(),
			userUid: input.userUid,
			teamId: input.teamId,
			focus: input.focusLabel,
			drill: input.selectedDrill,
			duration: Math.max(0, Math.floor(Number(input.duration) || 0)),
			intensityRpe: input.intensity,
			earnedXp: input.earnedXp,
		});
	} catch (we) {
		console.error('[Player OS] users/', input.email.toLowerCase(), '/workouts', we);
	}
}

function stashXpPulse(fromTotal: number, toTotal: number): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(
		'elite_xp_pulse',
		JSON.stringify({ fromTotal: Math.max(0, fromTotal), toTotal }),
	);
}

async function finalizeWorkoutMission(input: {
	playerUid: string;
	userKey: string;
	activeMissionId: string | null;
	earned: number;
	focusLabel: string;
	selectedDrill: string;
	oldLevel: number;
	payloadLevel: number | undefined;
	commitWorkoutCompletion: (args: {
		playerUid: string;
		userKey: string;
		missionId?: string;
		xpAwarded: number;
		reason: string;
		incrementXp: boolean;
	}) => Promise<unknown>;
	dopamineOnCommit: (promise: Promise<unknown>, meta: { kind: string }) => Promise<unknown>;
}): Promise<{ missionCloseNote: string; clearMission: boolean; levelUpFrom: number | null; levelUpTo: number | null }> {
	let missionCloseNote = '';
	let clearMission = false;
	let levelUpFrom: number | null = null;
	let levelUpTo: number | null = null;

	try {
		await input.dopamineOnCommit(
			input.commitWorkoutCompletion({
				playerUid: input.playerUid,
				userKey: input.userKey,
				missionId: input.activeMissionId ?? undefined,
				xpAwarded: input.earned,
				reason: `Workout — ${input.focusLabel} · ${input.selectedDrill}`,
				incrementXp: false,
			}),
			{ kind: 'drill' },
		);
		if (input.activeMissionId) clearMission = true;
		if (typeof input.payloadLevel === 'number' && input.payloadLevel > input.oldLevel) {
			levelUpFrom = input.oldLevel;
			levelUpTo = input.payloadLevel;
		}
	} catch (me) {
		console.error('[Player OS] workout completion batch failed', me);
		if (input.activeMissionId) {
			missionCloseNote = ' | Directive not cleared in Firestore (retry or ask staff).';
		}
	}

	return { missionCloseNote, clearMission, levelUpFrom, levelUpTo };
}

/** Persists workout via Cloud Function, Player OS mirror, and mission completion batch. */
export async function executePlayerWorkoutLog(deps: {
	drillType: string;
	durationMin: number;
	intensityCall: WorkoutIntensityApi;
	focusLabel: string;
	selectedDrill: string;
	activeMissionId: string | null;
	totalXpHud: number;
	oldLevel: number;
	intensityStep: number;
	authUser: { uid: string; email?: string | null };
	profile: { teamId?: unknown; playerName?: unknown };
	logTrainingSession: (data: {
		drillType: string;
		duration: number;
		reps: number;
		intensity: WorkoutIntensityApi;
	}) => Promise<HttpsCallableResult<WorkoutSessionPayload>>;
	writePlayerOsWorkout: (args: {
		emailKey: string;
		userUid: string;
		teamId: string;
		focus: string;
		drill: string;
		duration: number;
		intensityRpe: number;
		earnedXp: number;
	}) => Promise<void>;
	commitWorkoutCompletion: (args: {
		playerUid: string;
		userKey: string;
		missionId?: string;
		xpAwarded: number;
		reason: string;
		incrementXp: boolean;
	}) => Promise<unknown>;
	dopamineOnCommit: (promise: Promise<unknown>, meta: { kind: string }) => Promise<unknown>;
}): Promise<WorkoutLogSuccess> {
	const res = await deps.logTrainingSession({
		drillType: deps.drillType,
		duration: deps.durationMin,
		reps: 0,
		intensity: deps.intensityCall,
	});
	const payload = res.data;
	const earned = payload && typeof payload.earnedXP === 'number' ? payload.earnedXP : 0;
	const newTotal =
		payload && typeof payload.totalXp === 'number' ? payload.totalXp : deps.totalXpHud + earned;

	const em = deps.authUser.email;
	if (em && deps.profile?.teamId) {
		await persistPlayerOsWorkout({
			email: em,
			userUid: deps.authUser.uid,
			teamId: String(deps.profile.teamId),
			focusLabel: deps.focusLabel,
			selectedDrill: deps.selectedDrill,
			duration: deps.durationMin,
			intensity: deps.intensityStep,
			earnedXp: earned,
			writePlayerOsWorkout: deps.writePlayerOsWorkout,
		});
	}

	stashXpPulse(Math.max(0, newTotal - earned), newTotal);

	const playerUid = deps.authUser.uid;
	const userKey = (deps.authUser.email ?? '').toLowerCase();
	let missionCloseNote = '';
	let clearMission = false;
	let levelUpFrom: number | null = null;
	let levelUpTo: number | null = null;

	if (playerUid && userKey) {
		const fin = await finalizeWorkoutMission({
			playerUid,
			userKey,
			activeMissionId: deps.activeMissionId,
			earned,
			focusLabel: deps.focusLabel,
			selectedDrill: deps.selectedDrill,
			oldLevel: deps.oldLevel,
			payloadLevel: payload?.level,
			commitWorkoutCompletion: deps.commitWorkoutCompletion,
			dopamineOnCommit: deps.dopamineOnCommit,
		});
		missionCloseNote = fin.missionCloseNote;
		clearMission = fin.clearMission;
		levelUpFrom = fin.levelUpFrom;
		levelUpTo = fin.levelUpTo;
	}

	return {
		earned,
		newTotal,
		level: payload?.level,
		missionCloseNote,
		clearMission,
		levelUpFrom,
		levelUpTo,
	};
}

export function expectedWorkoutXp(durationMin: number, intensityStep: number): number {
	return calculateTrainingSessionEarnedXp({
		duration: Math.max(0, Math.floor(Number(durationMin) || 0)),
		reps: 0,
		intensity: intensityApiFromStep(intensityStep),
	});
}

export function workoutLogErrorMessage(err: unknown): string {
	return err && typeof err === 'object' && 'message' in err ?
			String((err as { message: unknown }).message)
		:	'Could not log workout.';
}
