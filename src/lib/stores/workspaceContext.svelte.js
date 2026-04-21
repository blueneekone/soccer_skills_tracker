/**
 * Workspace context: switcher pivot + active role bucket + scoped club/team for zero-trust UI.
 */

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
	},
	/**
	 * @param {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'recruiter' | 'household'} ctx
	 */
	setActiveContext(ctx) {
		activeContext = ctx;
	},
	/**
	 * @param {string} id
	 */
	setActiveClubId(id) {
		activeClubId = (id || '').trim();
	},
	/**
	 * @param {string} id
	 */
	setActiveTeamId(id) {
		activeTeamId = (id || '').trim();
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
	},
};
