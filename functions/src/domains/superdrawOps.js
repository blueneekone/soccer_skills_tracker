'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const { defineSecret } = require('firebase-functions/params');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

exports.purchaseSuperdrawTickets = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { campaignId, ticketsCount, mockPaymentSuccess } = request.data || {};
    if (!campaignId || typeof campaignId !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing or invalid campaignId.');
    }
    const count = parseInt(ticketsCount, 10);
    if (isNaN(count) || count <= 0) {
      throw new HttpsError('invalid-argument', 'ticketsCount must be a positive integer.');
    }

    const { getFirestore } = require("firebase-admin/firestore");
    const db = getFirestore();
    const campaignRef = db.collection('superdraw_campaigns').doc(campaignId);
    let ticketPrice = 0;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(campaignRef);
      if (!doc.exists) {
        throw new HttpsError('not-found', 'SuperdrawCampaign not found.');
      }
      const data = doc.data();
      if (new Date(data.endTime).getTime() <= Date.now()) {
        throw new HttpsError('failed-precondition', 'Superdraw campaign has expired.');
      }
      ticketPrice = data.ticketPrice || 0;

      if (mockPaymentSuccess) {
        const increment = ticketPrice * count;
        transaction.update(campaignRef, {
          totalPool: admin.firestore.FieldValue.increment(increment)
        });
      }
    });

    const secret = STRIPE_SECRET_KEY.value() || process.env.STRIPE_SECRET_KEY || 'mock_key';
    
    const stripeClient = stripe(secret);

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Superdraw Tickets` },
          unit_amount: Math.round(ticketPrice * 100),
        },
        quantity: count,
      }],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: { campaignId, ticketsCount: String(count) }
    });

    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      totalPoolIncremented: !!mockPaymentSuccess
    };
  }
);
