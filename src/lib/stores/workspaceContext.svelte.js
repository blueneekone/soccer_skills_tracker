/**
 * Workspace context: switcher pivot + active role bucket + scoped club/team for zero-trust UI.
 * Defensive sessionStorage: never throw on read/write; profile fill when cache is empty is driven
 * synchronously from `auth.svelte.js` (no $effect here — avoids Svelte 5 effect_orphan / update-depth loops in store modules).
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
 * @param {Record<string, unknown> | null | undefined} prof
 * @param {string} role
 */
function applyHydrationFromProfile(prof, role) {
	if (!browser) return;
	if (!prof) return;
	const pid =
		typeof prof.clubId === 'string' && prof.clubId.trim() ? prof.clubId.trim() : '';
	const tidRaw =
		typeof prof.teamId === 'string' && prof.teamId.trim() ? prof.teamId.trim() : '';
	const tid = tidRaw && tidRaw !== 'admin' ? tidRaw : '';
	/* Circuit breaker: never assign the same $state value twice — avoids reactivity / layout $effect depth churn. */
	if (!(activeClubId && activeClubId.trim()) && pid && activeClubId !== pid) {
		activeClubId = pid;
		persistToSession();
	}
	if (
		!(activeTeamId && activeTeamId.trim()) &&
		tid &&
		(role === 'coach' || role === 'player' || role === 'super_admin' || role === 'global_admin') &&
		activeTeamId !== tid
	) {
		activeTeamId = tid;
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
	 * If session cache did not set club/team, copy from Firestore `users/{email}` (via resolved profile).
	 * Call from the auth store only, right after `setProfile` in `onAuthStateChanged` / `refresh` — not from `$effect`.
	 * @param {Record<string, unknown> | null | undefined} prof
	 * @param {string} role
	 */
	hydrateFromUserProfileIfEmpty(prof, role) {
		applyHydrationFromProfile(prof, role);
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
