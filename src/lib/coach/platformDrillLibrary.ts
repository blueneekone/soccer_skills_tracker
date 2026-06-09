/**
 * Platform basics — read-only starter drills per sport (`drills/{id}`).
 * Coaches copy into `teams/{teamId}/drills`; they never deploy intents from here directly.
 * RL personalization uses separate `global_drills` (admin/seed only).
 */

import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	serverTimestamp,
	type Firestore,
} from 'firebase/firestore';
import { categoryToAttributeId } from '$lib/coach/teamDrillLibrary.js';

export type PlatformDrillRow = {
	id: string;
	title: string;
	sportId: string;
	category: string;
	metricType: string;
	videoUrl: string;
	description: string;
	durationMinutes: number;
	baseXp: number;
};

function mapPlatformDoc(id: string, data: Record<string, unknown>): PlatformDrillRow {
	return {
		id,
		title: typeof data.title === 'string' ? data.title : 'Untitled Drill',
		sportId: typeof data.sportId === 'string' && data.sportId.trim() ? data.sportId.trim() : '',
		category: typeof data.category === 'string' ? data.category : 'General',
		metricType: typeof data.metricType === 'string' ? data.metricType : 'reps',
		videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : '',
		description: typeof data.description === 'string' ? data.description : '',
		durationMinutes:
			typeof data.durationMinutes === 'number' && data.durationMinutes >= 1 ?
				Math.floor(data.durationMinutes)
			:	10,
		baseXp:
			typeof data.base_xp === 'number' && !Number.isNaN(data.base_xp) ?
				Math.floor(data.base_xp)
			:	10,
	};
}

/** Platform basics for the active sport (includes legacy rows with no sportId when sport is soccer). */
export async function loadPlatformBasics(
	firestore: Firestore,
	sportId: string,
): Promise<PlatformDrillRow[]> {
	const sid = (sportId || 'soccer').trim();
	try {
		const snap = await getDocs(query(collection(firestore, 'drills'), orderBy('title')));
		return snap.docs
			.map((d) => mapPlatformDoc(d.id, d.data() as Record<string, unknown>))
			.filter((row) => {
				if (!row.sportId) return sid === 'soccer';
				return row.sportId === sid;
			})
			.sort((a, b) => a.title.localeCompare(b.title));
	} catch (e) {
		console.error('[platformDrillLibrary] load', e);
		return [];
	}
}

/** Copy a platform basic into the coach's team library (editable fork). */
export async function copyPlatformDrillToTeam(
	firestore: Firestore,
	input: {
		teamId: string;
		platformDrillId: string;
		createdByUid: string;
		createdByEmail?: string;
	},
): Promise<string> {
	const tid = input.teamId.trim();
	const pid = input.platformDrillId.trim();
	if (!tid || !pid) throw new Error('teamId and platformDrillId are required.');

	const snap = await getDoc(doc(firestore, 'drills', pid));
	if (!snap.exists()) throw new Error('Platform drill not found.');

	const x = snap.data() as Record<string, unknown>;
	const title =
		typeof x.title === 'string' && x.title.trim() ? x.title.trim() : 'Untitled Drill';
	const category = typeof x.category === 'string' ? x.category : 'General';
	const description =
		typeof x.description === 'string' && x.description.trim() ?
			x.description.trim()
		: `${category} · copied from platform basics`;
	const durationMinutes =
		typeof x.durationMinutes === 'number' && x.durationMinutes >= 1 ?
			Math.min(120, Math.floor(x.durationMinutes))
		:	10;

	const ref = await addDoc(collection(firestore, 'teams', tid, 'drills'), {
		name: title,
		title,
		category,
		focusArea: category,
		attributeId: categoryToAttributeId(category),
		metricType: typeof x.metricType === 'string' ? x.metricType : 'reps',
		videoUrl: typeof x.videoUrl === 'string' ? x.videoUrl : '',
		description: description.slice(0, 8000),
		durationMinutes,
		scope: 'team',
		forkedFromPlatformId: pid,
		createdBy: input.createdByUid,
		...(input.createdByEmail ? { createdByEmail: input.createdByEmail } : {}),
		createdAt: serverTimestamp(),
	});
	return ref.id;
}

export function buildDirectorDrillRecommendation(input: {
	drillTitle: string;
	category: string;
	teamId: string;
	coachEmail: string;
	clubId?: string;
	notes?: string;
}): string {
	const lines = [
		'Club drill library recommendation',
		'──────────────────────────────',
		`Title: ${input.drillTitle}`,
		`Category: ${input.category}`,
		`Team: ${input.teamId}`,
		...(input.clubId ? [`Club: ${input.clubId}`] : []),
		`Coach: ${input.coachEmail}`,
		'',
		'Request: Add to clubs/{clubId}/shared_drills after review.',
	];
	if (input.notes?.trim()) {
		lines.push('', 'Notes:', input.notes.trim());
	}
	return lines.join('\n');
}
