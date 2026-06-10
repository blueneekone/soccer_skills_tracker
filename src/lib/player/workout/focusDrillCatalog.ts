import {
	collection,
	getDocs,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';
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
 * Load drill titles for a focus band from global_drills + team library,
 * falling back to authored defaults when nothing resolves.
 */
export async function loadDrillTitlesForFocus(
	firestore: Firestore,
	focus: WorkoutFocus,
	opts: { teamId?: string; attributeId?: string } = {},
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

	for (const attrId of attrIds.slice(0, 4)) {
		try {
			const snap = await getDocs(
				query(collection(firestore, 'global_drills'), where('attributeId', '==', attrId)),
			);
			for (const docSnap of snap.docs) {
				add(drillDocTitle(docSnap.data() as Record<string, unknown>));
			}
		} catch {
			// Rules or offline — continue with other sources.
		}
	}

	const teamId = String(opts.teamId || '').trim();
	if (teamId && teamId !== 'admin') {
		try {
			const snap = await getDocs(collection(firestore, 'teams', teamId, 'drills'));
			for (const docSnap of snap.docs) {
				const data = docSnap.data() as Record<string, unknown>;
				const attr =
					typeof data.attributeId === 'string' ? data.attributeId.trim() : '';
				if (!attr || attributeIdToWorkoutFocus(attr) === focus) {
					add(drillDocTitle(data));
				}
			}
		} catch {
			// Team library optional.
		}
	}

	if (seen.size === 0) {
		for (const title of FALLBACK_DRILLS_BY_FOCUS[focus]) add(title);
	}

	return [...seen].sort((a, b) => a.localeCompare(b));
}
