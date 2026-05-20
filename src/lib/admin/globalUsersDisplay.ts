import type { GlobalUsersTab } from '$lib/types/adminUsers.js';

export const GLOBAL_USERS_PAGE_SIZE = 50;

export const GLOBAL_USERS_ROLE_LABELS = {
	super_admin: 'Global Admin',
	global_admin: 'Global Admin',
	admin: 'Global Admin',
	director: 'Director',
	coach: 'Coach',
	registrar: 'Registrar',
	recruiter: 'Recruiter',
	parent: 'Parent',
	player: 'Player',
	guest: 'Guest',
} as const;

export function roleLabel(role: string): string {
	return GLOBAL_USERS_ROLE_LABELS[role as keyof typeof GLOBAL_USERS_ROLE_LABELS] || role || 'Unknown';
}

export function roleFilterForTab(tab: GlobalUsersTab) {
	switch (tab) {
		case 'admins':
			return { kind: 'in' as const, values: ['super_admin', 'global_admin', 'admin'] };
		case 'directors':
			return { kind: 'eq' as const, value: 'director' };
		case 'coaches':
			return { kind: 'eq' as const, value: 'coach' };
		case 'parents_players':
			return { kind: 'in' as const, values: ['parent', 'player'] };
		default:
			return { kind: 'eq' as const, value: 'director' };
	}
}

export function emptyMessageForTab(tab: GlobalUsersTab): string {
	switch (tab) {
		case 'admins':
			return 'No Global Admins found in this organization.';
		case 'directors':
			return 'No Directors found in this organization.';
		case 'coaches':
			return 'No Coaches found in this organization.';
		case 'parents_players':
			return 'No Parents or Players found in this organization.';
		default:
			return 'No users found.';
	}
}

export function roleToneClass(role: string): string {
	switch (role) {
		case 'super_admin':
		case 'global_admin':
		case 'admin':
			return 'gu-role--crimson';
		case 'director':
			return 'gu-role--indigo';
		case 'coach':
			return 'gu-role--amber';
		case 'registrar':
			return 'gu-role--teal';
		case 'recruiter':
			return 'gu-role--violet';
		case 'parent':
			return 'gu-role--sky';
		case 'player':
			return 'gu-role--emerald';
		default:
			return 'gu-role--slate';
	}
}

export function initials(name: string): string {
	const s = (name || '').trim();
	if (!s) return '•';
	const parts = s.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '•';
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
	return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function formatLastActive(ts: number): string {
	if (!ts || !Number.isFinite(ts)) return '—';
	const diffMs = Date.now() - ts;
	if (diffMs < 0) return 'Just now';
	const minute = 60 * 1000;
	const hour = 60 * minute;
	const day = 24 * hour;
	if (diffMs < minute) return 'Just now';
	if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
	if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
	if (diffMs < 30 * day) return `${Math.floor(diffMs / day)}d ago`;
	try {
		return new Date(ts).toLocaleDateString();
	} catch {
		return '—';
	}
}

export function normalizeEmailPrefix(raw: string): string {
	return (typeof raw === 'string' ? raw : '').toLowerCase().trim();
}

export function patchUserRowLocally<T extends { id: string }>(rows: T[], patch: T): T[] {
	return rows.map((r) => (r.id === patch.id ? { ...r, ...patch } : r));
}

export function suspendUserRowLocally<T extends { id: string; email: string }>(
	rows: T[],
	key: string,
): T[] {
	return rows.map((r) =>
		r.id === key || r.email.toLowerCase() === key ?
			({ ...r, status: 'suspended', role: 'guest', roles: [] } as T)
		:	r,
	);
}
