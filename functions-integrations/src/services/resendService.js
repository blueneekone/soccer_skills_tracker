'use strict';

/**
 * resendService.js — Resend Transactional Outbound Email Bus
 * ────────────────────────────────────────────────────────────
 * Direct integration with Resend API (https://api.resend.com/emails).
 * Handles transactional emails, COPPA consents, parent intake pings,
 * ticket receipts, and automated team announcements from noreply@sstracker.app.
 */

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {defineSecret, defineString} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const DEFAULT_FROM = 'SSTracker <noreply@sstracker.app>';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getApiKey() {
	if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
		return process.env.RESEND_API_KEY.trim();
	}
	try {
		if (typeof RESEND_API_KEY.value === 'function') {
			return RESEND_API_KEY.value();
		}
	} catch (_) {
		// fallback to empty
	}
	return '';
}

/**
 * Send an email via Resend REST API.
 * @param {{ to: string | string[], subject: string, html?: string, text?: string, from?: string }} opts
 * @return {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
async function sendEmail({to, subject, html, text, from}) {
	const apiKey = getApiKey();
	if (!apiKey) {
		logger.error('[resendService] RESEND_API_KEY not configured.');
		return {ok: false, error: 'RESEND_API_KEY not configured'};
	}

	const recipients = (Array.isArray(to) ? to : [to])
		.map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
		.filter((e) => e && e.includes('@'));

	if (recipients.length === 0) {
		logger.warn('[resendService] No valid recipient emails provided.', {to});
		return {ok: false, error: 'No valid recipient emails'};
	}

	const payload = {
		from: from || DEFAULT_FROM,
		to: recipients,
		subject: String(subject || 'SSTracker Notification').slice(0, 250),
		...(html ? {html: String(html)} : {}),
		...(text ? {text: String(text)} : {}),
	};

	if (!payload.html && !payload.text) {
		payload.text = 'Notification from SSTracker.';
	}

	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		const data = await res.json();
		if (!res.ok) {
			const errMsg = data?.message || `HTTP ${res.status}`;
			logger.error('[resendService] Resend API error response', {status: res.status, data});
			return {ok: false, error: errMsg};
		}

		logger.info('[resendService] Email dispatched successfully', {id: data.id, to: recipients});
		return {ok: true, id: data.id};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error('[resendService] Network or fetch error', {err: msg});
		return {ok: false, error: msg};
	}
}

/**
 * Firestore trigger on `mail/{mailId}`.
 * Automatically processes documents created by COPPA consent, Director nudges,
 * and onboarding invites, delivering them via Resend.
 */
const processOutboundMail = onDocumentCreated(
	{
		document: 'mail/{mailId}',
		secrets: [RESEND_API_KEY],
		region: 'us-east1',
	},
	async (event) => {
		const snap = event.data;
		if (!snap || !snap.exists) return;

		const data = snap.data();
		if (data.delivery?.state === 'SUCCESS' || data.delivery?.state === 'PENDING') {
			return;
		}

		const to = data.to;
		const subject = data.message?.subject || data.subject || 'SSTracker Update';
		const html = data.message?.html || data.html || '';
		const text = data.message?.text || data.text || '';

		await snap.ref.update({
			'delivery.state': 'PENDING',
			'delivery.startTime': admin.firestore.FieldValue.serverTimestamp(),
		});

		const result = await sendEmail({to, subject, html, text});

		if (result.ok) {
			await snap.ref.update({
				'delivery.state': 'SUCCESS',
				'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
				'delivery.resendId': result.id,
			});
		} else {
			await snap.ref.update({
				'delivery.state': 'ERROR',
				'delivery.error': result.error || 'Failed to dispatch email',
				'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
			});
		}
	},
);

module.exports = {
	sendEmail,
	processOutboundMail,
	RESEND_API_KEY,
	DEFAULT_FROM,
};
