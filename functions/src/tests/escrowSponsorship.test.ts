import { describe, it } from 'node:test';
import assert from 'node:assert';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-test' });
}

import { triggerEscrowPayout } from '../domains/escrowOps.js';

describe('Escrow Sponsorship Payouts', () => {
  it('successfully executes atomic escrow payout when CV is verified', async () => {
    const db = getFirestore();
    const sponsorId = 'sponsor_brand_123';
    const clubId = 'club_local_456';
    const scoreId = 'trial_score_789';
    const amount = 150;

    // Seed sponsor and club
    await db.collection('sponsors').doc(sponsorId).set({
      escrowBalance: 500,
      balance: 500,
    });
    await db.collection('clubs').doc(clubId).set({
      stripeConnectBalance: 100,
      balance: 100,
    });

    const func = triggerEscrowPayout.run || triggerEscrowPayout;
    const result = await func({
      auth: { uid: 'cv_pipeline_user', token: { role: 'admin' } },
      data: {
        sponsorId,
        clubId,
        amount,
        scoreId,
        metrics: { PAC: '22.4 MPH', VAN: '96' },
      },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.scoreId, scoreId);

    // Retrieve updated sponsor and club docs
    const sponsorSnap = await db.collection('sponsors').doc(sponsorId).get();
    const clubSnap = await db.collection('clubs').doc(clubId).get();
    const payoutSnap = await db.collection('escrow_payouts').doc(scoreId).get();

    assert.strictEqual(sponsorSnap.data()?.escrowBalance, 350);
    assert.strictEqual(clubSnap.data()?.stripeConnectBalance, 250);
    assert.strictEqual(payoutSnap.exists, true);
    assert.strictEqual(payoutSnap.data()?.status, 'payout_complete');
  });
});
