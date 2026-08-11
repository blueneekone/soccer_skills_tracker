"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeIndependentDirector = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const crypto_1 = __importDefault(require("crypto"));
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
function getStripe() {
    return new stripe_1.default(STRIPE_SECRET_KEY.value());
}
exports.initializeIndependentDirector = (0, https_1.onCall)({ region: 'us-east1', secrets: [STRIPE_SECRET_KEY] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const uid = request.auth.uid;
    const tenantId = `tenant_${crypto_1.default.randomBytes(8).toString('hex')}`;
    const clubId = `club_${crypto_1.default.randomBytes(8).toString('hex')}`;
    const stripe = getStripe();
    const stripeAccount = await stripe.accounts.create({
        type: 'custom',
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        metadata: { tenantId, uid },
    });
    const db = firebase_admin_1.default.firestore();
    await db.collection('account_verifications').doc(uid).set({
        uid,
        tenantId,
        clubId,
        stripeAccountId: stripeAccount.id,
        status: 'pending_verification',
        requirements: ['business_license', 'government_id'],
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        tenantId,
        clubId,
        stripeAccountId: stripeAccount.id,
    };
});
