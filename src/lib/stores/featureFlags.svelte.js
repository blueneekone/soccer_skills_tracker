/**
 * Sprint 2.7 — Platform-wide feature flags.
 *
 * Mirrors the Firestore document `config/feature_flags`. Every authenticated
 * user can read the doc (see firestore.rules) so the Maintenance Mode gate in
 * `(app)/+layout.svelte` can check it against any session. Only super_admin
 * may mutate it (via the System Settings → Feature Flags tab).
 *
 * Subscription is set up via `subscribe()` once authentication is confirmed —
 * NEVER call it before `authStore.isAuthenticated === true` (firestore.rules
 * will reject with permission-denied and pollute the console).
 */

import { db } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * @typedef {{
 *   maintenanceMode: boolean,
 *   maintenanceMessage: string,
 *   enableRagAiCoaching: boolean,
 *   enableVideoProcessing: boolean,
 *   enableRecruiterMarketplace: boolean,
 *   enableLiveScoring: boolean,
 *   updatedAt: unknown,
 *   updatedBy: string,
 * }} FeatureFlags
 */

/** @returns {FeatureFlags} */
function defaults() {
	return {
		maintenanceMode: false,
		maintenanceMessage: '',
		enableRagAiCoaching: true,
		enableVideoProcessing: true,
		enableRecruiterMarketplace: true,
		enableLiveScoring: true,
		updatedAt: null,
		updatedBy: ''
	};
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {FeatureFlags}
 */
function normalize(raw) {
	const base = defaults();
	if (!raw || typeof raw !== 'object') return base;
	return {
		maintenanceMode: raw.maintenanceMode === true,
		maintenanceMessage:
			typeof raw.maintenanceMessage === 'string' ? raw.maintenanceMessage : '',
		enableRagAiCoaching: raw.enableRagAiCoaching !== false,
		enableVideoProcessing: raw.enableVideoProcessing !== false,
		enableRecruiterMarketplace: raw.enableRecruiterMarketplace !== false,
		enableLiveScoring: raw.enableLiveScoring !== false,
		updatedAt: raw.updatedAt ?? null,
		updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : ''
	};
}

function createFeatureFlagsStore() {
	let flags = $state(defaults());
	let loaded = $state(false);
	let err = $state('');
	/** @type {(() => void) | null} */
	let unsub = null;

	function subscribe() {
		if (unsub) return unsub;
		try {
			const ref = doc(db, 'config', 'feature_flags');
			unsub = onSnapshot(
				ref,
				(snap) => {
					if (snap.exists()) {
						flags = normalize(/** @type {Record<string, unknown>} */ (snap.data()));
					} else {
						flags = defaults();
					}
					loaded = true;
					err = '';
				},
				(e) => {
					console.error('[feature-flags] snapshot error', e);
					err = e instanceof Error ? e.message : 'Feature flags unavailable.';
					loaded = true;
				}
			);
		} catch (e) {
			console.error('[feature-flags] subscribe failed', e);
			err = e instanceof Error ? e.message : 'Feature flags unavailable.';
			loaded = true;
		}
		return unsub;
	}

	function teardown() {
		if (unsub) {
			try {
				unsub();
			} catch {
				/* noop */
			}
			unsub = null;
		}
		flags = defaults();
		loaded = false;
	}

	return {
		get flags() { return flags; },
		get maintenanceMode() { return flags.maintenanceMode; },
		get maintenanceMessage() { return flags.maintenanceMessage; },
		get loaded() { return loaded; },
		get err() { return err; },
		subscribe,
		teardown
	};
}

export const featureFlagsStore = createFeatureFlagsStore();
