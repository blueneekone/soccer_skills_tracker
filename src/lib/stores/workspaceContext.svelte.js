/**
 * Workspace context: switcher pivot + active role bucket + scoped club/team for zero-trust UI.
 * Defensive sessionStorage: never throw on read/write; re-hydrate from user profile when cache is empty.
 */

import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';

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
	if (p !== null && typeof p === 'string') {
		activePivotKey = p;
	}
	if (c !== null) {
		if (typeof c === 'string' && c) {
			/** @type {typeof activeContext} */
			const v = c;
			activeContext = /** @type {typeof activeContext} */ (
				['', 'admin', 'director', 'coach', 'registrar', 'recruiter', 'household'].includes(v) ? v : ''
			);
		} else {
			activeContext = '';
		}
	}
	if (cl !== null) {
		activeClubId = typeof cl === 'string' ? cl.trim() : '';
	}
	if (t !== null) {
		activeTeamId = typeof t === 'string' ? t.trim() : '';
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
 * If session cache is empty, wait for auth + Firestore user profile, then set club/team from `users/{email}`.
 * Firebase Auth has no `clubId`; it lives on the resolved `authStore.userProfile` document.
 */
$effect(() => {
	if (!browser) return;
	if (authStore.isLoading) return;
	if (!authStore.isAuthenticated) return;
	const prof = authStore.userProfile;
	if (!prof) return;
	const role = authStore.role;
	const pid =
		typeof prof.clubId === 'string' && prof.clubId.trim() ? prof.clubId.trim() : '';
	const tidRaw =
		typeof prof.teamId === 'string' && prof.teamId.trim() ? prof.teamId.trim() : '';
	const tid = tidRaw && tidRaw !== 'admin' ? tidRaw : '';

	if (!(activeClubId && activeClubId.trim()) && pid) {
		activeClubId = pid;
		persistToSession();
	}
	if (!(activeTeamId && activeTeamId.trim()) && tid) {
		if (role === 'coach' || role === 'player' || role === 'super_admin' || role === 'global_admin') {
			activeTeamId = tid;
			persistToSession();
		}
	}
});

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
		isSidebarOpen = Boolean(open);
	},
	toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	},
	/** Clear club/team scope (call before applying a new workspace pivot). */
	resetScope() {
		activeClubId = '';
		activeTeamId = '';
	},
	clear() {
		activePivotKey = '';
		activeContext = '';
		activeClubId = '';
		activeTeamId = '';
		isSidebarOpen = true;
		clearSessionWorkspaceKeys();
	},
};
