'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { resolveParentEmails } = require('./utils/guardianResolver');

exports.onChannelCreated = onDocumentCreated(
  {
    document: 'clubs/{clubId}/channels/{channelId}',
    region: 'us-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.channelType === 'staff_internal') return; // Exclude internal channels
    if (!Array.isArray(data.memberIds) || data.memberIds.length === 0) return;

    const db = getFirestore();
    const { ccParentEmails, missingParents } = await resolveParentEmails(db, data.memberIds);

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

    if (needsUpdate) {
      await snap.ref.update(updates);
    }
  }
);
