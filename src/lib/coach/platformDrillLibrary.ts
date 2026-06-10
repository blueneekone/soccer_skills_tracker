/**
 * Platform basics — read-only starter drills per sport (`drills/{id}`).
 * Coaches copy into `teams/{teamId}/drills`; they never deploy intents from here directly.
 * RL personalization uses separate `global_drills` (admin/seed only).
 *
 * Promote flow:
 *   coach "Share with director"  → recommendDrillToDirector → drill_recommendations/{id}
 *   director "Publish to club"   → publishDrillToClub       → clubs/{clubId}/shared_drills/{id}
 *   Intent Engine reads          → loadTeamDrillsForIntent  ← clubs/{clubId}/shared_drills
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
	updateDoc,
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

/** @deprecated Use recommendDrillToDirector for Firestore-persisted recommendations. */
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

/**
 * Coach "Share with director" — persists a recommendation inbox doc.
 *
 * Writes to: `drill_recommendations/{auto-id}`
 * Doc shape mirrors `loadTeamDrillsForIntent` reader fields so the director's
 * publish step can copy them directly to `clubs/{clubId}/shared_drills`.
 *
 * NOTE: `drill_recommendations` requires a Firestore rule granting coach write
 * within the same club (tokenClub() == clubId). Add before shipping.
 */
export async function recommendDrillToDirector(
	firestore: Firestore,
	input: {
		drillTitle: string;
		category: string;
		attributeId?: string;
		durationMinutes?: number;
		teamId: string;
		coachUid: string;
		coachEmail: string;
		clubId: string;
		notes?: string;
	},
): Promise<string> {
	const cid = input.clubId.trim();
	const tid = input.teamId.trim();
	if (!cid) throw new Error('clubId is required to recommend a drill.');
	if (!tid) throw new Error('teamId is required to recommend a drill.');

	const title = input.drillTitle.trim() || 'Untitled Drill';
	const category = input.category || 'General';
	const attrId =
		input.attributeId?.trim() ? input.attributeId.trim() : categoryToAttributeId(category);
	const duration =
		typeof input.durationMinutes === 'number' && input.durationMinutes >= 1 ?
			Math.floor(input.durationMinutes)
		:	10;

	const ref = await addDoc(collection(firestore, 'drill_recommendations'), {
		// Fields forwarded verbatim to shared_drills on director publish —
		// must match what mapTeamDrillDoc in teamDrillLibrary.ts reads.
		title,
		name: title,
		attributeId: attrId,
		focusArea: category,
		category,
		durationMinutes: duration,
		// Recommendation provenance
		clubId: cid,
		teamId: tid,
		coachUid: input.coachUid,
		coachEmail: input.coachEmail,
		status: 'pending' as const,
		createdAt: serverTimestamp(),
		...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
	});
	return ref.id;
}

/**
 * Director "Publish to club" — promotes an inbox recommendation to the
 * canonical `clubs/{clubId}/shared_drills` collection read by `loadTeamDrillsForIntent`.
 */
export async function publishDrillToClub(
	firestore: Firestore,
	input: {
		recommendationId: string;
		clubId: string;
		directorUid: string;
	},
): Promise<string> {
	const rid = input.recommendationId.trim();
	const cid = input.clubId.trim();
	if (!rid || !cid) throw new Error('recommendationId and clubId are required.');

	const snap = await getDoc(doc(firestore, 'drill_recommendations', rid));
	if (!snap.exists()) throw new Error('Drill recommendation not found.');

	const x = snap.data() as Record<string, unknown>;
	const title =
		typeof x.title === 'string' && x.title.trim() ? x.title.trim() : 'Untitled Drill';
	const category = typeof x.category === 'string' ? x.category : 'General';
	const attrId =
		typeof x.attributeId === 'string' && x.attributeId.trim() ?
			x.attributeId.trim()
		:	categoryToAttributeId(category);
	const duration =
		typeof x.durationMinutes === 'number' && x.durationMinutes >= 1 ?
			Math.floor(x.durationMinutes)
		:	10;

	const ref = await addDoc(collection(firestore, 'clubs', cid, 'shared_drills'), {
		title,
		name: title,
		attributeId: attrId,
		focusArea: category,
		category,
		durationMinutes: duration,
		clubId: cid,
		scope: 'club' as const,
		publishedBy: input.directorUid,
		publishedAt: serverTimestamp(),
		sourceRecommendationId: rid,
	});

	await updateDoc(doc(firestore, 'drill_recommendations', rid), {
		status: 'published',
		publishedDrillId: ref.id,
		publishedAt: serverTimestamp(),
		publishedBy: input.directorUid,
	});

	return ref.id;
}

/** Director dismisses a pending recommendation without publishing. */
export async function dismissDrillRecommendation(
	firestore: Firestore,
	input: {
		recommendationId: string;
		clubId: string;
		directorUid: string;
	},
): Promise<void> {
	const rid = input.recommendationId.trim();
	const cid = input.clubId.trim();
	if (!rid || !cid) throw new Error('recommendationId and clubId are required.');

	const snap = await getDoc(doc(firestore, 'drill_recommendations', rid));
	if (!snap.exists()) throw new Error('Drill recommendation not found.');

	const x = snap.data() as Record<string, unknown>;
	if (x.clubId !== cid) throw new Error('Recommendation is not in this club.');

	await updateDoc(doc(firestore, 'drill_recommendations', rid), {
		status: 'dismissed',
		dismissedAt: serverTimestamp(),
		dismissedBy: input.directorUid,
	});
}
