import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
const { sendEmail } = require('../../src/services/resendService');

const REGION = 'us-east1';

export const onInvitationCreated = onDocumentCreated(
  { document: 'clubs/{clubId}/invitations/{inviteId}', region: REGION },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

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
      } else {
        logger.error('Failed to send invitation email via Resend', {
          inviteId: event.params.inviteId,
          parentEmail,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Failed to send invitation email via Resend', {
        inviteId: event.params.inviteId,
        parentEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
