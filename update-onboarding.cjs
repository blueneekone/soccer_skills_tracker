const fs = require('fs');
const content = `'use strict';
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const db = () => { const { getFirestore } = require("firebase-admin/firestore"); return getFirestore(); };

const REGION = 'us-east1';

function assertDirectorOrSuper(request) {
  const role = request.auth?.token?.role;
  if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'Director role required.');
  }
  return role;
}

exports.initializeIndependentDirector = onCall({region: REGION, secrets: [STRIPE_SECRET_KEY]}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    assertDirectorOrSuper(request);
    const { tenantId, clubId } = request.data || {};
    if (!tenantId || !clubId) throw new HttpsError('invalid-argument', 'tenantId and clubId required.');

    const Stripe = require('stripe');
    const stripe = new Stripe(STRIPE_SECRET_KEY.value(), {apiVersion: '2024-06-20'});

    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      metadata: { tenantId, uid: request.auth.uid },
    });

    const batch = db().batch();
    batch.set(db().collection('organizations').doc(tenantId), {
        tenantId, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeAccountId: stripeAccount.id, subscriptionStatus: 'incomplete'
    });
    batch.set(db().collection('clubs').doc(clubId), {
        clubId, tenantId, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();

    return { success: true, tenantId, clubId, stripeAccountId: stripeAccount.id };
});

exports.initializeGovernedDirector = onCall({region: REGION, secrets: [STRIPE_SECRET_KEY]}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { inviteToken, clubId } = request.data || {};
    if (!inviteToken || !clubId) throw new HttpsError('invalid-argument', 'inviteToken and clubId required.');

    const inviteSnap = await db().collection('invites').doc(inviteToken).get();
    if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invalid invite.');

    const masterTenantId = inviteSnap.data().tenantId;
    if (!masterTenantId) throw new HttpsError('failed-precondition', 'Invite has no master tenantId.');

    const batch = db().batch();
    batch.set(db().collection('clubs').doc(clubId), {
        clubId, tenantId: masterTenantId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();

    return { success: true, clubId, tenantId: masterTenantId };
});

exports.mapDirectorStripeAccount = onCall(
    {region: REGION},
    async (request) => {
      if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Sign in required.');
      const {stripe_account_id} = request.data || {};
      if (!stripe_account_id) throw new HttpsError('invalid-argument', 'stripe_account_id is required');
      const emailLower = request.auth.token.email ? request.auth.token.email.toLowerCase() : null;
      const clubId = request.auth.token.clubId;
      if (!emailLower && !clubId) throw new HttpsError('failed-precondition', 'No valid email or clubId.');

      const patch = { stripe_account_id, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      if (emailLower) await db().collection('users').doc(emailLower).set(patch, {merge: true});
      if (clubId) await db().collection('clubs').doc(clubId).set(patch, {merge: true});

      return {ok: true};
    }
);
`;
fs.writeFileSync('functions-compliance/src/domains/directorOnboarding.js', content);
