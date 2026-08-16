// 🛡️ SafeSport Compliance Mandate: Server-Side CC Parent Router
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { resolveParentEmails } from './utils/resolveParentEmails';

export const onChannelCreated = onDocumentCreated(
  {
    document: 'clubs/{clubId}/channels/{channelId}',
    region: 'us-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.channelType === 'staff_internal') return;
    if (!Array.isArray(data.memberIds) || data.memberIds.length === 0) return;

    const db = getFirestore();
    const { ccParentEmails, missingParents } = await resolveParentEmails(db, data.memberIds);

    const updates: Record<string, any> = {};
    let needsUpdate = false;

    if (ccParentEmails.length > 0) {
      updates.ccParentEmails = ccParentEmails;
      updates.safesportMonitored = true;
      needsUpdate = true;
    }

    if (missingParents) {
      updates.channelStatus = 'BLOCKED_VPC_PENDING';
      needsUpdate = true;
    } else {
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
  }
);
