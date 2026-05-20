import { normalizeClubSport } from '$lib/utils/sport-icon.js';
import { ADMIN_TIER_OPTIONS } from '$lib/admin/organizationsConstants.js';
import type {
	AdminClub,
	AdminClubLicenseMeta,
	AdminClubTierKey,
	AdminOrganizationsFilterState,
	AdminSportTabKey,
	AdminVerificationStatus,
} from '$lib/types/adminOrganizations.js';

export function toggleInList(list: string[], value: string): string[] {
	return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function verificationForClub(cl: AdminClub): AdminVerificationStatus {
	const hasAddr = typeof cl.verifiedAddress === 'string' && cl.verifiedAddress.trim().length > 0;
	const hasPhone = typeof cl.phoneNumber === 'string' && cl.phoneNumber.trim().length > 0;
	return hasAddr && hasPhone ? 'verified' : 'pending';
}

export function stateForClub(cl: AdminClub): string {
	const addr = typeof cl.verifiedAddress === 'string' ? cl.verifiedAddress : '';
	if (!addr) return '';
	const m = addr.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
	return m ? m[1] : '';
}

export function tierForClub(cl: AdminClub): AdminClubTierKey {
	const raw = (cl.tier || cl.subscriptionTier) || '';
	const key = String(raw).toLowerCase().trim();
	if (key === 'enterprise') return 'enterprise';
	if (key === 'club') return 'club';
	if (key === 'pro') return 'pro';
	if (key === 'starter') return 'starter';
	return 'unassigned';
}

export function licenseMetaForClub(cl: AdminClub): AdminClubLicenseMeta {
	if (cl.isInfinite === true) {
		return { label: 'Promo', accent: '#f59e0b', icon: 'sys.infinity' };
	}
	const key = tierForClub(cl);
	const opt = ADMIN_TIER_OPTIONS.find((t) => t.key === key);
	return {
		label: opt?.label ?? 'Unassigned',
		accent: opt?.accent ?? '#71717a',
		icon: opt?.icon ?? 'sys.question',
	};
}

export function countClubsBySport(clubs: AdminClub[]): Record<string, number> {
	const counts: Record<string, number> = { all: clubs.length };
	for (const cl of clubs) {
		const k = normalizeClubSport(cl.sport);
		counts[k] = (counts[k] || 0) + 1;
	}
	return counts;
}

export function countClubsByTier(clubs: AdminClub[]): Record<AdminClubTierKey, number> {
	const counts: Record<AdminClubTierKey, number> = {
		enterprise: 0,
		club: 0,
		pro: 0,
		starter: 0,
		unassigned: 0,
	};
	for (const cl of clubs) counts[tierForClub(cl)]++;
	return counts;
}

export function filterClubsBySport(clubs: AdminClub[], sportTab: AdminSportTabKey): AdminClub[] {
	if (sportTab === 'all') return clubs;
	return clubs.filter((cl) => normalizeClubSport(cl.sport) === sportTab);
}

export function collectKnownStates(clubs: AdminClub[]): string[] {
	const s = new Set<string>();
	for (const cl of clubs) {
		const st = stateForClub(cl);
		if (st) s.add(st);
	}
	return Array.from(s).sort();
}

export function filterStateOptions(states: string[], query: string): string[] {
	const q = query.trim().toUpperCase();
	if (!q) return states;
	return states.filter((st) => st.includes(q));
}

export function filterOrganizations(
	clubs: AdminClub[],
	filters: AdminOrganizationsFilterState,
): AdminClub[] {
	let base = filterClubsBySport(clubs, filters.sportTab);

	if (filters.verification !== 'all') {
		base = base.filter((cl) => verificationForClub(cl) === filters.verification);
	}
	if (filters.states.length > 0) {
		const allowed = new Set(filters.states);
		base = base.filter((cl) => {
			const st = stateForClub(cl);
			return st ? allowed.has(st) : false;
		});
	}
	if (filters.tiers.length > 0) {
		const allowed = new Set(filters.tiers);
		base = base.filter((cl) => allowed.has(tierForClub(cl)));
	}

	const q = filters.search.trim().toLowerCase();
	if (!q) return base;

	return base.filter((cl) => {
		return (
			(cl.name || '').toLowerCase().includes(q) ||
			cl.id.toLowerCase().includes(q) ||
			(cl.sport || '').toLowerCase().includes(q) ||
			(cl.directorEmail || '').toLowerCase().includes(q)
		);
	});
}

export function paginateClubs<T>(items: T[], page: number, pageSize: number): T[] {
	const start = page * pageSize;
	return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
	return Math.max(1, Math.ceil(count / pageSize));
}

export function countActiveFilters(filters: Pick<
	AdminOrganizationsFilterState,
	'verification' | 'states' | 'tiers'
>): number {
	let n = 0;
	if (filters.verification !== 'all') n++;
	if (filters.states.length > 0) n++;
	if (filters.tiers.length > 0) n++;
	return n;
}

export function patchClubLocally(clubs: AdminClub[], updated: AdminClub): AdminClub[] {
	return clubs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
}

export function removeClubLocally(clubs: AdminClub[], id: string): AdminClub[] {
	return clubs.filter((cl) => cl.id !== id);
}
