/**
 * payloadAdapters/hiltonV1.js
 * ────────────────────────────
 * Normalises a Hilton Group Sales Commission payload to Vanguard V1 shape.
 *
 * Hilton Commission Notification payload (representative subset):
 * {
 *   "confirmation_number":   "HIL-2026-78901",
 *   "property_id":           "HNLDT",
 *   "group_name":            "Vanguard Spring Tournament",
 *   "check_in":              "2026-04-02",
 *   "check_out":             "2026-04-06",
 *   "room_nights_billed":    220,
 *   "commission_amount":     "1820.00",  // string USD
 *   "currency":              "USD",
 *   "partner_reference":     "VGRD-NGB-MIAMI",  // Vanguard NGB tenant ID
 * }
 *
 * Derived fields:
 *   - `idempotencyKey`              ← confirmation_number
 *   - `nationalGoverningBodyId`     ← partner_reference
 *   - `periodStart` / `periodEnd`   ← check_in / check_out
 *   - `roomNights`                  ← room_nights_billed
 *   - `partnerCommissionCents`      ← round(parseFloat(commission_amount) * 100)
 *
 * Note: Only USD payloads are supported.  Non-USD payloads are rejected
 * by the handler with HTTP 400 before this adapter is called.
 */

'use strict';

/**
 * @param {Record<string,unknown>} body  Raw Hilton V1 request body
 * @returns {Record<string,unknown>}     Normalised Vanguard V1 body
 */
function normalise(body) {
  if (String(body.currency || 'USD').toUpperCase() !== 'USD') {
    throw new Error(`Hilton V1 adapter: unsupported currency "${body.currency}". Only USD supported.`);
  }

  const commissionCents = Math.round(parseFloat(String(body.commission_amount || '0')) * 100);

  return {
    idempotencyKey: String(body.confirmation_number || ''),
    nationalGoverningBodyId: String(body.partner_reference || ''),
    periodStart: String(body.check_in || ''),
    periodEnd: String(body.check_out || ''),
    roomNights: Number(body.room_nights_billed) || 0,
    partnerCommissionCents: commissionCents,
    // Preserve the original payload under a vendor-specific key for audit.
    _rawHilton: body,
  };
}

module.exports = {normalise};
