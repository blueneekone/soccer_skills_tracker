'use strict';

/**
 * Epic 4.16c — Sponsor & partner template digests.
 * Director-approved templates; parents with consentItems.sponsor + consentItems.comms only.
 * No sponsor login; no minor recipients.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');
const {assertDirectorClubOrSuper} = require('../middleware/authBouncers');
const {
  parentHasSponsorConsent,
  parentHasCommsConsent,
} = require('./commsPolicy');

const REGION = 'us-east1';

const db = () => admin.firestore();

/**
 * @param {unknown} raw
 * @param {number} maxLen
 * @return {string}
 */
function sanitizeText(raw, maxLen) {
  const t = String(raw || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return t.slice(0, maxLen);
}

/**
 * @param {unknown} raw
 * @return {string}
 */
function sanitizeHttpsUrl(raw) {
  const u = String(raw || '').trim();
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:') return '';
    return parsed.href.slice(0, 500);
  } catch {
    return '';
  }
}

/**
 * @param {string} clubId
 * @return {string}
 */
function sponsorChannelId(clubId) {
  return `sponsor-partner-${clubId}`;
}

/**
 * @param {Record<string, unknown>} template
 * @return {string}
 */
function buildDigestBody(template) {
  const headline = sanitizeText(template.headline, 200);
  const body = sanitizeText(template.body, 2000);
  const ctaLabel = sanitizeText(template.ctaLabel, 64);
  const ctaUrl = sanitizeHttpsUrl(template.ctaUrl);
  const parts = [];
  if (headline) parts.push(headline);
  if (body) parts.push(body);
  if (ctaLabel && ctaUrl) parts.push(`${ctaLabel}: ${ctaUrl}`);
  return parts.join('\n\n').slice(0, 8000);
}

/**
 * @param {string} clubId
 * @return {Promise<FirebaseFirestore.DocumentReference>}
 */
async function ensureSponsorChannel(clubId) {
  const channelId = sponsorChannelId(clubId);
  const ref = db()
      .collection('clubs').doc(clubId)
      .collection('channels').doc(channelId);
  const FieldValue = admin.firestore.FieldValue;
  await ref.set({
    channelType: 'sponsor_partner',
    clubId,
    type: 'broadcast',
    name: 'Sponsor & partner',
    systemChannel: true,
    audienceScope: 'parent_opt_in',
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
  return ref;
}

/**
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} clubId
 * @return {Promise<{parentDelivered: Array<{email: string, channels: string[]}>, parentSkipped: Array<{email: string, reason: string}>}>}
 */
async function resolveClubSponsorAudience(firestore, clubId) {
  const snap = await firestore.collection('households')
      .where('clubId', '==', clubId)
      .get();

  /** @type {Map<string, Set<string>>} */
  const parentToPlayers = new Map();

  for (const doc of snap.docs) {
    const data = doc.data();
    const parents = Array.isArray(data.parentEmails) ? data.parentEmails : [];
    const players = Array.isArray(data.playerEmails) ? data.playerEmails : [];
    for (const rawP of parents) {
      const pe = normEmail(String(rawP));
      if (!pe) continue;
      if (!parentToPlayers.has(pe)) parentToPlayers.set(pe, new Set());
      for (const rawPl of players) {
        const pl = normEmail(String(rawPl));
        if (pl) parentToPlayers.get(pe).add(pl);
      }
    }
  }

  const parentDelivered = [];
  const parentSkipped = [];

  for (const [parent, players] of parentToPlayers) {
    if (players.size === 0) {
      parentSkipped.push({email: parent, reason: 'no_household'});
      continue;
    }
    let eligible = false;
    let skipReason = 'consent_sponsor_declined';
    for (const player of players) {
      if (await parentHasSponsorConsent(firestore, parent, player)) {
        eligible = true;
        break;
      }
      if (!(await parentHasCommsConsent(firestore, parent, player))) {
        skipReason = 'consent_comms_declined';
      } else {
        skipReason = 'consent_sponsor_declined';
      }
    }
    if (eligible) {
      parentDelivered.push({email: parent, channels: ['in_app']});
    } else {
      parentSkipped.push({email: parent, reason: skipReason});
    }
  }

  return {parentDelivered, parentSkipped};
}

/**
 * @param {string} clubId
 * @param {string} templateId
 * @return {Promise<FirebaseFirestore.DocumentSnapshot>}
 */
async function loadTemplate(clubId, templateId) {
  const ref = db()
      .collection('clubs').doc(clubId)
      .collection('sponsor_templates').doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Sponsor template not found.');
  }
  return snap;
}

exports.createSponsorTemplate = onCall({region: REGION}, async (request) => {
  const clubId = String(request.data?.clubId || '').trim();
  const actor = assertDirectorClubOrSuper(request, clubId);

  const title = sanitizeText(request.data?.title, 200);
  const partnerName = sanitizeText(request.data?.partnerName, 120);
  const headline = sanitizeText(request.data?.headline, 200);
  const body = sanitizeText(request.data?.body, 2000);
  const ctaLabel = sanitizeText(request.data?.ctaLabel, 64);
  const ctaUrl = sanitizeHttpsUrl(request.data?.ctaUrl);

  if (!title) throw new HttpsError('invalid-argument', 'title is required.');
  if (!partnerName) throw new HttpsError('invalid-argument', 'partnerName is required.');
  if (!headline) throw new HttpsError('invalid-argument', 'headline is required.');
  if (!body) throw new HttpsError('invalid-argument', 'body is required.');
  if (ctaLabel && !ctaUrl) {
    throw new HttpsError('invalid-argument', 'ctaUrl (https) is required when ctaLabel is set.');
  }

  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const ref = db()
      .collection('clubs').doc(clubId)
      .collection('sponsor_templates').doc();

  await ref.set({
    clubId,
    title,
    partnerName,
    headline,
    body,
    ctaLabel: ctaLabel || null,
    ctaUrl: ctaUrl || null,
    status: 'draft',
    createdByEmail: normEmail(actor.email),
    createdByUid: request.auth.uid,
    createdAt: now,
    updatedAt: now,
  });

  logger.info('[createSponsorTemplate] draft created', {
    clubId,
    templateId: ref.id,
    actor: actor.email,
  });

  return {ok: true, templateId: ref.id, status: 'draft'};
});

exports.approveSponsorTemplate = onCall({region: REGION}, async (request) => {
  const clubId = String(request.data?.clubId || '').trim();
  const templateId = String(request.data?.templateId || '').trim();
  const actor = assertDirectorClubOrSuper(request, clubId);

  if (!templateId) {
    throw new HttpsError('invalid-argument', 'templateId is required.');
  }

  const snap = await loadTemplate(clubId, templateId);
  const data = snap.data() || {};
  if (data.status !== 'draft') {
    throw new HttpsError(
        'failed-precondition',
        'Only draft templates can be approved.',
    );
  }

  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  await snap.ref.update({
    status: 'approved',
    approvedByEmail: normEmail(actor.email),
    approvedByUid: request.auth.uid,
    approvedAt: now,
    updatedAt: now,
  });

  logger.info('[approveSponsorTemplate] approved', {clubId, templateId});

  return {ok: true, templateId, status: 'approved'};
});

exports.sendSponsorPartnerDigest = onCall({region: REGION}, async (request) => {
  const clubId = String(request.data?.clubId || '').trim();
  const templateId = String(request.data?.templateId || '').trim();
  const actor = assertDirectorClubOrSuper(request, clubId);

  if (!templateId) {
    throw new HttpsError('invalid-argument', 'templateId is required.');
  }

  const snap = await loadTemplate(clubId, templateId);
  const template = snap.data() || {};

  if (template.status !== 'approved') {
    throw new HttpsError(
        'failed-precondition',
        'Template must be director-approved before send. Unapproved sends are blocked.',
    );
  }

  const audience = await resolveClubSponsorAudience(db(), clubId);
  const sentAtIso = new Date().toISOString();

  /** @type {Record<string, unknown>} */
  const deliveryReport = {
    channelType: 'sponsor_partner',
    clubId,
    templateId,
    parentDelivered: audience.parentDelivered,
    parentSkipped: audience.parentSkipped,
    deliveredCount: audience.parentDelivered.length,
    skippedCount: audience.parentSkipped.length,
    sentAtIso,
  };

  const channelRef = await ensureSponsorChannel(clubId);
  const messagesRef = channelRef.collection('messages');
  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const digestBody = buildDigestBody(template);
  const batch = db().batch();
  const messageIds = [];

  for (const row of audience.parentDelivered) {
    const msgRef = messagesRef.doc();
    messageIds.push(msgRef.id);
    batch.set(msgRef, {
      channelType: 'sponsor_partner',
      system: true,
      sourceCallable: 'sendSponsorPartnerDigest',
      actorRole: actor.role,
      actorEmail: normEmail(actor.email),
      senderId: request.auth.uid,
      senderName: 'Director',
      senderRole: actor.role,
      subject: sanitizeText(template.title, 200),
      text: digestBody,
      body: digestBody,
      templateId,
      partnerName: sanitizeText(template.partnerName, 120),
      parentEmail: row.email,
      timestamp: now,
      createdAt: now,
      deleted: false,
    });
  }

  const staffRef = messagesRef.doc();
  messageIds.push(staffRef.id);
  batch.set(staffRef, {
    channelType: 'sponsor_partner',
    system: true,
    digestSend: true,
    sourceCallable: 'sendSponsorPartnerDigest',
    templateId,
    subject: `[Digest sent] ${sanitizeText(template.title, 200)}`,
    text: digestBody,
    body: digestBody,
    deliveryReport,
    timestamp: now,
    createdAt: now,
    deleted: false,
    senderRole: 'system',
    senderName: 'System',
    senderId: 'system',
  });

  batch.update(snap.ref, {
    status: 'sent',
    sentAt: now,
    sentAtIso,
    lastSendMessageId: staffRef.id,
    deliveryReport,
    updatedAt: now,
  });

  const auditRef = db().collection('audit_logs').doc();
  batch.set(auditRef, {
    action: 'sendSponsorPartnerDigest',
    channelType: 'sponsor_partner',
    clubId,
    templateId,
    actorUid: request.auth.uid,
    actorEmail: normEmail(actor.email),
    deliveredCount: audience.parentDelivered.length,
    skippedCount: audience.parentSkipped.length,
    messageIds,
    createdAt: now,
  });

  await batch.commit();

  logger.info('[sendSponsorPartnerDigest] digest sent', {
    clubId,
    templateId,
    delivered: audience.parentDelivered.length,
    skipped: audience.parentSkipped.length,
  });

  return {
    ok: true,
    templateId,
    messageIds,
    deliveryReport,
    recipientCount: audience.parentDelivered.length,
  };
});
