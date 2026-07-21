import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

// ─── Player Type ──────────────────────────────────────────────────────────────
export type Player = {
	id: string; statsDocId: string; teamId: string;
	displayName: string; name: string; status: string;
	playerEmail: string; jersey: string; ageGroup: string;
	position: string; lastActiveLabel: string;
	attributes: { pow: number; agi: number; acc: number; pac: number; stm: number; comp: number } | null;
	compliance: string;
	homework: { assigned: number; completed: number; videosSubmitted: number };
	wellnessScore: number;
	source: 'coach';
};

// ─── SVG Radar Math ───────────────────────────────────────────────────────────
export const RADAR_AXES = ['POW', 'AGI', 'ACC', 'PAC', 'STM', 'COMP'] as const;
export const CX = 120, CY = 120, R = 90;

export function radarPoint(idx: number, val: number, maxVal = 100) {
	const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
	const r = (val / maxVal) * R;
	return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

export function radarPolygon(attrs: Record<string, number>) {
	const vals = [attrs.pow, attrs.agi, attrs.acc, attrs.pac, attrs.stm, attrs.comp];
	return vals.map((v, i) => radarPoint(i, v)).map(p => `${p.x},${p.y}`).join(' ');
}

export function radarLabel(idx: number) {
	const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
	const r = R + 18;
	return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

export function radarGrid(fraction: number) {
	return Array.from({ length: RADAR_AXES.length }, (_, i) => {
		const p = radarPoint(i, fraction * 100);
		return `${p.x},${p.y}`;
	}).join(' ');
}

export function wellnessColor(score: number) {
	if (score >= 75) return '#14b8a6';
	if (score >= 50) return '#fbbf24';
	return '#ef4444';
}

// ─── Default Squad (mock) ─────────────────────────────────────────────────────
export function getDefaultSquad(): Player[] {
	const teamId = workspaceContextStore.activeTeamId ?? 'team-001';
	return [
		{
			id: 'player-001', statsDocId: 'player-001', teamId,
			displayName: 'John Doe', name: 'John Doe', status: 'ACTIVE',
			playerEmail: 'john.doe@example.com', jersey: '10', ageGroup: 'U12',
			position: 'Midfielder', lastActiveLabel: 'Today',
			attributes: { pow: 88, agi: 75, acc: 82, pac: 79, stm: 91, comp: 85 },
			compliance: 'VPC PENDING',
			homework: { assigned: 3, completed: 1, videosSubmitted: 0 },
			wellnessScore: 72, source: 'coach'
		},
		{
			id: 'player-002', statsDocId: 'player-002', teamId,
			displayName: 'Alex Smith', name: 'Alex Smith', status: 'RECOVERY',
			playerEmail: 'alex.smith@example.com', jersey: '7', ageGroup: 'U12',
			position: 'Forward', lastActiveLabel: 'Yesterday',
			attributes: { pow: 65, agi: 80, acc: 70, pac: 68, stm: 60, comp: 72 },
			compliance: 'SAFESPORT',
			homework: { assigned: 3, completed: 3, videosSubmitted: 2 },
			wellnessScore: 45, source: 'coach'
		},
		{
			id: 'player-003', statsDocId: 'player-003', teamId,
			displayName: 'Mark Johnson', name: 'Mark Johnson', status: 'ACTIVE',
			playerEmail: 'mark.j@example.com', jersey: '4', ageGroup: 'U12',
			position: 'Defender', lastActiveLabel: 'Today',
			attributes: { pow: 92, agi: 88, acc: 90, pac: 85, stm: 95, comp: 89 },
			compliance: 'CLEARED',
			homework: { assigned: 3, completed: 2, videosSubmitted: 1 },
			wellnessScore: 88, source: 'coach'
		}
	];
}

// ─── Upcoming Events ──────────────────────────────────────────────────────────
export const UPCOMING_EVENTS = [
	{ type: 'MATCH', label: 'vs Red Bulls U12', date: 'SAT JUL 26', time: '10:00 AM', venue: 'Riverside Park', status: 'CONFIRMED' },
	{ type: 'PRACTICE', label: 'Tactical Drill Block', date: 'TUE JUL 22', time: '5:30 PM', venue: 'Training Ground A', status: 'SCHEDULED' },
	{ type: 'PRACTICE', label: 'Conditioning + Film', date: 'THU JUL 24', time: '5:00 PM', venue: 'Training Ground A', status: 'SCHEDULED' },
	{ type: 'MATCH', label: 'vs Galaxy FC U12', date: 'SAT AUG 2', time: '9:00 AM', venue: 'Central Fields', status: 'PENDING' }
];
