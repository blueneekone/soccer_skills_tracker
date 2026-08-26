import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { Resend } from 'resend';
import * as logger from 'firebase-functions/logger';

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

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: 'SSTracker <onboarding@resend.dev>',
        to: parentEmail,
        subject: 'Verify Your SSTracker Account & Join the Team',
        html: `<p>Welcome to SSTracker! Please set up your secure profile here: <a href="https://sstracker.app/register?token=${inviteToken}">Complete Registration</a></p>`,
      });
      logger.info('Successfully dispatched invitation email via Resend', {
        inviteId: event.params.inviteId,
        parentEmail,
      });
    } catch (error) {
      logger.error('Failed to send invitation email via Resend', {
        inviteId: event.params.inviteId,
        parentEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
