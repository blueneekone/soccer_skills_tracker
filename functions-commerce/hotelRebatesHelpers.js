'use strict';

const admin = require('firebase-admin');
const {loadActivePolicy, computePlatformFee} = require('./pricingEngine');
const {recordPlatformFee} = require('./feeLedger');

function sanitizeRebateId(raw) {
  return String(raw).replace(/[\/.#$\[\]]/g, '_').slice(0, 1500);
}

async function writeHotelRebate(db, {
  rebateId, tenantId, hotelPartnerId, periodStart, periodEnd, gross,
  ngbCreditCents, vanguardRetentionCents, rateBp, policyId, policyVersion,
  idempotencyKey, linkedEventId, roomNights, uid
}) {
  const batch = db.batch();
  const rebateRef = db.collection('hotel_rebates').doc(rebateId);
  batch.set(rebateRef, {
    rebateId, tenantId, hotelPartnerId, periodStart: periodStart || null, periodEnd: periodEnd || null,
    partnerCommissionCents: gross, ngbCreditCents, vanguardRetentionCents, rateBp, policyId, policyVersion,
    status: 'submitted', source: 'super_admin_console', submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    submittedByUid: uid, idempotencyKey, linkedEventId: linkedEventId || null, roomNights: typeof roomNights === 'number' ? roomNights : null,
  });

  recordPlatformFee(batch, db, {
    tenantId, transactionType: 'hotel_rebate', sourceDocPath: `hotel_rebates/${rebateId}`,
    grossCents: gross, platformFeeCents: ngbCreditCents, netCents: vanguardRetentionCents, rateBp, policyId, policyVersion,
    idempotencyKey: `hotel_rebate_${rebateId}`,
  });

  if (linkedEventId && typeof linkedEventId === 'string') {
    batch.update(db.doc(`tournament_events/${linkedEventId}`), {
      hotelRebates: admin.firestore.FieldValue.arrayUnion({
        rebateId, partnerId: hotelPartnerId, ngbCreditCents, roomNights: typeof roomNights === 'number' ? roomNights : null, recordedAt: new Date().toISOString(),
      }),
    });
  }
  await batch.commit();
}

module.exports = {
  sanitizeRebateId,
  writeHotelRebate,
};
