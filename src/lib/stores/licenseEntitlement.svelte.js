import { db } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';

function createLicenseEntitlementStore() {
	let loading = $state(true);
	let entitlement = $state(/** @type {Record<string, unknown> | null} */ (null));
	let clubIdResolved = $state('');
	/** @type {null | (() => void)} */
	let unsub = null;

	function detach() {
		if (unsub) {
			unsub();
			unsub = null;
		}
	}

	/**
	 * @param {import('firebase/auth').User | null} user
	 */
	async function syncFromUser(user) {
		detach();
		entitlement = null;
		clubIdResolved = '';
		if (!user) {
			loading = false;
			return;
		}
		loading = true;
		try {
			const tr = await getIdTokenResult(user, false);
			const cid =
				typeof tr.claims.clubId === 'string' && tr.claims.clubId.trim() ?
					tr.claims.clubId.trim() :
					'';
			if (!cid) {
				loading = false;
				return;
			}
			clubIdResolved = cid;
			unsub = onSnapshot(
				doc(db, 'license_entitlements', cid),
				(snap) => {
					entitlement = snap.exists() ? snap.data() : null;
					loading = false;
				},
				(err) => {
					console.error('[license_entitlements]', err);
					loading = false;
				}
			);
		} catch (e) {
			console.error('[license_entitlements]', e);
			loading = false;
		}
	}

	return {
		syncFromUser,
		detach,
		get loading() {
			return loading;
		},
		get entitlement() {
			return entitlement;
		},
		get clubIdResolved() {
			return clubIdResolved;
		}
	};
}

export const licenseEntitlementStore = createLicenseEntitlementStore();
