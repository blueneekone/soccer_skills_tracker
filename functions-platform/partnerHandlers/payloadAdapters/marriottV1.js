/**
 * payloadAdapters/marriottV1.js
 * ──────────────────────────────
 * Normalises a Marriott Bonvoy Group Commission payload to Vanguard V1 shape.
 *
 * Marriott Commission Statement API payload (representative subset):
 * {
 *   "settlement_id":         "MARR-20260430-ABC123",
 *   "property_code":         "WASDC",
 *   "group_code":            "VGRD-SPRING26",
 *   "arrival_date":          "2026-04-01",
 *   "departure_date":        "2026-04-05",
 *   "occupied_room_nights":  180,
 *   "commission_usd":        1450.00,    // floating point USD
 *   "ngb_account_id":        "acme_fc",  // Vanguard NGB tenant ID agreed with Marriott
 * }
 *
 * Derived fields:
 *   - `idempotencyKey`              ← settlement_id
 *   - `nationalGoverningBodyId`     ← ngb_account_id
 *   - `periodStart` / `periodEnd`   ← arrival_date / departure_date
 *   - `roomNights`                  ← occupied_room_nights
 *   - `partnerCommissionCents`      ← round(commission_usd * 100)
 */

'use strict';

/**
 * @param {Record<string,unknown>} body  Raw Marriott V1 request body
 * @returns {Record<string,unknown>}     Normalised Vanguard V1 body
 */
function normalise(body) {
  const commissionCents = Math.round(Number(body.commission_usd ?? 0) * 100);

  return {
    idempotencyKey: String(body.settlement_id || ''),
    nationalGoverningBodyId: String(body.ngb_account_id || ''),
    periodStart: String(body.arrival_date || ''),
    periodEnd: String(body.departure_date || ''),
    roomNights: Number(body.occupied_room_nights) || 0,
    partnerCommissionCents: commissionCents,
    // Preserve the original payload under a vendor-specific key for audit.
    _rawMarriott: body,
  };
}

module.exports = {normalise};
