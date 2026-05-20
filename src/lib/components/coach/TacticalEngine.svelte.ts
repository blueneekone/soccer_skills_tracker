/**
 * TacticalEngine — thin factory façade for the War Room brain.
 * Heavy persistence, drawing, and playback logic live in
 * `$lib/states/war-room/tacticalWarRoom.svelte.ts`.
 */
export {
	createTacticalWarRoom,
	type TacticalGridHost,
	type TacticalWarRoomModel,
} from '$lib/states/war-room/tacticalWarRoom.svelte.js';
