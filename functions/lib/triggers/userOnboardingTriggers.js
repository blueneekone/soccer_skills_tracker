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
exports.onUserProfileCleared = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const emailTemplateFactory_1 = require("../templates/emailTemplateFactory");
exports.onUserProfileCleared = (0, firestore_1.onDocumentUpdated)('users/{userId}', async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    if (!before || !after || !after.exists) {
        return;
    }
    const beforeData = before.data();
    const afterData = after.data();
    const userId = event.params.userId;
    const justCleared = beforeData.isCleared === false && afterData.isCleared === true;
    // Some roles might not require a background check and they become active just by setting a role
    const roleAssigned = !beforeData.role && !!afterData.role;
    // Depending on requirements, we can trigger if either they just got cleared,
    // or they just got a role that doesn't need clearance, assuming they are effectively "ready".
    // The issue specifies: "Fire only when before.isCleared == false and after.isCleared == true
    // (or when before.role is null and after.role is defined for roles that do not require background checks)"
    // For simplicity, let's say parent doesn't need background check, others do. Or we just trust the condition.
    const rolesWithoutBgCheck = ['parent'];
    const roleAssignedWithoutBgCheck = roleAssigned && rolesWithoutBgCheck.includes(afterData.role);
    if (!justCleared && !roleAssignedWithoutBgCheck) {
        return;
    }
    const email = afterData.email;
    const role = afterData.role;
    const name = afterData.firstName || 'User';
    if (!email || !role) {
        logger.warn(`User ${userId} lacks email or role, cannot send welcome email.`);
        return;
    }
    const { subject, html } = (0, emailTemplateFactory_1.getWelcomeEmailTemplate)(role, name);
    if (!html) {
        logger.warn(`No template found for role ${role}`);
        return;
    }
    // B815 Defensive Hydration: Write to outbound collection 'mail' instead of 'users' to avoid infinite loops
    try {
        await admin.firestore().collection('mail').doc(`${userId}-welcome`).set({
            to: email,
            message: {
                subject: subject,
                html: html
            },
            delivery: {
                state: 'PENDING'
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        logger.info(`Scheduled welcome email for user ${userId} (role: ${role})`);
    }
    catch (error) {
        logger.error(`Failed to write welcome email to mail collection for user ${userId}:`, error);
    }
});
