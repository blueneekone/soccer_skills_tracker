/**
 * Player OS billing / subscription gate — mirrors backend `license_entitlements`
 * synced by Stripe webhook (`stripe_customer_id`, `stripe_subscription_id`,
 * `subscription_status`, `tier`, `seats_limit`, …) and exemptions
 * (`billing_exempt`, `grandfathered`).
 * @see functions/index.js `handleStripeWebhookEvent`, `assertClubSubscriptionWritable`
 */

import { isSubscriptionReadOnly } from '$lib/auth/billing.js';

/**
 * Stripe-backed fields on `license_entitlements/{clubId}` (webhook-maintained).
 * @typedef {Record<string, unknown> | null | undefined} LicenseEntitlementData
 */

/**
 * @typedef {'none' | 'billing_readonly'} PlayerOsBillingSeverity
 */

/**
 * Result of evaluating whether athlete surfaces should be locked for billing/compliance UX.
 *
 * @typedef {{
 *   blocked: boolean;
 *   reasons: string[];
 *   severity: PlayerOsBillingSeverity;
 *   subscriptionStatus: string | null;
 * }} PlayerOsBlockedResult
 */

/**
 * Decide if Player OS should block training/workflow CTAs for subscription read-only mode.
 * Webhook-maintained fields include `subscription_status`, `tier`, `stripe_subscription_id`, exemptions `billing_exempt` / `grandfathered` (see `functions/index.js`).
 *
 * @param {{ role?: string; clubId?: string } | null | undefined} profile
 * @param {Record<string, unknown> | null | undefined} [clubSnap] Clubs doc (`clubs/{clubId}`) — `isInfinite` bypasses Stripe read-only.
 * @param {LicenseEntitlementData} [licenseEntitlementSnap] Snapshot data from `license_entitlements/{clubId}`
 * @returns {PlayerOsBlockedResult}
 */
export function computePlayerOsBlocked(profile, clubSnap, licenseEntitlementSnap) {
	const role = typeof profile?.role === 'string' ? profile.role : '';
	const clubId = typeof profile?.clubId === 'string' ? profile.clubId.trim() : '';

	const infinite = clubSnap && typeof clubSnap === 'object' && clubSnap.isInfinite === true;

	const reasons = [];

	if (!clubId || clubId === 'admin') {
		return { blocked: false, reasons: [], severity: 'none', subscriptionStatus: null };
	}

	// Phase 2, Epic 2 — Session F: also forward the org-level billingModel.
	// The clubSnap is `clubs/{id}` (not `organizations/{id}`), but the cutover
	// path stamps `billingModel` on both `license_entitlements` and the org
	// doc, so we read whichever is present on the entitlement snap as a fallback.
	const billingModel =
		licenseEntitlementSnap && typeof licenseEntitlementSnap === 'object' &&
		typeof licenseEntitlementSnap.billingModel === 'string'
			? licenseEntitlementSnap.billingModel
			: undefined;

	const readOnly = isSubscriptionReadOnly(role, clubId, licenseEntitlementSnap, {
		clubInfinite: infinite,
		billingModel,
	});

	const raw =
		licenseEntitlementSnap && typeof licenseEntitlementSnap === 'object'
			? licenseEntitlementSnap.subscription_status
			: null;
	const subscriptionStatus =
		raw === undefined || raw === null || raw === ''
			? null
			: String(raw).toLowerCase();

	if (!readOnly) {
		return {
			blocked: false,
			reasons: [],
			severity: 'none',
			subscriptionStatus,
		};
	}

	let msg =
		subscriptionStatus === 'past_due'
			? 'Club billing is past due — subscription is read-only.'
			: subscriptionStatus === 'canceled'
				? 'Club subscription canceled — roster features are read-only.'
				: 'Club license is inactive — athlete tools are gated until billing is restored.';
	reasons.push(msg);

	const tier =
		licenseEntitlementSnap && typeof licenseEntitlementSnap === 'object' &&
		typeof licenseEntitlementSnap.tier === 'string'
			? licenseEntitlementSnap.tier.trim()
			: '';
	if (tier) {
		reasons.push(`Current tier snapshot: ${tier}.`);
	}

	return {
		blocked: true,
		reasons,
		severity: 'billing_readonly',
		subscriptionStatus,
	};
}
