/**
 * tournamentEventConstants.js
 * ────────────────────────────
 * CommonJS mirror of src/lib/types/tournamentEvent.ts for use in Cloud
 * Functions (ticketing.js, hotelRebates.js, etc.).
 *
 * Keep in sync with the TypeScript source.  Only constants and pure
 * helpers that have no SvelteKit / browser dependencies belong here.
 */

'use strict';

// ── Lifecycle states ──────────────────────────────────────────────────────

/** @type {readonly ['draft','published','concluded','archived']} */
const TOURNAMENT_EVENT_STATUSES = ['draft', 'published', 'concluded', 'archived'];

// ── Tier limits ───────────────────────────────────────────────────────────

/** Minimum unit price in cents (0 = free). */
const MIN_UNIT_PRICE_CENTS = 0;

/** Maximum unit price in cents ($10,000). */
const MAX_UNIT_PRICE_CENTS = 1_000_000;

/** Maximum number of tiers per event. */
const MAX_TIERS_PER_EVENT = 10;

/** Maximum tier ID length (URL-safe slug). */
const MAX_TIER_ID_LENGTH = 32;

/** Maximum label length. */
const MAX_LABEL_LENGTH = 80;

/** Maximum description length. */
const MAX_DESCRIPTION_LENGTH = 500;

/** Maximum `hotelRebates` array elements before arrayUnion is rejected. */
const MAX_HOTEL_REBATES_PER_EVENT = 50;

// ── Computed helpers ──────────────────────────────────────────────────────

/**
 * Total remaining seats across all tiers.
 * @param {Record<string,{capacity:number,soldCount:number}>} ticketTiers
 * @returns {number}
 */
function totalRemainingCapacity(ticketTiers) {
	return Object.values(ticketTiers).reduce(
		(acc, tier) => acc + Math.max(0, tier.capacity - tier.soldCount),
		0,
	);
}

/**
 * Derive a URL-safe tier ID from a human label.
 * Must match the TypeScript implementation in tournamentEvent.ts.
 * @param {string} label
 * @returns {string}
 */
function labelToTierId(label) {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, MAX_TIER_ID_LENGTH);
}

/**
 * Validate a single tier entry submitted by the director.
 * Returns null on success, or an error message string.
 * @param {string} tierId
 * @param {object} tier
 * @returns {string|null}
 */
function validateTier(tierId, tier) {
	if (!/^[a-z0-9_]{1,32}$/.test(tierId)) {
		return `Tier ID "${tierId}" must be 1-32 lowercase alphanumeric/underscore chars.`;
	}
	if (typeof tier.unitPriceCents !== 'number' || !Number.isInteger(tier.unitPriceCents)) {
		return `Tier "${tierId}": unitPriceCents must be an integer.`;
	}
	if (tier.unitPriceCents < MIN_UNIT_PRICE_CENTS || tier.unitPriceCents > MAX_UNIT_PRICE_CENTS) {
		return `Tier "${tierId}": unitPriceCents out of range [${MIN_UNIT_PRICE_CENTS}, ${MAX_UNIT_PRICE_CENTS}].`;
	}
	if (!Number.isInteger(tier.capacity) || tier.capacity < 1) {
		return `Tier "${tierId}": capacity must be a positive integer.`;
	}
	if (typeof tier.label !== 'string' || tier.label.trim().length === 0) {
		return `Tier "${tierId}": label is required.`;
	}
	if (tier.label.length > MAX_LABEL_LENGTH) {
		return `Tier "${tierId}": label exceeds ${MAX_LABEL_LENGTH} chars.`;
	}
	if (tier.description && tier.description.length > MAX_DESCRIPTION_LENGTH) {
		return `Tier "${tierId}": description exceeds ${MAX_DESCRIPTION_LENGTH} chars.`;
	}
	return null;
}

/**
 * Validate the full tier map submitted by the director.
 * Returns an array of error strings (empty = valid).
 * @param {Record<string,object>} tierMap
 * @returns {string[]}
 */
function validateTierMap(tierMap) {
	const errors = [];
	if (!tierMap || typeof tierMap !== 'object' || Array.isArray(tierMap)) {
		return ['ticketTiers must be a non-null object.'];
	}
	const tierIds = Object.keys(tierMap);
	if (tierIds.length === 0) {
		return ['At least one ticket tier is required.'];
	}
	if (tierIds.length > MAX_TIERS_PER_EVENT) {
		errors.push(`At most ${MAX_TIERS_PER_EVENT} tiers allowed per event.`);
	}
	for (const [id, tier] of Object.entries(tierMap)) {
		const err = validateTier(id, tier);
		if (err) errors.push(err);
	}
	return errors;
}

// ── Exports ───────────────────────────────────────────────────────────────

module.exports = {
	TOURNAMENT_EVENT_STATUSES,
	MIN_UNIT_PRICE_CENTS,
	MAX_UNIT_PRICE_CENTS,
	MAX_TIERS_PER_EVENT,
	MAX_TIER_ID_LENGTH,
	MAX_LABEL_LENGTH,
	MAX_DESCRIPTION_LENGTH,
	MAX_HOTEL_REBATES_PER_EVENT,
	totalRemainingCapacity,
	labelToTierId,
	validateTier,
	validateTierMap,
};
