/**
 * Global player detail drawer for coach roster + admin platform roster (row → drawer).
 * Rendered by PlayerDetailDrawer.svelte from (app)/+layout.
 */

/**
 * @typedef PlayerDrawerActionCallbacks
 * @property {() => void} [assignDrill]
 * @property {() => void} [editProfile]
 * @property {() => void | Promise<void>} [removeFromRoster]
 */

/**
 * @typedef PlayerDrawerRow
 * @property {string} id
 * @property {string} displayName
 * @property {string} teamId
 * @property {string} [teamLabel]
 * @property {string} statsDocId Firestore document id for `player_stats/{statsDocId}`
 * @property {string | null} playerEmail Lowercase email when linked
 * @property {string | null} jersey
 * @property {string | null} ageGroup
 * @property {string | null} position
 * @property {'active' | 'pending'} status
 * @property {string} lastActiveLabel
 * @property {'coach' | 'admin'} source Which surface opened the drawer (copy / permissions)
 */

function createEnterprisePlayerDrawer() {
	/** @type {PlayerDrawerRow | null} */
	let selected = $state(null);

	/** @type {PlayerDrawerActionCallbacks | null} */
	let actions = $state(null);

	return {
		get selected() {
			return selected;
		},
		get actions() {
			return actions;
		},
		/**
		 * @param {PlayerDrawerRow} row
		 * @param {PlayerDrawerActionCallbacks} [callbacks]
		 */
		open(row, callbacks = undefined) {
			selected = row;
			actions = callbacks ?? null;
		},
		close() {
			selected = null;
			actions = null;
		},
		get isOpen() {
			return selected != null;
		},
	};
}

export const enterprisePlayerDrawer = createEnterprisePlayerDrawer();
