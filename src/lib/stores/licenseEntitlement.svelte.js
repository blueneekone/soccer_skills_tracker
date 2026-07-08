import { db } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';

function createLicenseEntitlementStore() {
	let loading = $state(true);
	let entitlement = $state(/** @type {Record<string, unknown> | null} */ (null));
	let clubIdResolved = $state('');
	/** `clubs/{clubId}` — sport, isInfinite, etc. */
	let clubDoc = $state(/** @type {Record<string, unknown> | null} */ (null));
	/** @type {null | (() => void)} */
	let unsub = null;
	/** @type {null | (() => void)} */
	let unsubClub = null;

	function detach() {
		if (unsub) {
			unsub();
			unsub = null;
		}
		if (unsubClub) {
			unsubClub();
			unsubClub = null;
		}
	}

	/**
	 * @param {import('firebase/auth').User | null} user
	 */
	async function syncFromUser(user) {
		detach();
		entitlement = null;
		clubDoc = null;
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

			unsubClub = onSnapshot(
				doc(db, 'clubs', cid),
				(snap) => {
					clubDoc = snap.exists() ? snap.data() : null;
				},
				(err) => {
					console.error('[clubs entitlement club snapshot]', err);
					clubDoc = null;
				}
			);

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
		},
		get clubDoc() {
			return clubDoc;
		},
		/** Promo / enterprise: unlimited seats & bypass Stripe read-only when true on `clubs/{id}` */
		get isInfiniteClub() {
			return clubDoc?.isInfinite === true;
		},
		/**
		 * Phase 2, Epic 2 — Session F.
		 * Resolved billing model for the active club.  Reads `organizations/`
		 * via `clubDoc.billingModel` (preferred, since `syncUserClaims` writes
		 * the field there) and falls back to the legacy `entitlement.billingModel`
		 * field which the cutover webhook also stamps during the migration
		 * window.  `undefined` when neither doc has been migrated.
		 *
		 * Used by:
		 *   • billing.js#isSubscriptionReadOnly (paywall bypass)
		 *   • Director OS EntitlementModule (collapse legacy banner)
		 *   • Marketing /upgrade page ("you're already on the new model")
		 *
		 * @returns {string | undefined}
		 */
		get billingModel() {
			const fromClub =
				typeof clubDoc?.billingModel === 'string' && clubDoc.billingModel.trim() ?
					clubDoc.billingModel.trim() :
					undefined;
			if (fromClub) return fromClub;
			const fromEnt =
				typeof entitlement?.billingModel === 'string' && entitlement.billingModel.trim() ?
					entitlement.billingModel.trim() :
					undefined;
			return fromEnt;
		},
		get isTransactionBilled() {
			const fromClub =
				typeof clubDoc?.billingModel === 'string' && clubDoc.billingModel.trim() ?
					clubDoc.billingModel.trim() :
					undefined;
			if (fromClub === 'transaction_billing') return true;
			const fromEnt =
				typeof entitlement?.billingModel === 'string' && entitlement.billingModel.trim() ?
					entitlement.billingModel.trim() :
					undefined;
			return fromEnt === 'transaction_billing';
		},
		get billingStatus() {
			return entitlement?.billing_status || 'active';
		},
		get paymentFailedAt() {
			return entitlement?.payment_failed_at || null;
		},
		get daysPastDue() {
			if (!this.paymentFailedAt || this.billingStatus !== 'past_due') return 0;
			const failedAtMs = this.paymentFailedAt.toMillis ? this.paymentFailedAt.toMillis() : this.paymentFailedAt;
			const nowMs = Date.now();
			const diffMs = nowMs - failedAtMs;
			return Math.floor(diffMs / (24 * 60 * 60 * 1000));
		}
	};
}

export const licenseEntitlementStore = createLicenseEntitlementStore();
