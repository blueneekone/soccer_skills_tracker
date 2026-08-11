import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import crypto from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

function getStripe() {
  return new Stripe(STRIPE_SECRET_KEY.value());
}

export const initializeIndependentDirector = onCall(
  { region: 'us-east1', secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const uid = request.auth.uid;
    const tenantId = `tenant_${crypto.randomBytes(8).toString('hex')}`;
    const clubId = `club_${crypto.randomBytes(8).toString('hex')}`;

    const stripe = getStripe();
    const stripeAccount = await stripe.accounts.create({
      type: 'custom',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { tenantId, uid },
    });

    const db = admin.firestore();
    await db.collection('account_verifications').doc(uid).set({
      uid,
      tenantId,
      clubId,
      stripeAccountId: stripeAccount.id,
      status: 'pending_verification',
      requirements: ['business_license', 'government_id'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      tenantId,
      clubId,
      stripeAccountId: stripeAccount.id,
    };
  }
);
