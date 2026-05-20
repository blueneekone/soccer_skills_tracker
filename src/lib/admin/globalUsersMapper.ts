import { toEpochMs } from '$lib/utils/timestamp.js';
import type { GlobalUserRow } from '$lib/types/adminUsers.js';

/** Maps a Firestore users document to a GlobalUserRow. */
export function mapUserDocumentToRow(id: string, raw: Record<string, unknown>): GlobalUserRow {
	const email = typeof raw.email === 'string' && raw.email ? raw.email : id;
	const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
	const playerName = typeof raw.playerName === 'string' ? raw.playerName.trim() : '';
	const role = typeof raw.role === 'string' ? raw.role : '';
	const clubId = typeof raw.clubId === 'string' ? raw.clubId.trim() : '';
	const teamId = typeof raw.teamId === 'string' ? raw.teamId.trim() : '';
	const photoURL = typeof raw.photoURL === 'string' ? raw.photoURL : '';
	const status = typeof raw.status === 'string' ? raw.status.trim() : '';
	const uid = typeof raw.uid === 'string' && raw.uid.trim() ? raw.uid.trim() : '';
	const roles = Array.isArray(raw.roles) ?
			(raw.roles.filter((x) => typeof x === 'string') as string[])
		:	[];

	const candidates = [
		{ k: 'lastActivityDate', v: toEpochMs(raw.lastActivityDate) },
		{ k: 'lastLoginAt', v: toEpochMs(raw.lastLoginAt) },
		{ k: 'updatedAt', v: toEpochMs(raw.updatedAt) },
		{ k: 'createdAt', v: toEpochMs(raw.createdAt) },
	];
	const picked = candidates.find((c) => c.v > 0) || { k: '', v: 0 };

	return {
		id,
		email,
		displayName,
		playerName,
		role,
		clubId,
		teamId,
		lastActiveAt: picked.v,
		lastActiveSource: picked.k,
		photoURL,
		status,
		uid,
		roles,
	};
}

export function sliceUsersPage(rows: GlobalUserRow[], pageSize: number): {
	rows: GlobalUserRow[];
	hasNextPage: boolean;
} {
	const hasNextPage = rows.length > pageSize;
	return {
		rows: rows.slice(0, pageSize),
		hasNextPage,
	};
}
