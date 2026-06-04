/**
 * partnerHandlers/hotelRebates.js — Partner-API hotel rebate endpoints (B2)
 * ──────────────────────────────────────────────────────────────────────────
 * Registered on the `/v1/**` API gateway via `register()`.
 *
 * Routes:
 *   POST /v1/partners/hotel-rebates
 *     Body: { nationalGoverningBodyId, periodStart, periodEnd,
 *             roomNights, partnerCommissionCents, idempotencyKey,
 *             timestamp, linkedEventId? }
 *     Auth: partnerAuth (not Firebase JWT)
 *     Returns: { rebateId, ngbCreditCents, vanguardRetentionCents, rateBp }
 *
 *   GET  /v1/partners/hotel-rebates/:rebateId
 *     Auth: partnerAuth
 *     Returns: the rebate doc (status, amounts, linkedEventId)
 *
 * Partner auth is handled upstream by the gateway's `verifyPartnerSignature`
 * middleware (Session B3).  By the time these handlers run, `ctx.partner`
 * is a verified `hotel_partners/{partnerId}` doc snapshot.
 */

'use strict';

const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const {loadActivePolicy, computePlatformFee} = require('../pricingEngine');
const {recordPlatformFee} = require('../feeLedger');
const {getRegistryDb} = require('../cellRouter');

const db = admin.firestore();
// Phase 2, Epic 3 — Teen 13-16 Ad-Block: partner adapter gate.
// Hotel rebates don't carry player PII directly, but the interceptor is
// wired here to document the pattern and catch future payload expansions.
const {assertNoTeenForAdContext} = require('../teenAdInterceptor');

// ── Payload adapters ──────────────────────────────────────────────────────

const ADAPTERS = {
  vanguard_v1: require('./payloadAdapters/vanguardV1'),
  marriott_v1: require('./payloadAdapters/marriottV1'),
  hilton_v1:   require('./payloadAdapters/hiltonV1'),
};

/**
 * Normalise the raw request body through the partner-configured adapter.
 * Falls back to the identity (vanguard_v1) adapter for unknown formats.
 * @param {string} format
 * @param {Record<string,unknown>} body
 * @returns {Record<string,unknown>}
 */
function normaliseBody(format, body) {
  const adapter = ADAPTERS[format] || ADAPTERS.vanguard_v1;
  return adapter.normalise(body);
}

/**
 * Sanitise a partner settlement reference into a valid Firestore doc ID.
 * Same algorithm as hotelRebates.js for consistency.
 */
function sanitizeRebateId(raw) {
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

/**
 * POST /v1/partners/hotel-rebates
 * @param {import('../apiGateway').GatewayContext} ctx
 */
async function partnerHotelRebatesPost(ctx) {
  // Phase 2, Epic 3: assert no teen subjects in the partner payload.
  // `players` is an optional array of {email} objects that future partners
  // may include.  For current hotel-rebate payloads (no player PII), the
  // array is empty and the assertion is a no-op.  This wiring ensures that
  // if a future payload schema adds player references, the gate is already in place.
  const payloadPlayers = Array.isArray(ctx.body?.players) ? ctx.body.players : [];
  await assertNoTeenForAdContext(payloadPlayers, 'partner_adapter', {
    callerUid: ctx.partnerDoc?.id || 'partner',
    callerIp:  ctx.ip || 'unknown',
  });

  // Normalise through the partner-specific adapter before extracting fields.
  const partner = ctx.partner;
  const rawBody = ctx.body ?? {};
  let normBody;
  try {
    normBody = normaliseBody(partner?.payloadFormat ?? 'vanguard_v1', rawBody);
  } catch (adapterErr) {
    return {status: 400, body: {error: 'invalid_payload', message: adapterErr.message}};
  }

  const {
    nationalGoverningBodyId,
    periodStart,
    periodEnd,
    roomNights,
    partnerCommissionCents,
    idempotencyKey,
    linkedEventId,
  } = normBody;

  // ── Validate body ───────────────────────────────────────────────────────
  if (typeof nationalGoverningBodyId !== 'string' || !nationalGoverningBodyId.trim()) {
    return {status: 400, body: {error: 'invalid_argument', message: 'nationalGoverningBodyId required.'}};
  }

  const gross = Number(partnerCommissionCents);
  if (!Number.isInteger(gross) || gross <= 0) {
    return {status: 400, body: {error: 'invalid_argument', message: 'partnerCommissionCents must be a positive integer.'}};
  }

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 3) {
    return {status: 400, body: {error: 'invalid_argument', message: 'idempotencyKey required (use partner settlement reference).'}};
  }

  // ── NGB allowlist check ─────────────────────────────────────────────────
  if (!partner) {
    return {status: 500, body: {error: 'internal', message: 'Partner context missing.'}};
  }
  const ngbAllowlist = partner.ngbAllowlist ?? [];
  if (ngbAllowlist.length > 0 && !ngbAllowlist.includes(nationalGoverningBodyId)) {
    return {
      status: 403,
      body: {
        error: 'permission_denied',
        message: `Partner is not authorised to file rebates for NGB "${nationalGoverningBodyId}".`,
      },
    };
  }

  // ── Tenant lookup ───────────────────────────────────────────────────────
  const orgSnap = await db.doc(`organizations/${nationalGoverningBodyId}`).get();
  if (!orgSnap.exists) {
    return {status: 404, body: {error: 'not_found', message: 'NGB tenant not found.'}};
  }

  // ── Pricing ─────────────────────────────────────────────────────────────
  const policy = await loadActivePolicy(getRegistryDb());
  const fee = computePlatformFee({
    policy,
    transactionType: 'hotel_rebate',
    grossCents: gross,
  });
  const vanguardRetentionCents = fee.netCents;
  const ngbCreditCents = fee.platformFeeCents;

  // ── Idempotency ─────────────────────────────────────────────────────────
  const rebateId = sanitizeRebateId(idempotencyKey);
  const rebateRef = db.collection('hotel_rebates').doc(rebateId);
  const existing = await rebateRef.get();
  if (existing.exists) {
    const prev = existing.data() || {};
    logger.info('[partnerHotelRebates] idempotent replay', {rebateId, partnerId: partner.id});
    return {
      status: 200,
      body: {
        rebateId,
        ngbCreditCents: Number(prev.ngbCreditCents) || 0,
        vanguardRetentionCents: Number(prev.vanguardRetentionCents) || 0,
        rateBp: Number(prev.rateBp) || 0,
        alreadyRecorded: true,
      },
    };
  }

  // ── Write ───────────────────────────────────────────────────────────────
  const batch = db.batch();
  batch.set(rebateRef, {
    rebateId,
    tenantId: nationalGoverningBodyId,
    hotelPartnerId: partner.id,
    partnerName: partner.name ?? null,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    roomNights: typeof roomNights === 'number' ? roomNights : null,
    partnerCommissionCents: gross,
    ngbCreditCents,
    vanguardRetentionCents,
    rateBp: fee.rateBp,
    policyId: policy.id,
    policyVersion: policy.version,
    status: 'submitted',
    source: 'partner_api',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    idempotencyKey,
    linkedEventId: linkedEventId || null,
  });

  recordPlatformFee(batch, db, {
    tenantId: nationalGoverningBodyId,
    transactionType: 'hotel_rebate',
    sourceDocPath: `hotel_rebates/${rebateId}`,
    grossCents: gross,
    platformFeeCents: ngbCreditCents,
    netCents: vanguardRetentionCents,
    rateBp: fee.rateBp,
    policyId: policy.id,
    policyVersion: policy.version,
    idempotencyKey,
  });

  // Optional event linkage (B6 — mirror summary onto tournament_events doc)
  if (linkedEventId && typeof linkedEventId === 'string') {
    const eventRef = db.doc(`tournament_events/${linkedEventId}`);
    batch.update(eventRef, {
      hotelRebates: admin.firestore.FieldValue.arrayUnion({
        rebateId,
        partnerId: partner.id,
        ngbCreditCents,
        roomNights: typeof roomNights === 'number' ? roomNights : null,
        recordedAt: new Date().toISOString(),
      }),
    });
  }

  await batch.commit();

  logger.info('[partnerHotelRebates] recorded', {
    rebateId,
    tenantId: nationalGoverningBodyId,
    partnerId: partner.id,
    gross,
    ngbCreditCents,
  });

  return {
    status: 201,
    body: {rebateId, ngbCreditCents, vanguardRetentionCents, rateBp: fee.rateBp},
  };
}

/**
 * GET /v1/partners/hotel-rebates/:rebateId
 * @param {import('../apiGateway').GatewayContext} ctx
 */
async function partnerHotelRebatesGet(ctx) {
  const rebateId = ctx.pathParts[2]; // partners / hotel-rebates / :rebateId
  if (!rebateId) {
    return {status: 400, body: {error: 'invalid_argument', message: 'rebateId required.'}};
  }

  const snap = await db.doc(`hotel_rebates/${rebateId}`).get();
  if (!snap.exists) {
    return {status: 404, body: {error: 'not_found', message: 'Rebate not found.'}};
  }

  const data = snap.data() || {};

  // Partners can only read their own rebates.
  if (data.hotelPartnerId !== ctx.partner?.id) {
    return {status: 403, body: {error: 'permission_denied', message: 'Not your rebate.'}};
  }

  return {
    status: 200,
    body: {
      rebateId: data.rebateId,
      tenantId: data.tenantId,
      status: data.status,
      partnerCommissionCents: data.partnerCommissionCents,
      ngbCreditCents: data.ngbCreditCents,
      vanguardRetentionCents: data.vanguardRetentionCents,
      rateBp: data.rateBp,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      roomNights: data.roomNights,
      linkedEventId: data.linkedEventId ?? null,
      submittedAt: data.submittedAt ?? null,
    },
  };
}

module.exports = {partnerHotelRebatesPost, partnerHotelRebatesGet};
