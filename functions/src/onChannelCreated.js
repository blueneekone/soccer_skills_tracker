"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onChannelCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const resolveParentEmails_1 = require("./utils/resolveParentEmails");
exports.onChannelCreated = (0, firestore_1.onDocumentCreated)({
    document: 'clubs/{clubId}/channels/{channelId}',
    region: 'us-east1',
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (data.channelType === 'staff_internal')
        return;
    if (!Array.isArray(data.memberIds) || data.memberIds.length === 0)
        return;
    const db = (0, firestore_2.getFirestore)();
    const { ccParentEmails, missingParents } = await (0, resolveParentEmails_1.resolveParentEmails)(db, data.memberIds);
    const updates = {};
    let needsUpdate = false;
    if (ccParentEmails.length > 0) {
        updates.ccParentEmails = ccParentEmails;
        updates.safesportMonitored = true;
        needsUpdate = true;
    }
    if (missingParents) {
        updates.channelStatus = 'BLOCKED_VPC_PENDING';
        needsUpdate = true;
    }
    else {
        updates.channelStatus = 'ACTIVE';
        needsUpdate = true;
    }
    if (needsUpdate) {
        await snap.ref.update(updates);
    }
    if (missingParents) {
        const auditRef = db.collection('messaging_audit').doc();
        await auditRef.set({
            action: 'channel_blocked_vpc_pending',
            channelId: snap.id,
            clubId: event.params.clubId,
            memberIds: data.memberIds,
            createdAt: new Date()
        });
    }
});
