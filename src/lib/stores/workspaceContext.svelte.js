/**
 * Workspace context: last pivot from the sidebar switcher + high-level active role bucket.
 */

/** @type {string} */
let activePivotKey = $state('');

/** @type {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'household'} */
let activeContext = $state('');

export const workspaceContextStore = {
	get activePivotKey() {
		return activePivotKey;
	},
	get activeContext() {
		return activeContext;
	},
	/**
	 * @param {string} key
	 */
	setPivot(key) {
		activePivotKey = key;
	},
	/**
	 * @param {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'household'} ctx
	 */
	setActiveContext(ctx) {
		activeContext = ctx;
	},
	clear() {
		activePivotKey = '';
		activeContext = '';
	},
};
