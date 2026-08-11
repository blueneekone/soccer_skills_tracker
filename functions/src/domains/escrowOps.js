"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerEscrowPayout = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = __importDefault(require("firebase-functions/logger"));
exports.triggerEscrowPayout = (0, https_1.onCall)({ region: 'us-east1' }, async (request) => {
    const { auth, data } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { sponsorId, clubId, amount, scoreId, metrics } = data || {};
    if (!sponsorId || !clubId || typeof amount !== 'number' || amount <= 0 || !scoreId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid parameters.');
    }
    const db = (0, firestore_1.getFirestore)();
    const payoutRef = db.collection('escrow_payouts').doc(scoreId);
    const sponsorRef = db.collection('sponsors').doc(sponsorId);
    const clubRef = db.collection('clubs').doc(clubId);
    try {
        await db.runTransaction(async (transaction) => {
            const payoutSnap = await transaction.get(payoutRef);
            if (payoutSnap.exists) {
                throw new https_1.HttpsError('already-exists', 'Escrow payout has already been processed for this trial.');
            }
            const sponsorSnap = await transaction.get(sponsorRef);
            if (!sponsorSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Sponsoring brand not found.');
            }
            const sponsorData = sponsorSnap.data() || {};
            const currentEscrow = sponsorData.escrowBalance ?? sponsorData.balance ?? 0;
            if (currentEscrow < amount) {
                throw new https_1.HttpsError('failed-precondition', 'Insufficient escrow balance.');
            }
            transaction.update(sponsorRef, {
                escrowBalance: firestore_1.FieldValue.increment(-amount),
                balance: firestore_1.FieldValue.increment(-amount),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            transaction.update(clubRef, {
                stripeConnectBalance: firestore_1.FieldValue.increment(amount),
                balance: firestore_1.FieldValue.increment(amount),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            transaction.set(payoutRef, {
                sponsorId,
                clubId,
                amount,
                scoreId,
                metrics: metrics || {},
                status: 'payout_complete',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        return { success: true, scoreId };
    }
    catch (err) {
        logger_1.default.error('triggerEscrowPayout failed:', err);
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', err.message || 'Transaction failed.');
    }
});
