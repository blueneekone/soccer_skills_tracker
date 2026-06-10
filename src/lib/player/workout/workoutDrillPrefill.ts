import type { Firestore } from 'firebase/firestore';
import { TAXONOMY_BY_ID } from '$lib/data/skillTree/physicalSnowflakeTaxonomy.js';
import {
	scoutsSixToAttributeId,
	scoutsSixToWorkoutFocus,
} from '$lib/data/skillTree/scoutsSixWorkoutBridge.js';
import {
	loadDrillTitlesForFocus,
	type WorkoutFocus,
} from '$lib/player/workout/focusDrillCatalog.js';
import { resolveHeuristicDrill } from '$lib/player/workout/coachMissionFlow.js';

export type WorkoutDrillPrefill = {
	focus?: WorkoutFocus;
	drillTitle?: string;
};

export function parseWorkoutFocusParam(raw: string | null): WorkoutFocus | undefined {
	if (raw === 'technical' || raw === 'physical' || raw === 'tactical' || raw === 'recovery') {
		return raw;
	}
	return undefined;
}

/** Resolve skill-tree / URL drill prefill for Train page (free-log sessions only). */
export async function resolveWorkoutDrillPrefill(
	firestore: Firestore,
	params: URLSearchParams,
): Promise<WorkoutDrillPrefill | null> {
	const focusParam = parseWorkoutFocusParam(params.get('focus'));
	const skillNode = params.get('skillNode');
	const drillTitleParam = params.get('drillTitle')?.trim();

	if (!focusParam && !skillNode && !drillTitleParam) return null;

	const result: WorkoutDrillPrefill = {};
	if (focusParam) result.focus = focusParam;

	if (skillNode && TAXONOMY_BY_ID[skillNode]) {
		const node = TAXONOMY_BY_ID[skillNode];
		result.focus = scoutsSixToWorkoutFocus(node.parentAttr);
		const drill = await resolveHeuristicDrill(firestore, scoutsSixToAttributeId(node.parentAttr));
		if (drill?.title) result.drillTitle = drill.title;
	} else if (drillTitleParam) {
		result.drillTitle = drillTitleParam;
	}

	return result;
}

export async function fetchWorkoutDrillTitles(
	firestore: Firestore,
	focus: WorkoutFocus,
	teamId: string,
): Promise<string[]> {
	return loadDrillTitlesForFocus(firestore, focus, { teamId: teamId.trim() });
}

export function workoutPrefillParamsPresent(params: URLSearchParams): boolean {
	if (parseWorkoutFocusParam(params.get('focus'))) return true;
	if (params.get('skillNode')?.trim()) return true;
	if (params.get('drillTitle')?.trim()) return true;
	return false;
}
