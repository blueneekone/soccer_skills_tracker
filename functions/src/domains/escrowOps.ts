import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import logger from 'firebase-functions/logger';

export const triggerEscrowPayout = onCall({ region: 'us-east1' }, async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { sponsorId, clubId, amount, scoreId, metrics } = data || {};
  if (!sponsorId || !clubId || typeof amount !== 'number' || amount <= 0 || !scoreId) {
    throw new HttpsError('invalid-argument', 'Missing or invalid parameters.');
  }

  const db = getFirestore();
  const payoutRef = db.collection('escrow_payouts').doc(scoreId);
  const sponsorRef = db.collection('sponsors').doc(sponsorId);
  const clubRef = db.collection('clubs').doc(clubId);

  try {
    await db.runTransaction(async (transaction) => {
      const payoutSnap = await transaction.get(payoutRef);
      if (payoutSnap.exists) {
        throw new HttpsError('already-exists', 'Escrow payout has already been processed for this trial.');
      }

      const sponsorSnap = await transaction.get(sponsorRef);
      if (!sponsorSnap.exists) {
        throw new HttpsError('not-found', 'Sponsoring brand not found.');
      }

      const sponsorData = sponsorSnap.data() || {};
      const currentEscrow = sponsorData.escrowBalance ?? sponsorData.balance ?? 0;
      if (currentEscrow < amount) {
        throw new HttpsError('failed-precondition', 'Insufficient escrow balance.');
      }

      transaction.update(sponsorRef, {
        escrowBalance: FieldValue.increment(-amount),
        balance: FieldValue.increment(-amount),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(clubRef, {
        stripeConnectBalance: FieldValue.increment(amount),
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(payoutRef, {
        sponsorId,
        clubId,
        amount,
        scoreId,
        metrics: metrics || {},
        status: 'payout_complete',
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true, scoreId };
  } catch (err: any) {
    logger.error('triggerEscrowPayout failed:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Transaction failed.');
  }
});
