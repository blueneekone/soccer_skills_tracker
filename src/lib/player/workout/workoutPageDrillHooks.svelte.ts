import type { Firestore } from 'firebase/firestore';
import { browser } from '$app/environment';
import type { WorkoutFocus } from '$lib/player/workout/focusDrillCatalog.js';
import {
	fetchWorkoutDrillTitles,
	resolveWorkoutDrillPrefill,
	workoutPrefillParamsPresent,
} from '$lib/player/workout/workoutDrillPrefill.js';

type PrefillSetters = {
	setFocus: (focus: WorkoutFocus) => void;
	setDrill: (title: string) => void;
};

/** Reactive drill catalog for Train / parent proxy surfaces. */
export function useWorkoutDrillCatalog(
	getFocus: () => WorkoutFocus,
	getTeamId: () => string,
	firestore: Firestore,
) {
	let availableDrills = $state<string[]>([]);
	let drillsLoading = $state(false);

	$effect(() => {
		const focus = getFocus();
		const teamId = getTeamId();
		let cancelled = false;
		drillsLoading = true;
		fetchWorkoutDrillTitles(firestore, focus, teamId)
			.then((titles) => {
				if (!cancelled) availableDrills = titles;
			})
			.catch((e) => {
				console.error('[workout drill catalog]', e);
				if (!cancelled) availableDrills = [];
			})
			.finally(() => {
				if (!cancelled) drillsLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	return {
		get availableDrills() {
			return availableDrills;
		},
		get drillsLoading() {
			return drillsLoading;
		},
	};
}

/** Apply skill-tree / URL drill prefill once per page load (free-log only). */
export function useWorkoutSkillTreePrefill(
	getSearchParams: () => URLSearchParams,
	getCoachDirected: () => boolean,
	firestore: Firestore,
	setters: PrefillSetters,
) {
	let prefillDone = $state(false);

	$effect(() => {
		if (!browser || prefillDone || getCoachDirected()) return;
		const params = getSearchParams();
		if (!workoutPrefillParamsPresent(params)) return;
		prefillDone = true;
		let cancelled = false;
		void resolveWorkoutDrillPrefill(firestore, params).then((prefill) => {
			if (cancelled || !prefill) return;
			if (prefill.focus) setters.setFocus(prefill.focus);
			if (prefill.drillTitle) setters.setDrill(prefill.drillTitle);
		});
		return () => {
			cancelled = true;
		};
	});
}
