import { browser } from '$app/environment';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import {
	TRAIN_READINESS_DEFAULTS,
	todayUtcDateString,
	type TrainReadinessInput,
} from '$lib/player/workout/trainReadiness.js';

/** Daily physio strip on Train — shown until physio_self_reports exists for UTC day. */
export function useTrainReadinessStrip(
	getUid: () => string | undefined,
	getRole: () => string | null | undefined,
) {
	let showReadinessStrip = $state(false);
	let readinessSleepHours = $state(TRAIN_READINESS_DEFAULTS.sleepHoursLastNight);
	let readinessSoreness = $state(TRAIN_READINESS_DEFAULTS.soreness);
	let readinessMood = $state(TRAIN_READINESS_DEFAULTS.mood);
	let readinessRestingFeel = $state(TRAIN_READINESS_DEFAULTS.restingFeel);

	$effect(() => {
		if (!browser) {
			showReadinessStrip = false;
			return;
		}
		const uid = getUid();
		if (!uid || getRole() !== 'player') {
			showReadinessStrip = false;
			return;
		}
		const ref = doc(db, 'physio_self_reports', uid, 'daily', todayUtcDateString());
		return onSnapshot(
			ref,
			(snap) => {
				showReadinessStrip = !snap.exists();
			},
			() => {
				showReadinessStrip = false;
			},
		);
	});

	function physioForTransmit(): TrainReadinessInput | undefined {
		if (!showReadinessStrip) return undefined;
		return {
			sleepHoursLastNight: readinessSleepHours,
			soreness: readinessSoreness,
			mood: readinessMood,
			restingFeel: readinessRestingFeel,
		};
	}

	return {
		get showReadinessStrip() {
			return showReadinessStrip;
		},
		get readinessSleepHours() {
			return readinessSleepHours;
		},
		set readinessSleepHours(v: number) {
			readinessSleepHours = v;
		},
		get readinessSoreness() {
			return readinessSoreness;
		},
		set readinessSoreness(v: number) {
			readinessSoreness = v;
		},
		get readinessMood() {
			return readinessMood;
		},
		set readinessMood(v: number) {
			readinessMood = v;
		},
		get readinessRestingFeel() {
			return readinessRestingFeel;
		},
		set readinessRestingFeel(v: number) {
			readinessRestingFeel = v;
		},
		physioForTransmit,
	};
}
