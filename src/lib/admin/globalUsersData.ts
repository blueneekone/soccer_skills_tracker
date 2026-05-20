import {
	collection,
	getCountFromServer,
	getDocs,
	limit,
	orderBy,
	query,
	startAfter,
	where,
	type Firestore,
	type Query,
} from 'firebase/firestore';
import { GLOBAL_USERS_PAGE_SIZE, normalizeEmailPrefix, roleFilterForTab } from '$lib/admin/globalUsersDisplay.js';
import { mapUserDocumentToRow, sliceUsersPage } from '$lib/admin/globalUsersMapper.js';
import type { GlobalUsersPageResult, GlobalUsersTab } from '$lib/types/adminUsers.js';

export function buildUsersBaseQuery(db: Firestore, searchTerm: string, tab: GlobalUsersTab): Query {
	const col = collection(db, 'users');
	const term = normalizeEmailPrefix(searchTerm);
	const rf = roleFilterForTab(tab);
	const parts = [];
	if (rf.kind === 'eq') {
		parts.push(where('role', '==', rf.value));
	} else {
		parts.push(where('role', 'in', rf.values));
	}
	if (term) {
		parts.push(where('email', '>=', term));
		parts.push(where('email', '<=', `${term}\uf8ff`));
	}
	parts.push(orderBy('email'));
	return query(col, ...parts);
}

export function buildUsersPageQuery(
	db: Firestore,
	searchTerm: string,
	afterEmail: string,
	tab: GlobalUsersTab,
	pageSize = GLOBAL_USERS_PAGE_SIZE,
): Query {
	const base = buildUsersBaseQuery(db, searchTerm, tab);
	if (afterEmail) {
		return query(base, startAfter(afterEmail), limit(pageSize + 1));
	}
	return query(base, limit(pageSize + 1));
}

export async function fetchUsersCount(
	db: Firestore,
	searchTerm: string,
	tab: GlobalUsersTab,
): Promise<number> {
	const snap = await getCountFromServer(buildUsersBaseQuery(db, searchTerm, tab));
	return snap.data().count;
}

export async function fetchUsersPage(
	db: Firestore,
	searchTerm: string,
	afterEmail: string,
	tab: GlobalUsersTab,
	pageSize = GLOBAL_USERS_PAGE_SIZE,
): Promise<GlobalUsersPageResult> {
	const snap = await getDocs(buildUsersPageQuery(db, searchTerm, afterEmail, tab, pageSize));
	const mapped = snap.docs.map((d) =>
		mapUserDocumentToRow(d.id, (d.data() || {}) as Record<string, unknown>),
	);
	return sliceUsersPage(mapped, pageSize);
}

export async function loadClubNameMap(db: Firestore): Promise<Map<string, string>> {
	const snap = await getDocs(collection(db, 'clubs'));
	const m = new Map<string, string>();
	snap.forEach((d) => {
		const data = d.data() as Record<string, unknown>;
		const name = typeof data.name === 'string' ? data.name.trim() : '';
		m.set(d.id, name || d.id);
	});
	return m;
}
