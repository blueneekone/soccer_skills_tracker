// See https://svelte.dev/docs/kit/types#app.d.ts
/// <reference types="@sveltejs/kit" />

import type { MissionHandoff } from '$lib/player/workout/coachMissionFlow.js';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			missionHandoff?: MissionHandoff;
		}
		// interface Platform {}
	}
}

export {};
