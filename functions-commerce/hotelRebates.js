'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');
const {loadActivePolicy, computePlatformFee} = require('./pricingEngine');
const {getRegistryDb} = require('./cellRouter');
const {sanitizeRebateId, writeHotelRebate} = require('./hotelRebatesHelpers');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const REGION = 'us-east1';
const db = new Proxy({}, { get: (t, p) => { const fs = admin.firestore(); const v = fs[p]; return typeof v === 'function' ? v.bind(fs) : v; } });

function getStripe() {
  const Stripe = require('stripe');
  return new Stripe(STRIPE_SECRET_KEY.value(), {apiVersion: '2024-06-20'});
}

function requireSuper(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const role = request.auth.token.role ?? '';
  if (role !== 'super_admin' && role !== 'global_admin') throw new HttpsError('permission-denied', 'Super admin required.');
}

exports.submitHotelRebateRecord = onCall({region: REGION}, async (request) => {
  requireSuper(request);
  const { tenantId, hotelPartnerId, periodStart, periodEnd, partnerCommissionCents, idempotencyKey, linkedEventId, roomNights } = request.data ?? {};
  if (!tenantId?.trim() || !hotelPartnerId?.trim()) throw new HttpsError('invalid-argument', 'tenantId/hotelPartnerId required.');
  const gross = Number(partnerCommissionCents);
  if (!Number.isInteger(gross) || gross <= 0) throw new HttpsError('invalid-argument', 'partnerCommissionCents must be positive.');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 3) throw new HttpsError('invalid-argument', 'idempotencyKey required.');
  const orgSnap = await db.doc(`organizations/${tenantId}`).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'Tenant not found.');

  const policy = await loadActivePolicy(getRegistryDb());
  const fee = computePlatformFee({ policy, transactionType: 'hotel_rebate', grossCents: gross });
  const vanguardRetentionCents = fee.netCents;
  const ngbCreditCents = fee.platformFeeCents;

  const rebateId = sanitizeRebateId(idempotencyKey);
  const rebateRef = db.collection('hotel_rebates').doc(rebateId);
  const existing = await rebateRef.get();
  if (existing.exists) {
    const prev = existing.data() || {};
    return { rebateId, ngbCreditCents: Number(prev.ngbCreditCents) || 0, vanguardRetentionCents: Number(prev.vanguardRetentionCents) || 0, rateBp: Number(prev.rateBp) || 0, alreadyRecorded: true };
  }

  await writeHotelRebate(db, { rebateId, tenantId, hotelPartnerId, periodStart, periodEnd, gross, ngbCreditCents, vanguardRetentionCents, rateBp: fee.rateBp, policyId: policy.id, policyVersion: policy.version, idempotencyKey, linkedEventId, roomNights, uid: request.auth.uid });

  return { rebateId, ngbCreditCents, vanguardRetentionCents, rateBp: fee.rateBp, alreadyRecorded: false };
});

exports.approveHotelRebatePayout = onCall({region: REGION, secrets: [STRIPE_SECRET_KEY]}, async (request) => {
  requireSuper(request);
  const rebateId = String(request.data?.rebateId ?? '').trim();
  if (!rebateId) throw new HttpsError('invalid-argument', 'rebateId required.');
  const rebateRef = db.collection('hotel_rebates').doc(rebateId);
  const snap = await rebateRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Rebate not found.');
  const rebate = snap.data() || {};
  if (rebate.status === 'transferred') return {status: 'transferred', transferId: rebate.transferId || null, alreadyDone: true};
  if (rebate.status !== 'submitted' && rebate.status !== 'approved') throw new HttpsError('failed-precondition', `Rebate status "${rebate.status}" cannot be paid.`);
  const tenantId = String(rebate.tenantId || '').trim();
  const orgSnap = await db.doc(`organizations/${tenantId}`).get();
  const stripeAccountId = orgSnap.exists ? orgSnap.data()?.stripeAccountId : null;
  if (!stripeAccountId) throw new HttpsError('failed-precondition', 'Tenant lacks Stripe account.');
  const amount = Math.abs(Number(rebate.ngbCreditCents) || 0);
  if (amount <= 0) throw new HttpsError('failed-precondition', 'Zero credit to transfer.');

  const transfer = await getStripe().transfers.create({
    amount, currency: 'usd', destination: stripeAccountId, description: `Vanguard rebate (${rebateId})`,
    metadata: { rebateId, tenantId, hotelPartnerId: String(rebate.hotelPartnerId || '') },
  });

  await rebateRef.set({ status: 'transferred', transferId: transfer.id, transferredAt: admin.firestore.FieldValue.serverTimestamp(), transferredByUid: request.auth.uid }, {merge: true});
  return {status: 'transferred', transferId: transfer.id};
});
