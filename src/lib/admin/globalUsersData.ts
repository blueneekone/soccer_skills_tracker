import {
	collection,
	getCountFromServer,
	getDocs,
	limit,
	orderBy,
	query,
	startAfter,
	where,
	documentId,
	type Firestore,
	type Query,
} from 'firebase/firestore';
import { GLOBAL_USERS_PAGE_SIZE, normalizeEmailPrefix, roleFilterForTab } from '$lib/admin/globalUsersDisplay.js';
import { enrichUsersWithHouseholdGraph } from '$lib/admin/enrichUsersHouseholdGraph.js';
import { mapUserDocumentToRow, sliceUsersPage } from '$lib/admin/globalUsersMapper.js';
import type { GlobalUsersPageResult, GlobalUsersTab } from '$lib/types/adminUsers.js';
import { authStore } from '$lib/stores/auth.svelte.js';

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
		parts.push(where(documentId(), '>=', term));
		parts.push(where(documentId(), '<=', `${term}\uf8ff`));
	}
	parts.push(orderBy(documentId()));
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
	if (!db || !authStore.isAuthenticated) return 0;
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
	if (!db || !authStore.isAuthenticated) return { rows: [], hasNextPage: false };
	const snap = await getDocs(buildUsersPageQuery(db, searchTerm, afterEmail, tab, pageSize));
	const mapped = snap.docs.map((d) =>
		mapUserDocumentToRow(d.id, (d.data() || {}) as Record<string, unknown>),
	);
	const sliced = sliceUsersPage(mapped, pageSize);
	const enriched = await enrichUsersWithHouseholdGraph(db, sliced.rows);
	return { rows: enriched, hasNextPage: sliced.hasNextPage };
}

export async function loadClubNameMap(db: Firestore): Promise<Map<string, string>> {
	const m = new Map<string, string>();
	if (!db || !authStore.isAuthenticated) return m;
	const snap = await getDocs(collection(db, 'clubs'));
	snap.forEach((d) => {
		const data = d.data() as Record<string, unknown>;
		const name = typeof data.name === 'string' ? data.name.trim() : '';
		m.set(d.id, name || d.id);
	});
	return m;
}
