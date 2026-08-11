"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeFederationInvite = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const db = () => admin.firestore();
exports.consumeFederationInvite = (0, https_1.onCall)({ region: 'us-east1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in to consume federation invite.');
    }
    const uid = request.auth.uid;
    const inviteToken = typeof request.data === 'string'
        ? request.data
        : (request.data?.inviteToken || '');
    if (!inviteToken) {
        throw new https_1.HttpsError('invalid-argument', 'Invite token is required.');
    }
    const snap = await db().collection('federation_invites').where('token', '==', inviteToken).get();
    if (snap.empty) {
        throw new https_1.HttpsError('not-found', 'Invite not found.');
    }
    const inviteDoc = snap.docs[0];
    const inviteData = inviteDoc.data();
    if (inviteData.is_used !== false) {
        throw new https_1.HttpsError('failed-precondition', 'Invite is already used.');
    }
    const current_time = Date.now();
    const expVal = inviteData.expiration_timestamp;
    const expMs = (expVal && typeof expVal.toMillis === 'function')
        ? expVal.toMillis()
        : new Date(expVal).getTime();
    if (current_time >= expMs) {
        throw new https_1.HttpsError('failed-precondition', 'Invite is expired.');
    }
    const masterTenantId = inviteData.tenantId || inviteData.masterTenantId;
    const newClubId = `club_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
    const batch = db().batch();
    batch.update(inviteDoc.ref, {
        is_used: true,
        used_by: uid,
        used_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(db().collection('users').doc(uid), {
        uid,
        role: 'director',
        type: 'governed',
        clubId: newClubId,
        tenantId: masterTenantId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db().collection('b2b_enrollments').doc(uid), {
        uid,
        tenantId: masterTenantId,
        clubId: newClubId,
        type: 'governed',
        inviteToken,
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return {
        success: true,
        tenantId: masterTenantId,
        clubId: newClubId,
    };
});
