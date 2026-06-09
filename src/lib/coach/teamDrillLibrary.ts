/**
 * Drill library tiers (multi-sport):
 *   • Platform basics (`drills/{id}`) — read-only starters per sport; coaches copy to team.
 *   • Team library (`teams/{teamId}/drills`) — coach-authored; Intent Engine deploy source.
 *   • Club shared (`clubs/{clubId}/shared_drills`) — director-curated; coaches recommend via copy.
 *   • RL catalog (`global_drills`) — admin seed for AI inference only; not coach intent deploy.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	type Firestore,
} from 'firebase/firestore';

export type TeamDrillScope = 'team' | 'club';

export type TeamDrillPickerRow = {
	id: string;
	title: string;
	attributeId: string;
	durationMinutes: number;
	scope: TeamDrillScope;
	/** Present when scope === 'club' (director-published). */
	clubId?: string;
};

/** Maps drill library category labels → RPG attribute ids. */
export const DRILL_CATEGORY_TO_ATTRIBUTE: Record<string, string> = {
	'Ball Mastery': 'ball_mastery',
	Finishing: 'striking',
	Passing: 'ball_mastery',
	Dribbling: 'ball_mastery',
	Defending: 'grit',
	Conditioning: 'pace',
	'Set Pieces': 'striking',
	Goalkeeping: 'grit',
	Tactics: 'scanning',
};

/** Spatial designer workout type → attribute id. */
export const DESIGNER_TYPE_TO_ATTRIBUTE: Record<string, string> = {
	foundation: 'ball_mastery',
	cardio: 'pace',
	core: 'grit',
	ball_mastery: 'ball_mastery',
	gameday: 'scanning',
};

export function categoryToAttributeId(category: string, fallback = 'ball_mastery'): string {
	const key = String(category || '').trim();
	return DRILL_CATEGORY_TO_ATTRIBUTE[key] ?? fallback;
}

export function designerTypeToAttributeId(type: string, fallback = 'ball_mastery'): string {
	const key = String(type || '').trim();
	return DESIGNER_TYPE_TO_ATTRIBUTE[key] ?? fallback;
}

function mapTeamDrillDoc(
	id: string,
	data: Record<string, unknown>,
	scope: TeamDrillScope,
	clubId?: string,
): TeamDrillPickerRow {
	const title =
		typeof data.name === 'string' && data.name.trim() ?
			data.name.trim()
		: typeof data.title === 'string' && data.title.trim() ?
			data.title.trim()
		:	'Untitled drill';
	const attributeId =
		typeof data.attributeId === 'string' && data.attributeId.trim() ?
			data.attributeId.trim()
		: categoryToAttributeId(
				typeof data.focusArea === 'string' ? data.focusArea : '',
			);
	const durationMinutes =
		typeof data.durationMinutes === 'number' && data.durationMinutes >= 1 ?
			Math.floor(data.durationMinutes)
		:	10;
	return {
		id,
		title,
		attributeId,
		durationMinutes,
		scope,
		...(clubId ? { clubId } : {}),
	};
}

/** Loads team drills + optional director-published club drills for intent picker. */
export async function loadTeamDrillsForIntent(
	firestore: Firestore,
	teamId: string,
	opts: { attributeId?: string; clubId?: string } = {},
): Promise<TeamDrillPickerRow[]> {
	const tid = teamId.trim();
	if (!tid) return [];

	const rows: TeamDrillPickerRow[] = [];

	try {
		const teamSnap = await getDocs(collection(firestore, 'teams', tid, 'drills'));
		for (const d of teamSnap.docs) {
			rows.push(mapTeamDrillDoc(d.id, d.data() as Record<string, unknown>, 'team'));
		}
	} catch (e) {
		console.error('[teamDrillLibrary] team drills load', e);
	}

	const clubId = typeof opts.clubId === 'string' ? opts.clubId.trim() : '';
	if (clubId) {
		try {
			const clubSnap = await getDocs(
				collection(firestore, 'clubs', clubId, 'shared_drills'),
			);
			for (const d of clubSnap.docs) {
				rows.push(
					mapTeamDrillDoc(d.id, d.data() as Record<string, unknown>, 'club', clubId),
				);
			}
		} catch (e) {
			console.error('[teamDrillLibrary] club shared_drills load', e);
		}
	}

	const attr = opts.attributeId?.trim();
	const filtered = attr ? rows.filter((r) => r.attributeId === attr) : rows;
	return filtered.sort((a, b) => a.title.localeCompare(b.title));
}

export async function resolveTeamDrillById(
	firestore: Firestore,
	teamId: string,
	drillId: string,
	clubId?: string,
): Promise<TeamDrillPickerRow | null> {
	const id = drillId.trim();
	if (!id) return null;

	try {
		const teamSnap = await getDoc(doc(firestore, 'teams', teamId, 'drills', id));
		if (teamSnap.exists()) {
			return mapTeamDrillDoc(id, teamSnap.data() as Record<string, unknown>, 'team');
		}
	} catch {
		/* try club */
	}

	const cid = typeof clubId === 'string' ? clubId.trim() : '';
	if (cid) {
		try {
			const clubSnap = await getDoc(doc(firestore, 'clubs', cid, 'shared_drills', id));
			if (clubSnap.exists()) {
				return mapTeamDrillDoc(id, clubSnap.data() as Record<string, unknown>, 'club', cid);
			}
		} catch {
			return null;
		}
	}

	return null;
}
