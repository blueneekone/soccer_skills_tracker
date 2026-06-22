import {
	collection,
	getDocs,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';
import { categoryToAttributeId, loadTeamDrillsForIntent } from '$lib/coach/teamDrillLibrary.js';
import { loadPlatformBasics } from '$lib/coach/platformDrillLibrary.js';
import {
	attributeIdToWorkoutFocus,
	type WorkoutFocus,
} from '$lib/player/workout/coachMissionFlow.js';

export type { WorkoutFocus };

export const WORKOUT_FOCUS_AREAS = [
	{ id: 'technical' as const, label: 'Technical', op: 'OP-TECH' },
	{ id: 'physical' as const, label: 'Physical', op: 'OP-PHY' },
	{ id: 'tactical' as const, label: 'Tactical', op: 'OP-TAC' },
	{ id: 'recovery' as const, label: 'Recovery', op: 'OP-RCV' },
];

/** Last-resort titles when Firestore catalogs are empty or unreadable. */
export const FALLBACK_DRILLS_BY_FOCUS: Record<WorkoutFocus, string[]> = {
	technical: ['Juggling', 'First Touch', 'Shooting', 'Wall Passing', 'Cone Dribbling'],
	physical: ['100m Sprints', 'Beep Test', '5k Run', 'Agility Ladder', 'Weight Training'],
	tactical: ['Film Study', 'Set Pieces', 'Scrimmage', 'Positional Drills', 'Box-to-Box'],
	recovery: ['Stretching', 'Yoga', 'Foam Rolling', 'Light Jog', 'Ice Bath'],
};

const FOCUS_ATTRIBUTE_IDS: Record<WorkoutFocus, string[]> = {
	technical: ['ball_mastery', 'dribbling', 'first_touch', 'technical', 'striking'],
	physical: ['pace', 'physical', 'strength', 'grit', 'stamina'],
	tactical: ['scanning', 'tactical', 'vision'],
	recovery: ['recovery'],
};

function drillDocTitle(data: Record<string, unknown>): string {
	if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
	if (typeof data.name === 'string' && data.name.trim()) return data.name.trim();
	return '';
}

/**
 * Load drill titles for a focus band — team → club → platform → global_drills,
 * falling back to authored defaults when nothing resolves.
 */
export async function loadDrillTitlesForFocus(
	firestore: Firestore,
	focus: WorkoutFocus,
	opts: { teamId?: string; clubId?: string; sportId?: string; attributeId?: string } = {},
): Promise<string[]> {
	const seen = new Set<string>();
	const add = (title: string) => {
		const t = title.trim();
		if (t) seen.add(t);
	};

	const attrIds =
		opts.attributeId?.trim() ?
			[opts.attributeId.trim()]
		:	FOCUS_ATTRIBUTE_IDS[focus];
	const teamId = String(opts.teamId || '').trim();
	const clubId = String(opts.clubId || '').trim();
	const sportId = (opts.sportId || 'soccer').trim();

	if (teamId && teamId !== 'admin') {
		for (const attrId of attrIds.slice(0, 4)) {
			try {
				const rows = await loadTeamDrillsForIntent(firestore, teamId, {
					attributeId: attrId,
					clubId: clubId || undefined,
				});
				for (const row of rows) add(row.title);
			} catch {
				// Team/club library optional.
			}
		}
	}

	try {
		const platform = await loadPlatformBasics(firestore, sportId);
		for (const row of platform) {
			if (attrIds.includes(categoryToAttributeId(row.category))) {
				add(row.title);
			}
		}
	} catch {
		// Platform basics optional.
	}

	for (const attrId of attrIds.slice(0, 4)) {
		try {
			const snap = await getDocs(
				query(collection(firestore, 'global_drills'), where('attributeId', '==', attrId)),
			);
			for (const docSnap of snap.docs) {
				add(drillDocTitle(docSnap.data() as Record<string, unknown>));
			}
		} catch {
			// global_drills last resort.
		}
	}

	if (seen.size === 0) {
		for (const title of FALLBACK_DRILLS_BY_FOCUS[focus]) add(title);
	}

	return [...seen].sort((a, b) => a.localeCompare(b));
}
