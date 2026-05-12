/**
 * payloadAdapters/vanguardV1.js
 * ──────────────────────────────
 * Identity adapter — Vanguard's native payload shape is already in the
 * format expected by `partnerHandlers/hotelRebates.js`.  This file serves
 * as the canonical reference for what that shape must look like.
 *
 * Expected body:
 * {
 *   nationalGoverningBodyId: string,   // Vanguard tenant / NGB ID
 *   periodStart: string (ISO-8601),
 *   periodEnd: string (ISO-8601),
 *   roomNights: number,
 *   partnerCommissionCents: number,    // positive integer cents
 *   idempotencyKey: string,            // partner settlement reference
 *   timestamp: number,                 // unix ms (required for replay protection)
 *   linkedEventId?: string,            // optional: link to tournament_events doc
 * }
 */

'use strict';

/**
 * @param {Record<string,unknown>} body  Raw request body
 * @returns {Record<string,unknown>}     Normalised Vanguard V1 body
 */
function normalise(body) {
  // Already in the correct shape — return as-is.
  return body;
}

module.exports = {normalise};
