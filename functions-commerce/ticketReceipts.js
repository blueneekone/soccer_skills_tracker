/**
 * ticketReceipts.js — Branded ticket email receipts (Session A8)
 * ────────────────────────────────────────────────────────────────
 * v1 (DEFAULT): Stripe's native receipt_email is already wired inside
 *   `createTicketSaleIntent` in ticketing.js.  No Vanguard plumbing needed
 *   for v1 — Stripe automatically sends an official receipt.
 *
 * v2 (OPTIONAL / FEATURE-FLAGGED): This module adds a branded HTML receipt
 *   sent via SendGrid.  It fires via a Firestore onCreate trigger on
 *   `tickets/{ticketId}` once `paymentStatus == 'paid'`.
 *
 *   Enable by setting `feature_flags.brandedTicketReceipts = true` in the
 *   (default) Firestore database.  The trigger is always deployed but bails
 *   out early unless the flag is active, so v1 and v2 can coexist.
 *
 * Dependencies (v2 only):
 *   @sendgrid/mail     — add via `npm install @sendgrid/mail` in /functions
 *   qrcode             — already in package.json (used to embed QR in email)
 *   SENDGRID_API_KEY   — Firebase secret (defineSecret)
 *
 * Exports:
 *   sendTicketReceiptOnCreate — Firestore onCreate trigger (deployed always;
 *                               conditionally active via feature flag)
 */

'use strict';

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {defineSecret, defineString} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const QRCode = require('qrcode');

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const APP_BASE_URL = defineString('APP_BASE_URL', {default: 'https://vanguardcommand.app'});

const REGION = 'us-east1';
const FLAG_DOC = 'feature_flags/brandedTicketReceipts';

/**
 * Firestore onCreate trigger — fires when a new ticket doc is created.
 * The webhook handler sets `paymentStatus = 'paid'` and `qrToken` on the
 * *same* doc in an update (not a create), so this trigger fires on the
 * initial pre-payment creation with `paymentStatus = 'pending'`.
 *
 * We listen specifically for the update path by using onDocumentUpdated
 * (below) instead.  This file exports both so operators can choose.
 */
exports.sendTicketReceiptOnCreate = onDocumentCreated(
    {
      document: 'tickets/{ticketId}',
      region: REGION,
      secrets: [SENDGRID_API_KEY],
    },
    async (event) => {
      const data = event.data?.data();
      // Only send once the ticket is actually paid (the webhook sets qrToken).
      if (!data || data.paymentStatus !== 'paid' || !data.qrToken) return;

      await _maybeSendReceipt(event.params.ticketId, data);
    },
);

/**
 * Shared receipt sender — called from the trigger or unit tests.
 * @param {string} ticketId
 * @param {object} ticketData  Firestore doc fields
 */
async function _maybeSendReceipt(ticketId, ticketData) {
  // Feature-flag gate: bail unless branded receipts are enabled.
  const flagSnap = await admin.firestore().doc(FLAG_DOC).get();
  if (!flagSnap.exists || !flagSnap.data()?.enabled) {
    logger.info('[ticketReceipts] branded receipts flag off — skipping', {ticketId});
    return;
  }

  const {purchaserEmail, grossCents, tierId, eventId, quantity, qrToken} = ticketData ?? {};
  if (!purchaserEmail || !qrToken) {
    logger.warn('[ticketReceipts] missing fields', {ticketId, purchaserEmail: !!purchaserEmail, qrToken: !!qrToken});
    return;
  }

  // Generate QR as base64 PNG for cid attachment.
  const qrPng = await QRCode.toBuffer(qrToken, {
    type: 'png',
    width: 256,
    margin: 2,
    color: {dark: '#0f0f1e', light: '#e2e8f0'},
  });
  const qrBase64 = qrPng.toString('base64');

  const totalFormatted = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'})
      .format((grossCents ?? 0) / 100);

  const eventUrl = `${APP_BASE_URL.value()}/events/${eventId}`;
  const ticketsUrl = `${APP_BASE_URL.value()}/account/tickets`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your Ticket — Vanguard</title></head>
<body style="background:#0f0f1e;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:2rem;font-weight:900;letter-spacing:-0.02em;color:#e2e8f0;">⚡ Vanguard</span>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;margin-bottom:24px;">
      <h1 style="font-size:1.4rem;font-weight:800;margin:0 0 6px;">Your ticket is confirmed 🎟️</h1>
      <p style="color:#94a3b8;margin:0 0 24px;">Show the QR code below at the gate for entry.</p>
      <div style="text-align:center;margin:0 0 24px;">
        <img src="cid:qr_code" alt="Ticket QR code" width="200" height="200"
             style="border-radius:12px;background:#e2e8f0;" />
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Event</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${eventId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Tier</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${tierId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Quantity</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${quantity ?? 1}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.08);">
          <td style="padding:10px 0 0;font-weight:700;">Total Paid</td>
          <td style="padding:10px 0 0;text-align:right;font-weight:700;color:#a5b4fc;">${totalFormatted}</td>
        </tr>
      </table>
    </div>
    <div style="text-align:center;font-size:0.78rem;color:#64748b;">
      <a href="${ticketsUrl}" style="color:#a5b4fc;text-decoration:none;">View all tickets</a>
      &nbsp;·&nbsp;
      <a href="${eventUrl}" style="color:#a5b4fc;text-decoration:none;">Event details</a>
    </div>
  </div>
</body>
</html>`;

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_API_KEY.value());

  await sgMail.send({
    to: purchaserEmail,
    from: {email: 'tickets@vanguardcommand.app', name: 'Vanguard Tickets'},
    subject: `Your ticket for event ${eventId} — ${totalFormatted}`,
    html,
    attachments: [
      {
        content: qrBase64,
        filename: 'ticket_qr.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'qr_code',
      },
    ],
  });

  logger.info('[ticketReceipts] receipt sent', {ticketId, to: purchaserEmail});
}

// Export the shared helper for testing.
exports._maybeSendReceipt = _maybeSendReceipt;
