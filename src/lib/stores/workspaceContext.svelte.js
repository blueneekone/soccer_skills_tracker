/**
 * Workspace context: switcher pivot + active role bucket + scoped club/team for zero-trust UI.
 * Defensive sessionStorage: never throw on read/write; profile fill when cache is empty is driven
 * from `auth.svelte.js` via `hydrateContext` only (no $effect: never write club/team/context reactively).
 */

import { browser } from '$app/environment';

// ── sessionStorage keys (tenant scope; tab session) ───────────────────────
const K_PIVOT = 'sst-ws-pivot';
const K_CONTEXT = 'sst-ws-ctx';
const K_CLUB = 'sst-ws-club';
const K_TEAM = 'sst-ws-team';

/**
 * @param {string} key
 * @returns {string | null}
 */
function safeSessionGet(key) {
	try {
		if (typeof sessionStorage === 'undefined' || !sessionStorage) return null;
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * @param {string} key
 * @param {string} value
 */
function safeSessionSet(key, value) {
	try {
		if (typeof sessionStorage === 'undefined' || !sessionStorage) return;
		if (value === '' || value == null) {
			sessionStorage.removeItem(key);
		} else {
			sessionStorage.setItem(key, value);
		}
	} catch {
		/* private mode, quota, denied */
	}
}

function clearSessionWorkspaceKeys() {
	for (const k of [K_PIVOT, K_CONTEXT, K_CLUB, K_TEAM]) {
		try {
			if (typeof sessionStorage !== 'undefined' && sessionStorage) {
				sessionStorage.removeItem(k);
			}
		} catch {
			/* ignore */
		}
	}
}

function persistToSession() {
	safeSessionSet(K_PIVOT, activePivotKey);
	safeSessionSet(K_CONTEXT, activeContext);
	safeSessionSet(K_CLUB, activeClubId);
	safeSessionSet(K_TEAM, activeTeamId);
}

/** @type {string} */
let activePivotKey = $state('');

/** @type {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'recruiter' | 'household'} */
let activeContext = $state('');

/** Active club for director/registrar sessions (cleared on pivot). */
let activeClubId = $state('');

/** Active team for coach sessions (cleared on pivot). */
let activeTeamId = $state('');

/** Desktop sidebar rail visible (mobile overlay uses separate sheet state). */
let isSidebarOpen = $state(true);

/**
 * Read cached scope into runes. Invalid / missing values become safe defaults (no throw).
 */
function loadCachedWorkspaceState() {
	const p = safeSessionGet(K_PIVOT);
	const c = safeSessionGet(K_CONTEXT);
	const cl = safeSessionGet(K_CLUB);
	const t = safeSessionGet(K_TEAM);
	if (p !== null && typeof p === 'string' && p !== activePivotKey) {
		activePivotKey = p;
	}
	if (c !== null) {
		if (typeof c === 'string' && c) {
			/** @type {typeof activeContext} */
			const v = c;
			const next = /** @type {typeof activeContext} */ (
				['', 'admin', 'director', 'coach', 'registrar', 'recruiter', 'household'].includes(v) ? v : ''
			);
			if (activeContext !== next) activeContext = next;
		} else if (activeContext !== '') {
			activeContext = '';
		}
	}
	if (cl !== null) {
		const next = typeof cl === 'string' ? cl.trim() : '';
		if (activeClubId !== next) activeClubId = next;
	}
	if (t !== null) {
		const next = typeof t === 'string' ? t.trim() : '';
		if (activeTeamId !== next) activeTeamId = next;
	}
}

if (browser) {
	try {
		loadCachedWorkspaceState();
	} catch {
		activePivotKey = '';
		activeContext = '';
		activeClubId = '';
		activeTeamId = '';
	}
}

/**
 * Tenancy from the resolved `users/{email}` document — only called from the auth store after
 * `resolveUserProfile` (synchronous, no $effect, no self-triggering reactivity on auth changes).
 * For coaches, club/team always follow the profile (source of truth), never a placeholder.
 *
 * @param {import('firebase/auth').User | null} user
 * @param {string} role
 * @param {Record<string, unknown> | null | undefined} profile
 */
function hydrateContextImpl(user, role, profile) {
	if (!browser) return;
	if (!user || !profile) return;
	const pid =
		typeof profile.clubId === 'string' && profile.clubId.trim() ? profile.clubId.trim() : '';
	const tidRaw =
		typeof profile.teamId === 'string' && profile.teamId.trim() ? profile.teamId.trim() : '';
	/** @type {string} */
	const teamId = tidRaw && tidRaw !== 'admin' ? tidRaw : '';
	if (role === 'coach') {
		/* never leave club/team as undefined / null; Firestore is authoritative for staff */
		if (activeClubId !== pid) activeClubId = pid;
		if (activeTeamId !== teamId) activeTeamId = teamId;
		persistToSession();
		return;
	}
	/* other roles: backfill only when session cache is still empty (director, player, global QA, etc.) */
	if (!(activeClubId && activeClubId.trim()) && pid && activeClubId !== pid) {
		activeClubId = pid;
		persistToSession();
	}
	if (
		!(activeTeamId && activeTeamId.trim()) &&
		teamId &&
		(role === 'player' || role === 'super_admin' || role === 'global_admin') &&
		activeTeamId !== teamId
	) {
		activeTeamId = teamId;
		persistToSession();
	}
}

export const workspaceContextStore = {
	get activePivotKey() {
		return activePivotKey;
	},
	get activeContext() {
		return activeContext;
	},
	get activeClubId() {
		return activeClubId;
	},
	get activeTeamId() {
		return activeTeamId;
	},
	get isSidebarOpen() {
		return isSidebarOpen;
	},
	/**
	 * @param {import('firebase/auth').User | null} user
	 * @param {string} role
	 * @param {Record<string, unknown> | null | undefined} profile
	 */
	hydrateContext(user, role, profile) {
		hydrateContextImpl(user, role, profile);
	},
	/**
	 * @param {string} key
	 */
	setPivot(key) {
		activePivotKey = key;
		persistToSession();
	},
	/**
	 * @param {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'recruiter' | 'household'} ctx
	 */
	setActiveContext(ctx) {
		activeContext = ctx;
		persistToSession();
	},
	/**
	 * @param {string} id
	 */
	setActiveClubId(id) {
		activeClubId = (id || '').trim();
		persistToSession();
	},
	/**
	 * @param {string} id
	 */
	setActiveTeamId(id) {
		activeTeamId = (id || '').trim();
		persistToSession();
	},
	/**
	 * Convenience alias — sets the active team and fires any reactive dependents.
	 * @param {string} id
	 */
	setTeam(id) {
		activeTeamId = (id || '').trim();
		persistToSession();
	},
	/** @param {boolean} open */
	setSidebarOpen(open) {
		const b = Boolean(open);
		if (isSidebarOpen === b) return;
		isSidebarOpen = b;
	},
	toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	},
	/** Clear club/team scope (call before applying a new workspace pivot). */
	resetScope() {
		if (activeClubId === '' && activeTeamId === '') return;
		activeClubId = '';
		activeTeamId = '';
	},
	clear() {
		if (activePivotKey !== '') activePivotKey = '';
		if (activeContext !== '') activeContext = '';
		if (activeClubId !== '') activeClubId = '';
		if (activeTeamId !== '') activeTeamId = '';
		if (isSidebarOpen !== true) isSidebarOpen = true;
		clearSessionWorkspaceKeys();
	},
};
