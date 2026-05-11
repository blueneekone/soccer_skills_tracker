/**
 * Workspace context: switcher pivot + active role bucket + scoped club/team for zero-trust UI.
 * Defensive sessionStorage: never throw on read/write; profile fill when cache is empty is driven
 * from `auth.svelte.js` via `hydrateContext` only (no $effect: never write club/team/context reactively).
 */

import { browser } from '$app/environment';

// ── sessionStorage keys (tenant scope; tab session) ───────────────────────
const K_PIVOT    = 'sst-ws-pivot';
const K_CONTEXT  = 'sst-ws-ctx';
const K_CLUB     = 'sst-ws-club';
const K_TEAM     = 'sst-ws-team';
const K_ORG      = 'sst-ws-org';      // umbrella Rec-Center / org boundary
const K_DIVISION = 'sst-ws-div';      // active division within the org (= clubId alias)
const K_SPORT    = 'sst-ws-sport';    // active sportId for the current division

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
	for (const k of [K_PIVOT, K_CONTEXT, K_CLUB, K_TEAM, K_ORG, K_DIVISION, K_SPORT]) {
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
	safeSessionSet(K_PIVOT,    activePivotKey);
	safeSessionSet(K_CONTEXT,  activeContext);
	safeSessionSet(K_CLUB,     activeClubId);
	safeSessionSet(K_TEAM,     activeTeamId);
	safeSessionSet(K_ORG,      activeOrgId);
	safeSessionSet(K_DIVISION, activeDivisionId);
	safeSessionSet(K_SPORT,    activeSportId);
}

/** @type {string} */
let activePivotKey = $state('');

/** @type {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'recruiter' | 'household'} */
let activeContext = $state('');

/** Active club for director/registrar sessions (cleared on pivot). */
let activeClubId = $state('');

/** Active team for coach sessions (cleared on pivot). */
let activeTeamId = $state('');

/**
 * Umbrella organisation ID (e.g. a Rec-Center owning multiple sport divisions).
 * Optional — clubs without an `orgId` continue to work as single-level tenants.
 */
let activeOrgId = $state('');

/**
 * Active division within the org (canonical alias for `activeClubId` in the
 * new hierarchy).  Set together with `activeClubId` on every division switch
 * so both keys remain in sync for backward-compat consumers.
 */
let activeDivisionId = $state('');

/**
 * Active sport identifier for the current division — drives sport-config hot-swap.
 * Persisted to session so a page refresh restores the correct radar/bento theme.
 */
let activeSportId = $state('soccer');

/**
 * Loaded `sports_configs/{sportId}` document for the active division.
 * Populated by `WorkspaceContextSwitcher` after a division switch.
 * Consumers read this to get attribute definitions and accent colors.
 * @type {null | Record<string, unknown>}
 */
let activeSportConfig = $state(null);

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
	// Org-topology keys (optional; absent in legacy sessions)
	const org   = safeSessionGet(K_ORG);
	const div   = safeSessionGet(K_DIVISION);
	const sport = safeSessionGet(K_SPORT);
	if (org !== null)   { const n = typeof org   === 'string' ? org.trim()   : ''; if (activeOrgId      !== n) activeOrgId      = n; }
	if (div !== null)   { const n = typeof div   === 'string' ? div.trim()   : ''; if (activeDivisionId !== n) activeDivisionId = n; }
	if (sport !== null) { const n = typeof sport === 'string' && sport.trim() ? sport.trim() : 'soccer'; if (activeSportId !== n) activeSportId = n; }
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
	const oid =
		typeof profile.orgId === 'string' && profile.orgId.trim() ? profile.orgId.trim() : '';
	const sport =
		typeof profile.sportId === 'string' && profile.sportId.trim() ? profile.sportId.trim() : '';
	const tidRaw =
		typeof profile.teamId === 'string' && profile.teamId.trim() ? profile.teamId.trim() : '';
	/** @type {string} */
	const teamId = tidRaw && tidRaw !== 'admin' ? tidRaw : '';

	// Org-topology: always sync orgId from profile — it is a stable identity boundary
	if (oid && activeOrgId !== oid) { activeOrgId = oid; }
	// activeDivisionId mirrors clubId (canonical in new topology)
	if (pid && activeDivisionId !== pid) activeDivisionId = pid;
	// sportId backfill (non-destructive: only set if session cache is empty)
	if (sport && activeSportId === 'soccer' && activeSportId !== sport) activeSportId = sport;

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
	/** Umbrella org ID (Rec-Center / league). Empty string when not applicable. */
	get activeOrgId() {
		return activeOrgId;
	},
	/** Active division within the org. Canonical alias for `activeClubId` in the new topology. */
	get activeDivisionId() {
		return activeDivisionId;
	},
	/** sportId for the current division — e.g. 'soccer', 'basketball'. */
	get activeSportId() {
		return activeSportId;
	},
	/** Loaded `sports_configs` document for the active division. Null until first switch. */
	get activeSportConfig() {
		return activeSportConfig;
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
		// Keep division alias in sync
		if (activeDivisionId !== activeClubId) activeDivisionId = activeClubId;
		persistToSession();
	},
	/**
	 * Set the active umbrella org. Does NOT reset division/club.
	 * @param {string} id
	 */
	setActiveOrgId(id) {
		activeOrgId = (id || '').trim();
		persistToSession();
	},
	/**
	 * Set the active division (= club in new topology) and keep `activeClubId` in sync.
	 * @param {string} id
	 */
	setActiveDivisionId(id) {
		activeDivisionId = (id || '').trim();
		activeClubId = activeDivisionId;
		persistToSession();
	},
	/**
	 * Update the active sport identifier and clear the cached sport config
	 * so the switcher reloads it from Firestore.
	 * @param {string} id  e.g. 'soccer' | 'basketball' | 'lacrosse'
	 */
	setActiveSportId(id) {
		const next = (id || 'soccer').trim();
		if (activeSportId !== next) {
			activeSportId = next;
			activeSportConfig = null;   // force reload
		}
		persistToSession();
	},
	/**
	 * Store the loaded sport config document from `sports_configs/{sportId}`.
	 * Called by `WorkspaceContextSwitcher` after a successful Firestore fetch.
	 * @param {Record<string, unknown> | null} config
	 */
	setActiveSportConfig(config) {
		activeSportConfig = config;
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
	/**
	 * Clear club/team scope (call before applying a new workspace pivot).
	 * Intentionally preserves `activeOrgId` — org context persists across
	 * division switches within the same session.
	 */
	resetScope() {
		if (activeClubId === '' && activeTeamId === '' && activeDivisionId === '') return;
		activeClubId = '';
		activeTeamId = '';
		activeDivisionId = '';
	},
	clear() {
		if (activePivotKey   !== '') activePivotKey   = '';
		if (activeContext    !== '') activeContext     = '';
		if (activeClubId     !== '') activeClubId      = '';
		if (activeTeamId     !== '') activeTeamId      = '';
		if (activeOrgId      !== '') activeOrgId       = '';
		if (activeDivisionId !== '') activeDivisionId  = '';
		if (activeSportId    !== 'soccer') activeSportId = 'soccer';
		activeSportConfig = null;
		if (isSidebarOpen !== true) isSidebarOpen = true;
		clearSessionWorkspaceKeys();
	},
};
