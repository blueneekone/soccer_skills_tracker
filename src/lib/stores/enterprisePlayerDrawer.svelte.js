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

	/** @type {{ title?: string, body?: string, meta?: string, href?: string } | null} */
	let consolePayload = $state(null);

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
		/** Text/detail drawer hosted in EnterpriseConsoleShell (director, etc.). */
		get payload() {
			return consolePayload;
		},
		get isOpen() {
			return consolePayload != null || selected != null;
		},
		/**
		 * Player roster: pass a {@link PlayerDrawerRow} with `statsDocId`.
		 * Enterprise console side panel: pass `{ title, body?, meta?, href? }` (no `statsDocId`).
		 * @param {PlayerDrawerRow | { title?: string, body?: string, meta?: string, href?: string }} row
		 * @param {PlayerDrawerActionCallbacks} [callbacks]
		 * @param {{ focusCompliance?: boolean }} [options]
		 */
		open(row, callbacks = undefined, options = undefined) {
			if (
				row &&
				typeof row === 'object' &&
				'statsDocId' in row &&
				typeof /** @type {PlayerDrawerRow} */(row).statsDocId === 'string'
			) {
				consolePayload = null;
				/** @type {PlayerDrawerRow} */
				const r = /** @type {PlayerDrawerRow} */(row);
				selected = r;
				actions = callbacks ?? null;
				focusCompliance =
					options?.focusCompliance === true || r.source === 'registrar';
				return;
			}
			if (row && typeof row === 'object' && 'title' in row) {
				selected = null;
				actions = null;
				focusCompliance = false;
				const o = /** @type {{ title?: string, body?: string, meta?: string, href?: string }} */(row);
				consolePayload = {
					title: o.title ?? 'Details',
					body: typeof o.body === 'string' ? o.body : '',
					meta: typeof o.meta === 'string' ? o.meta : '',
					href: typeof o.href === 'string' ? o.href : '',
				};
			}
		},
		close() {
			selected = null;
			actions = null;
			focusCompliance = false;
			consolePayload = null;
		},
	};
}

export const enterprisePlayerDrawer = createEnterprisePlayerDrawer();
