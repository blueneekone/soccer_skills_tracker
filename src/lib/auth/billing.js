/**
 * Tier strings (including `free_trial`) live on `license_entitlements`.
 * Stripe-backed status: `active` | `past_due` | `canceled`.
 */

/**
 * Epic 9: read-only when subscription is explicitly inactive (past_due / canceled).
 * Legacy: no doc or empty `subscription_status` → full access until migrated.
 * Exempt: billing_exempt / grandfathered.
 *
 * @param {string} role
 * @param {string} clubId Resolved club scope (JWT / profile).
 * @param {Record<string, unknown> | null | undefined} ent Snapshot data or null.
 * @param {{ clubInfinite?: boolean }} [opts] When `clubs/{clubId}.isInfinite` is true, skip read-only billing.
 * @returns {boolean}
 */
export function isSubscriptionReadOnly(role, clubId, ent, opts = {}) {
	if (role === 'super_admin') return false;
	if (opts.clubInfinite === true) return false;
	if (!clubId || typeof clubId !== 'string' || !clubId.trim()) return false;
	if (!ent || typeof ent !== 'object') return false;
	if (ent.billing_exempt === true || ent.grandfathered === true) return false;
	const raw = ent.subscription_status;
	if (raw === undefined || raw === null || raw === '') return false;
	const status = String(raw).toLowerCase();
	if (status === 'active') return false;
	return true;
}

/**
 * @deprecated Use isSubscriptionReadOnly + navigation; no hard paywall redirect.
 */
export function isBillingBlocked(role, clubId, ent) {
	return isSubscriptionReadOnly(role, clubId, ent);
}
