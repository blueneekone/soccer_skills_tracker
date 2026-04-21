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
 * @property {'coach' | 'admin' | 'registrar'} source Which surface opened the drawer (copy / permissions)
 */

function createEnterprisePlayerDrawer() {
	/** @type {PlayerDrawerRow | null} */
	let selected = $state(null);

	/** @type {PlayerDrawerActionCallbacks | null} */
	let actions = $state(null);

	/** When true, PlayerDetailDrawer scrolls to Household & Compliance first. */
	let focusCompliance = $state(false);

	return {
		get selected() {
			return selected;
		},
		get actions() {
			return actions;
		},
		get focusCompliance() {
			return focusCompliance;
		},
		/**
		 * @param {PlayerDrawerRow} row
		 * @param {PlayerDrawerActionCallbacks} [callbacks]
		 * @param {{ focusCompliance?: boolean }} [options]
		 */
		open(row, callbacks = undefined, options = undefined) {
			selected = row;
			actions = callbacks ?? null;
			focusCompliance =
				options?.focusCompliance === true || row?.source === 'registrar';
		},
		close() {
			selected = null;
			actions = null;
			focusCompliance = false;
		},
		get isOpen() {
			return selected != null;
		},
	};
}

export const enterprisePlayerDrawer = createEnterprisePlayerDrawer();
