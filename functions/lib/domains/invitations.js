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
exports.onInvitationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const { sendEmail } = require('../../src/services/resendService');
const REGION = 'us-east1';
exports.onInvitationCreated = (0, firestore_1.onDocumentCreated)({ document: 'clubs/{clubId}/invitations/{inviteId}', region: REGION }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const parentEmail = data.email;
    const inviteToken = data.token;
    if (!parentEmail || !inviteToken) {
        logger.warn('Invitation document missing email or token', {
            clubId: event.params.clubId,
            inviteId: event.params.inviteId,
        });
        return;
    }
    try {
        const result = await sendEmail({
            to: parentEmail,
            subject: 'Verify Your SSTracker Account & Join the Team',
            html: `<p>Welcome to SSTracker! Please set up your secure profile here: <a href="https://sstracker.app/register?token=${inviteToken}">Complete Registration</a></p>`,
            from: 'SSTracker <noreply@sstracker.app>',
        });
        if (result.ok) {
            logger.info('Successfully dispatched invitation email via Resend', {
                inviteId: event.params.inviteId,
                parentEmail,
                id: result.id,
            });
        }
        else {
            logger.error('Failed to send invitation email via Resend', {
                inviteId: event.params.inviteId,
                parentEmail,
                error: result.error,
            });
        }
    }
    catch (error) {
        logger.error('Failed to send invitation email via Resend', {
            inviteId: event.params.inviteId,
            parentEmail,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
