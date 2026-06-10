import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';
import {
	attributeIdToWorkoutFocus,
	type WorkoutFocus,
} from '$lib/player/workout/coachMissionFlow.js';

/** Maps ScoutsSix branch → RL / global_drills attribute id. */
export const SCOUTS_SIX_ATTRIBUTE_ID: Record<keyof ScoutsSix, string> = {
	PAC: 'pace',
	ACC: 'pace',
	POW: 'strength',
	VAN: 'scanning',
	STM: 'stamina',
	AGI: 'grit',
};

export function scoutsSixToAttributeId(attr: keyof ScoutsSix): string {
	return SCOUTS_SIX_ATTRIBUTE_ID[attr] ?? 'ball_mastery';
}

export function scoutsSixToWorkoutFocus(attr: keyof ScoutsSix): WorkoutFocus {
	return attributeIdToWorkoutFocus(scoutsSixToAttributeId(attr));
}
