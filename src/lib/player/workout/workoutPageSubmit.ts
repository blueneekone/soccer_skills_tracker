import { ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import type { HttpsCallable } from 'firebase/functions';
import { storage } from '$lib/firebase.js';
import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
import {
	buildWorkoutDrillType,
	executePlayerWorkoutLog,
	expectedWorkoutXp,
	intensityApiFromStep,
	validatePlayerWorkoutLog,
	workoutLogErrorMessage,
} from '$lib/player/workoutLog.js';
import {
	clampFreeLogDurationMinutes,
	coachCadenceLogSuccessSuffix,
	FREE_LOG_DURATION_MAX_MINUTES,
} from '$lib/player/workout/workoutSessionConstants.js';
import type { MissionHandoff } from '$lib/player/workout/coachMissionFlow.js';
import type { PrescriptionDrillEntry } from '$lib/types/intent.js';
import type { TrainReadinessInput } from '$lib/player/workout/trainReadiness.js';

export const PROOF_IMAGE_MAX = 10 * 1024 * 1024;
export const PROOF_VIDEO_MAX = 50 * 1024 * 1024;

export function validateProofMediaFile(file: File): string | null {
	if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
		return 'Only images and video files are supported.';
	}
	if (file.type.startsWith('image/') && file.size > PROOF_IMAGE_MAX) {
		return 'Image must be under 10 MB.';
	}
	if (file.type.startsWith('video/') && file.size > PROOF_VIDEO_MAX) {
		return 'Video must be under 50 MB.';
	}
	return null;
}

export type ProofSubmitInput = {
	pendingProofIntentId: string;
	proofNote: string;
	proofMediaFile: File | null;
	playerUid: string;
	householdId: string;
	submitCompletionProof: HttpsCallable<
		{ intentId: string; proofNote: string | null; mediaStoragePath: string | null },
		unknown
	>;
	onUploadProgress: (pct: number) => void;
	onMediaError: (msg: string) => void;
};

export async function runSendCompletionProof(input: ProofSubmitInput): Promise<void> {
	const trimmed = input.proofNote.trim().slice(0, 500);
	let mediaStoragePath: string | null = null;
	let proofMediaFile = input.proofMediaFile;

	if (proofMediaFile) {
		const { playerUid, householdId } = input;
		if (!playerUid || !householdId) {
			input.onMediaError('Profile incomplete — media attachment skipped.');
			proofMediaFile = null;
		} else {
			const mediaId = crypto.randomUUID();
			const ext = proofMediaFile.name.split('.').pop() ?? 'bin';
			const storagePath = `households/${householdId}/proof_media/${playerUid}/${mediaId}.${ext}`;
			const fileRef = storageRef(storage, storagePath);
			const uploadTask = uploadBytesResumable(fileRef, proofMediaFile);
			await new Promise<void>((resolve, reject) => {
				uploadTask.on(
					'state_changed',
					(snap) => {
						input.onUploadProgress(
							Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
						);
					},
					(err) => {
						input.onMediaError('Media upload failed — proof will be sent as note-only.');
						console.error('[B4c] upload error', err);
						reject(err);
					},
					() => resolve(),
				);
			}).catch(() => {
				proofMediaFile = null;
			});

			if (proofMediaFile) {
				mediaStoragePath = storagePath;
			}
		}
	}

	await input.submitCompletionProof({
		intentId: input.pendingProofIntentId,
		proofNote: trimmed || null,
		mediaStoragePath,
	});
}

export type DiegeticHandlers = {
	showError: (title: string, message: string) => void;
	showSuccess: (title: string, message: string, opts?: { returnToHq?: boolean }) => void;
};

export function dispatchLevelUp(from: number, to: number, earnedXp: number) {
	window.dispatchEvent(
		new CustomEvent('phoenix:level-up', {
			detail: { from, to, earnedXp },
		}),
	);
}

export function handleBenchmarkSuccessPayload(
	payload: { message: string; levelUp: { from: number; to: number; earned: number } | null },
	diegetic: DiegeticHandlers,
) {
	if (payload.levelUp) {
		dispatchLevelUp(payload.levelUp.from, payload.levelUp.to, payload.levelUp.earned);
	}
	diegetic.showSuccess('Benchmark logged', payload.message, { returnToHq: true });
}

type WorkoutLogDeps = {
	logTrainingSession: Parameters<typeof executePlayerWorkoutLog>[0]['logTrainingSession'];
	writePlayerOsWorkout: Parameters<typeof executePlayerWorkoutLog>[0]['writePlayerOsWorkout'];
	commitWorkoutCompletion: Parameters<typeof executePlayerWorkoutLog>[0]['commitWorkoutCompletion'];
	dopamineOnCommit: Parameters<typeof executePlayerWorkoutLog>[0]['dopamineOnCommit'];
	dopamineOnCallable: (p: Promise<unknown>, opts: { kind: 'drill' }) => void;
	bumpXp: (delta: number) => void;
	refreshProfile: () => Promise<void>;
	recordQuestProgressAfterLog: (handoff: MissionHandoff | null) => void;
	clearArmedMission: () => void;
	armParentProofAfterLog: (missionId: string | null, needsProof: boolean) => void;
};

export type BundleStepContext = WorkoutLogDeps &
	DiegeticHandlers & {
		currentBundleDrill: PrescriptionDrillEntry;
		bundleDrills: PrescriptionDrillEntry[];
		bundleStepIdx: number;
		isFinalBundleStep: boolean;
		lockedCoachDrillLabel: string;
		focusLabel: string;
		duration: number;
		intensity: number;
		sessionNotes: string;
		activeMissionId: string | null;
		armedHandoff: MissionHandoff | null;
		armedDisplayCadence: { sessionsPerWindow: number; windowDays: number } | null | undefined;
		totalXpHud: number;
		profile: Parameters<typeof executePlayerWorkoutLog>[0]['profile'];
		authUser: { uid: string; email: string | null };
		physioForTransmit: () => TrainReadinessInput | undefined;
		setLogSubmitting: (v: boolean) => void;
		setSessionNotes: (v: string) => void;
		incrementBundleStep: () => void;
	};

export async function runLogBundleStep(ctx: BundleStepContext): Promise<void> {
	const drill = ctx.currentBundleDrill;
	const drillName = drill.drillTitle || ctx.lockedCoachDrillLabel || 'Bundle drill';
	const drillType = buildWorkoutDrillType(ctx.focusLabel, drillName);
	const stepSets = drill.sets ?? 1;
	const stepReps = drill.repsPerSet ?? 0;
	const stepBilateral = drill.bilateral === true;
	const stepTotalReps = stepBilateral ? stepSets * stepReps * 2 : stepSets * stepReps;
	const stepDuration = Math.max(
		1,
		drill.targetDurationMin ??
			Math.max(1, Math.floor(ctx.duration / Math.max(1, ctx.bundleDrills.length))),
	);
	const stepRpe = drill.targetRpe ?? ctx.intensity;
	const intensityCall = intensityApiFromStep(stepRpe);
	const expectedXp = expectedWorkoutXp(stepDuration, stepRpe, stepTotalReps);
	const oldLevel = getLevelProgressFromTotalXp(ctx.totalXpHud).level;

	const isLastStep = ctx.isFinalBundleStep;
	const stepMissionId = isLastStep ? ctx.activeMissionId : null;
	const stepMissionSource = isLastStep ? (ctx.armedHandoff?.source ?? null) : null;

	ctx.setLogSubmitting(true);
	ctx.bumpXp(expectedXp);
	try {
		const result = await executePlayerWorkoutLog({
			drillType,
			durationMin: stepDuration,
			totalReps: stepTotalReps,
			intensityCall,
			focusLabel: ctx.focusLabel,
			selectedDrill: drillName,
			activeMissionId: stepMissionId,
			missionSource: stepMissionSource,
			targetAttributeId: ctx.armedHandoff?.targetAttributeId ?? undefined,
			totalXpHud: ctx.totalXpHud,
			oldLevel,
			intensityStep: stepRpe,
			sessionNotes: isLastStep ? ctx.sessionNotes : '',
			physio: isLastStep ? ctx.physioForTransmit() : undefined,
			authUser: ctx.authUser,
			profile: ctx.profile,
			logTrainingSession: ctx.logTrainingSession,
			writePlayerOsWorkout: ctx.writePlayerOsWorkout,
			commitWorkoutCompletion: ctx.commitWorkoutCompletion,
			dopamineOnCommit: ctx.dopamineOnCommit,
		});

		if (isLastStep) {
			const proofIntentId = ctx.activeMissionId;
			const needsProof = ctx.armedHandoff?.requiresParentVerification === true;
			const cadenceWeekNote = coachCadenceLogSuccessSuffix(
				ctx.armedHandoff?.source ?? null,
				ctx.armedDisplayCadence,
			);
			if (result.clearMission) {
				ctx.recordQuestProgressAfterLog(ctx.armedHandoff);
				ctx.clearArmedMission();
			} else {
				ctx.recordQuestProgressAfterLog(null);
			}
			ctx.armParentProofAfterLog(proofIntentId, needsProof);
			if (result.levelUpFrom != null && result.levelUpTo != null) {
				dispatchLevelUp(result.levelUpFrom, result.levelUpTo, result.earned);
			}
			void ctx.dopamineOnCallable(Promise.resolve(result), { kind: 'drill' });
			ctx.showSuccess(
				'Bundle complete',
				`All ${ctx.bundleDrills.length} drills logged · +${result.earned} XP · Level ${result.level ?? '—'}${cadenceWeekNote}`,
				{ returnToHq: true },
			);
			ctx.setSessionNotes('');
			await ctx.refreshProfile();
		} else {
			const newIdx = ctx.bundleStepIdx + 1;
			ctx.incrementBundleStep();
			ctx.showSuccess(
				`Drill ${newIdx} logged`,
				`+${result.earned} XP · Next: ${ctx.bundleDrills[newIdx]?.drillTitle ?? 'Drill ' + (newIdx + 1)}`,
			);
		}
	} catch (e) {
		ctx.bumpXp(-expectedXp);
		console.error(e);
		ctx.showError('Step failed', workoutLogErrorMessage(e));
	} finally {
		ctx.setLogSubmitting(false);
	}
}

export type WorkoutLogContext = WorkoutLogDeps &
	DiegeticHandlers & {
		selectedFocus: string;
		selectedDrill: string | null;
		isCoachDirectedSession: boolean;
		lockedCoachDrillLabel: string;
		logSubmitting: boolean;
		role: string | null | undefined;
		focusLabel: string;
		duration: number;
		intensity: number;
		totalWorkoutReps: number;
		sessionNotes: string;
		activeMissionId: string | null;
		armedHandoff: MissionHandoff | null;
		armedDisplayCadence: { sessionsPerWindow: number; windowDays: number } | null | undefined;
		totalXpHud: number;
		profile: Parameters<typeof executePlayerWorkoutLog>[0]['profile'];
		authUser: { uid: string; email: string | null };
		physioForTransmit: () => TrainReadinessInput | undefined;
		setLogSubmitting: (v: boolean) => void;
		setSessionNotes: (v: string) => void;
	};

export async function runLogWorkout(ctx: WorkoutLogContext): Promise<void> {
	const gate = validatePlayerWorkoutLog({
		selectedFocus: ctx.selectedFocus,
		selectedDrill: ctx.isCoachDirectedSession ? ctx.lockedCoachDrillLabel : ctx.selectedDrill,
		logSubmitting: ctx.logSubmitting,
		role: ctx.role,
		profile: ctx.profile,
	});
	if (gate.ok === false) {
		ctx.showError(gate.title, gate.text);
		return;
	}
	if (!ctx.selectedDrill && !ctx.isCoachDirectedSession) return;

	const drillName = ctx.isCoachDirectedSession ? ctx.lockedCoachDrillLabel : ctx.selectedDrill;
	if (!drillName) return;

	const drillType = buildWorkoutDrillType(ctx.focusLabel, drillName);
	const dMin = ctx.isCoachDirectedSession
		? Math.max(1, Math.min(FREE_LOG_DURATION_MAX_MINUTES, Math.floor(Number(ctx.duration) || 0)))
		: clampFreeLogDurationMinutes(ctx.duration);
	const intensityCall = intensityApiFromStep(ctx.intensity);
	const expectedXp = expectedWorkoutXp(dMin, ctx.intensity, ctx.totalWorkoutReps);
	const oldLevel = getLevelProgressFromTotalXp(ctx.totalXpHud).level;

	const proofIntentId = ctx.activeMissionId;
	const needsProof = ctx.armedHandoff?.requiresParentVerification === true;
	const cadenceWeekNote = coachCadenceLogSuccessSuffix(
		ctx.armedHandoff?.source ?? null,
		ctx.armedDisplayCadence,
	);

	ctx.setLogSubmitting(true);
	ctx.bumpXp(expectedXp);
	try {
		const result = await executePlayerWorkoutLog({
			drillType,
			durationMin: dMin,
			totalReps: ctx.totalWorkoutReps,
			intensityCall,
			focusLabel: ctx.focusLabel,
			selectedDrill: drillName,
			activeMissionId: ctx.activeMissionId,
			missionSource: ctx.armedHandoff?.source ?? null,
			targetAttributeId: ctx.armedHandoff?.targetAttributeId ?? undefined,
			totalXpHud: ctx.totalXpHud,
			oldLevel,
			intensityStep: ctx.intensity,
			sessionNotes: ctx.sessionNotes,
			physio: ctx.physioForTransmit(),
			authUser: ctx.authUser,
			profile: ctx.profile,
			logTrainingSession: ctx.logTrainingSession,
			writePlayerOsWorkout: ctx.writePlayerOsWorkout,
			commitWorkoutCompletion: ctx.commitWorkoutCompletion,
			dopamineOnCommit: ctx.dopamineOnCommit,
		});
		if (result.clearMission) {
			ctx.recordQuestProgressAfterLog(ctx.armedHandoff);
			ctx.clearArmedMission();
		} else {
			ctx.recordQuestProgressAfterLog(null);
		}
		if (result.levelUpFrom != null && result.levelUpTo != null) {
			dispatchLevelUp(result.levelUpFrom, result.levelUpTo, result.earned);
		}
		void ctx.dopamineOnCallable(Promise.resolve(result), { kind: 'drill' });
		ctx.showSuccess(
			'Command executed',
			`+${result.earned} XP · Level ${result.level ?? '—'}${result.missionCloseNote}${cadenceWeekNote}`,
			{ returnToHq: true },
		);
		ctx.armParentProofAfterLog(proofIntentId, needsProof);
		ctx.setSessionNotes('');
		await ctx.refreshProfile();
	} catch (e) {
		ctx.bumpXp(-expectedXp);
		console.error(e);
		ctx.showError('Execution failed', workoutLogErrorMessage(e));
	} finally {
		ctx.setLogSubmitting(false);
	}
}
