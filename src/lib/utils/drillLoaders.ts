import { db } from '$lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

export type DrillRow = {
	id: string;
	title: string;
	category: string;
	metricType: string;
	videoUrl: string;
	description: string;
	durationMinutes: number;
	baseXp: number;
	source: 'team' | 'platform';
	sportId?: string;
	createdBy?: string;
};

export async function loadTeamDrills(teamId: string): Promise<DrillRow[]> {
	if (!teamId) return [];
	const snap = await getDocs(collection(db, 'teams', teamId, 'drills'));
	const rows: DrillRow[] = snap.docs.map((d) => {
		const x = (d.data() || {}) as Record<string, unknown>;
		return {
			id: d.id,
			title:
				typeof x.name === 'string' && x.name.trim() ?
					x.name.trim()
				: typeof x.title === 'string' ?
					x.title
				: 'Untitled Drill',
			category:
				typeof x.category === 'string' ?
					x.category
				: typeof x.focusArea === 'string' ?
					x.focusArea
				: 'General',
			metricType: typeof x.metricType === 'string' ? x.metricType : 'reps',
			videoUrl: typeof x.videoUrl === 'string' ? x.videoUrl : '',
			description: typeof x.description === 'string' ? x.description : '',
			durationMinutes: typeof x.durationMinutes === 'number' ? x.durationMinutes : 10,
			baseXp:
				typeof x.base_xp === 'number' && !Number.isNaN(x.base_xp) ?
					Math.floor(x.base_xp)
				: 10,
			source: 'team',
			createdBy: typeof x.createdBy === 'string' ? x.createdBy : '',
		};
	});
	rows.sort((a, b) => a.title.localeCompare(b.title));
	return rows;
}
