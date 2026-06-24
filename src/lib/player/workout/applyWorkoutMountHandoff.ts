import {
	clearNonExplicitMissionHandoff,
	readMissionHandoff,
	shouldAutoArmHandoff,
	type MissionHandoff,
} from './coachMissionFlow.js';

/** Resolve explicit handoff for Train mount: nav state first, then sessionStorage. */
export function resolveWorkoutMountHandoff(navHandoff: unknown): MissionHandoff | null {
	const nav = navHandoff as MissionHandoff | null | undefined;
	if (nav?.missionId && shouldAutoArmHandoff(nav)) {
		return nav;
	}
	clearNonExplicitMissionHandoff();
	const stored = readMissionHandoff();
	return shouldAutoArmHandoff(stored) ? stored : null;
}
