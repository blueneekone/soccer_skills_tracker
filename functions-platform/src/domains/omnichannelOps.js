'use strict';

/**
 * Epic 4.16a — Omnichannel delivery bus (email + emergency SMS fallback).
 * Authority: COMMS_CHANNEL_CANON.md §6 · FCM_AND_MESSAGING_MATRIX.md
 *
 * Email: SendGrid (@sendgrid/mail) behind feature_flags/commsEmailFallback
 * SMS: Twilio REST (fetch) behind feature_flags/commsSmsEmergency — emergency only
 */

const {defineSecret} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');

const EMAIL_FLAG_DOC = 'feature_flags/commsEmailFallback';
const SMS_FLAG_DOC = 'feature_flags/commsSmsEmergency';
const FROM_EMAIL = 'announcements@vanguardcommand.app';
const FROM_NAME = 'Vanguard Team Comms';

/** Bind on triggers — SendGrid only until owner configures Twilio secrets. */
exports.OMNICHANNEL_SECRETS = [SENDGRID_API_KEY];

const db = () => admin.firestore();

/**
 * @param {string} uid
 * @return {Promise<boolean>}
 */
async function uidHasFcmToken(uid) {
  if (!uid) return false;
  try {
    const snap = await db().collection('device_tokens').doc(uid).get();
    if (!snap.exists) return false;
    const arr = snap.data().tokens;
    return Array.isArray(arr) && arr.some((t) => typeof t === 'string' && t.length > 80);
  } catch (_) {
    return false;
  }
}

/**
 * @param {string} flagDoc
 * @return {Promise<boolean>}
 */
async function isFeatureFlagEnabled(flagDoc) {
  try {
    const snap = await db().doc(flagDoc).get();
    return snap.exists && snap.data()?.enabled === true;
  } catch (e) {
    logger.warn('[omnichannelOps] feature flag read failed', {
      flagDoc,
      err: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * @param {string} phone
 * @return {string|null}
 */
function normalizeE164(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+') && digits.length >= 11) return digits;
  const nums = digits.replace(/\D/g, '');
  if (nums.length === 10) return `+1${nums}`;
  if (nums.length === 11 && nums.startsWith('1')) return `+${nums}`;
  return null;
}

/**
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} parentEmail
 * @param {string} teamId
 * @return {Promise<string|null>}
 */
async function resolveParentSmsPhone(firestore, parentEmail, teamId) {
  const pEmail = normEmail(parentEmail);
  if (!pEmail) return null;

  try {
    const userSnap = await firestore.collection('users').doc(pEmail).get();
    if (userSnap.exists) {
      const u = userSnap.data() || {};
      const fromUser = normalizeE164(u.phoneE164 || u.phoneNumber || '');
      if (fromUser) return fromUser;
    }
  } catch (_) {
    /* non-fatal */
  }

  try {
    const plSnap = await firestore.collection('player_lookup')
        .where('teamId', '==', teamId)
        .get();
    for (const pd of plSnap.docs) {
      const playerEmail = normEmail(pd.data().email || pd.id);
      if (!playerEmail) continue;
      const profSnap = await firestore.collection('users').doc(playerEmail).get();
      if (!profSnap.exists) continue;
      const prof = profSnap.data() || {};
      const householdId = typeof prof.householdId === 'string' ? prof.householdId : '';
      if (!householdId) continue;
      const hSnap = await firestore.collection('households').doc(householdId).get();
      if (!hSnap.exists) continue;
      const parents = Array.isArray(hSnap.data().parentEmails) ?
        hSnap.data().parentEmails.map((e) => normEmail(String(e))) :
        [];
      if (!parents.includes(pEmail)) continue;

      const passSnap = await firestore.collection('passports').doc(playerEmail).get();
      if (passSnap.exists) {
        const pass = passSnap.data() || {};
        const fromPass = normalizeE164(pass.emergencyPhone || '');
        if (fromPass) return fromPass;
      }
    }
  } catch (e) {
    logger.warn('[omnichannelOps] resolveParentSmsPhone failed', {
      parentEmail: pEmail,
      teamId,
      err: e instanceof Error ? e.message : String(e),
    });
  }

  return null;
}

/**
 * @param {{ to: string, subject: string, bodyHtml: string, bodyText: string, clubId?: string, messageId?: string, channelType?: string }} params
 * @return {Promise<boolean>}
 */
exports.sendBroadcastEmail = async ({
  to,
  subject,
  bodyHtml,
  bodyText,
  clubId = '',
  messageId = '',
  channelType = 'announcements',
}) => {
  const recipient = normEmail(to);
  if (!recipient || !recipient.includes('@')) return false;

  const enabled = await isFeatureFlagEnabled(EMAIL_FLAG_DOC);
  if (!enabled) {
    logger.info('[omnichannelOps] email fallback flag off — skip', {to: recipient, messageId});
    return false;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY.value());
    await sgMail.send({
      to: recipient,
      from: {email: FROM_EMAIL, name: FROM_NAME},
      subject: String(subject || 'Team announcement').slice(0, 200),
      text: String(bodyText || '').slice(0, 8000),
      html: String(bodyHtml || bodyText || '').slice(0, 16000),
      customArgs: {
        clubId: String(clubId || ''),
        messageId: String(messageId || ''),
        channelType: String(channelType || 'announcements'),
      },
    });
    logger.info('[omnichannelOps] email sent', {to: recipient, messageId});
    return true;
  } catch (e) {
    logger.warn('[omnichannelOps] sendBroadcastEmail failed', {
      to: recipient,
      messageId,
      err: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
};

/**
 * @param {{ toE164: string, body: string, clubId?: string, messageId?: string }} params
 * @return {Promise<boolean>}
 */
exports.sendEmergencySms = async ({toE164, body, clubId = '', messageId = ''}) => {
  const to = normalizeE164(toE164);
  if (!to) return false;

  const enabled = await isFeatureFlagEnabled(SMS_FLAG_DOC);
  if (!enabled) {
    logger.info('[omnichannelOps] SMS emergency flag off — skip', {to, messageId});
    return false;
  }

  const from = process.env.TWILIO_FROM_NUMBER || '';
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  if (!from || !sid || !token) {
    logger.warn('[omnichannelOps] Twilio credentials not configured', {messageId});
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({From: from, To: to, Body: String(body || '').slice(0, 320)});

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.warn('[omnichannelOps] Twilio SMS failed', {
        status: res.status,
        messageId,
        err: errText.slice(0, 200),
      });
      return false;
    }
    logger.info('[omnichannelOps] emergency SMS sent', {to, messageId, clubId});
    return true;
  } catch (e) {
    logger.warn('[omnichannelOps] sendEmergencySms error', {
      to,
      messageId,
      err: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
};

/**
 * @param {object} broadcastData
 * @return {boolean}
 */
function isEmergencyBroadcast(broadcastData) {
  const d = broadcastData || {};
  return d.priority === 'emergency' ||
    d.broadcastSource === 'emergency' ||
    d.source === 'emergency';
}

/**
 * Process omnichannel fallbacks after FCM attempt; merge channels on deliveryReport.
 *
 * @param {{
 *   msgId: string,
 *   broadcastData: Record<string, unknown>,
 *   parentUidByEmail: Map<string, string>,
 *   fcmAttempted: boolean,
 * }} params
 * @return {Promise<{ updated: boolean, parentDelivered: Array<{email: string, channels: string[], uid?: string}> }>}
 */
exports.processTeamBroadcastOmnichannel = async ({
  msgId,
  broadcastData,
  parentUidByEmail,
  fcmAttempted,
}) => {
  const data = broadcastData || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const clubId = typeof data.teamClubId === 'string' ? data.teamClubId.trim() : '';
  const auditLogId = typeof data.auditLogId === 'string' ? data.auditLogId : '';

  const deliveryReport = data.deliveryReport && typeof data.deliveryReport === 'object' ?
    {...data.deliveryReport} :
    {};
  const baseDelivered = Array.isArray(deliveryReport.parentDelivered) ?
    deliveryReport.parentDelivered.map((r) => ({...r, channels: [...(r.channels || ['in_app'])]})) :
    [];

  if (baseDelivered.length === 0) {
    const emails = Array.isArray(data.parentDeliveredEmails) ? data.parentDeliveredEmails :
      Array.isArray(data.ccParentEmails) ? data.ccParentEmails : [];
    for (const raw of emails) {
      const email = normEmail(String(raw));
      if (email) baseDelivered.push({email, channels: ['in_app']});
    }
  }

  if (baseDelivered.length === 0) {
    return {updated: false, parentDelivered: []};
  }

  const subject = typeof data.subject === 'string' && data.subject.trim() ?
    data.subject.trim() :
    'Team Announcement';
  const body = typeof data.body === 'string' ? data.body :
    typeof data.bodyPreview === 'string' ? data.bodyPreview : '';
  const bodyText = body.slice(0, 8000);
  const bodyHtml = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;color:#0f172a;">
<p style="font-weight:700;font-size:16px;">${subject}</p>
<p style="white-space:pre-wrap;line-height:1.5;">${bodyText.replace(/</g, '&lt;')}</p>
<p style="font-size:12px;color:#64748b;">Sent via Vanguard Team Comms</p>
</body></html>`;

  const emailFlag = await isFeatureFlagEnabled(EMAIL_FLAG_DOC);
  const smsFlag = await isFeatureFlagEnabled(SMS_FLAG_DOC);
  const emergency = isEmergencyBroadcast(data);

  /** @type {string[]} */
  const emailFailures = [];
  /** @type {string[]} */
  const smsFailures = [];

  const updatedDelivered = [];

  for (const row of baseDelivered) {
    const email = normEmail(row.email);
    if (!email) continue;

    /** @type {Set<string>} */
    const channels = new Set(Array.isArray(row.channels) ? row.channels : ['in_app']);
    channels.add('in_app');

    const uid = parentUidByEmail.get(email) || row.uid || '';
    let hasPush = false;
    if (uid) {
      hasPush = await uidHasFcmToken(uid);
    }

    if (fcmAttempted && hasPush) {
      channels.add('push');
    }

    const needsEmailFallback = emailFlag && (!hasPush || !fcmAttempted);
    if (needsEmailFallback) {
      const sent = await exports.sendBroadcastEmail({
        to: email,
        subject,
        bodyHtml,
        bodyText,
        clubId,
        messageId: msgId,
        channelType: 'announcements',
      });
      if (sent) {
        channels.add('email');
      } else {
        emailFailures.push(email);
      }
    }

    if (emergency && smsFlag && teamId) {
      const phone = await resolveParentSmsPhone(db(), email, teamId);
      if (phone) {
        const sent = await exports.sendEmergencySms({
          toE164: phone,
          body: `${subject}: ${bodyText.slice(0, 240)}`,
          clubId,
          messageId: msgId,
        });
        if (sent) {
          channels.add('sms');
        } else {
          smsFailures.push(email);
        }
      }
    }

    updatedDelivered.push({
      email,
      uid: uid || undefined,
      channels: [...channels],
    });
  }

  const mergedReport = {
    ...deliveryReport,
    messageId: msgId,
    parentDelivered: updatedDelivered,
  };

  try {
    await db().collection('team_broadcasts').doc(msgId).set({
      deliveryReport: mergedReport,
      parentDeliveredEmails: updatedDelivered.map((r) => r.email),
    }, {merge: true});
  } catch (e) {
    logger.warn('[omnichannelOps] deliveryReport merge failed', {
      msgId,
      err: e instanceof Error ? e.message : String(e),
    });
  }

  if (auditLogId && (emailFailures.length || smsFailures.length)) {
    try {
      await db().collection('audit_logs').doc(auditLogId).set({
        extra: {
          omnichannelFailures: {
            email_failed: emailFailures,
            sms_failed: smsFailures,
          },
        },
      }, {merge: true});
    } catch (e) {
      logger.warn('[omnichannelOps] audit omnichannel failure log failed', {
        auditLogId,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {updated: true, parentDelivered: updatedDelivered};
};
