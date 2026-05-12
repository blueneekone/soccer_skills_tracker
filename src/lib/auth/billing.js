/**
 * Tier strings (including `free_trial`) live on `license_entitlements`.
 * Stripe-backed status: `active` | `past_due` | `canceled`.
 *
 * Phase 2, Epic 2 — Session F: a fourth signal now bypasses the entire
 * read-only paywall: `organizations/{clubId}.billingModel === 'transaction_billing'`.
 * Transaction-billed tenants pay only when money moves through the platform
 * (registrations, tickets, hotel rebates) — there is no off-season "you
 * stopped paying" state, so the paywall never trips.  This signal is also
 * mirrored as a JWT custom claim by `syncUserClaims` for fast reads.
 */

/**
 * Epic 9 + Phase 2 Epic 2: read-only ONLY when a legacy Stripe subscription
 * is explicitly inactive (past_due / canceled) AND the tenant has not been
 * migrated to transaction-based billing.
 *
 * Bypass paths (full access):
 *   - super_admin / global_admin
 *   - opts.clubInfinite (promo / enterprise)
 *   - opts.billingModel === 'transaction_billing' (Phase 2 cutover)
 *   - role === 'recruiter' (governed by recruiter_accounts + clearance, not this gate)
 *   - ent.billing_exempt / ent.grandfathered
 *   - No entitlement doc / no subscription_status (legacy untouched tenants)
 *   - subscription_status === 'active'
 *
 * @param {string} role
 * @param {string} clubId Resolved club scope (JWT / profile).
 * @param {Record<string, unknown> | null | undefined} ent license_entitlements snapshot or null.
 * @param {{ clubInfinite?: boolean, billingModel?: string }} [opts]
 *   `clubInfinite` — when `clubs/{clubId}.isInfinite` is true.
 *   `billingModel` — read from `organizations/{clubId}.billingModel` (JWT claim or store).
 * @returns {boolean}
 */
export function isSubscriptionReadOnly(role, clubId, ent, opts = {}) {
	if (role === 'super_admin' || role === 'global_admin') return false;
	// Recruiter access path runs through `recruiter_accounts/{email}` plus the
	// clearance gate — the legacy club entitlement check does not apply.
	if (role === 'recruiter') return false;
	if (opts.clubInfinite === true) return false;
	// Phase 2 cutover — transaction-billed tenants never hit the paywall.
	if (opts.billingModel === 'transaction_billing') return false;
	if (!clubId || typeof clubId !== 'string' || !clubId.trim()) return false;
	if (!ent || typeof ent !== 'object') return false;
	if (ent.billing_exempt === true || ent.grandfathered === true) return false;
	// Org-doc field can also live on the entitlement itself (defensive — the
	// legacy webhook handler writes both during the cutover window).
	const entBillingModel = ent.billingModel;
	if (typeof entBillingModel === 'string' && entBillingModel === 'transaction_billing') {
		return false;
	}
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
