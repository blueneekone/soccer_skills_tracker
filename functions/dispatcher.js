/* eslint-disable quotes */
/**
 * dispatcher.js â€” Vanguard Push Notification Dispatcher
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Central hub for all FCM Web Push sends in the platform.
 *
 * ARCHITECTURE
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  sendVanguardPush(userEmail, payload, category)
 *    â†’ reads users/{email}.preferences[category]
 *    â†’ if false: silent drop
 *    â†’ calls admin.messaging().sendEachForMulticast(tokens, notification)
 *    â†’ prunes stale / invalid tokens from Firestore (dead token hygiene)
 *
 * PREFERENCE CATEGORIES (match users/{email}.preferences keys)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *   push_weatherAlerts   â€” AEGIS weather/lightning alerts
 *   push_gameReminders   â€” fixture reminders 24h + 1h before kickoff
 *   push_messages        â€” direct messages from coaches
 *   email_weeklyReport   â€” server-side only, not dispatched here
 *
 * ROLE DEFAULTS (when preferences key is absent)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *   coach / director / registrar:  push_weatherAlerts = true
 *   parent / player / tutor:       push_weatherAlerts = false
 *   All roles:                     push_gameReminders = true, push_messages = true
 *
 * ZERO-TRUST
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Only Cloud Functions (Admin SDK) call sendVanguardPush internally.
 * sendWeatherAlertToTenant is an onCall restricted to coach/director/admin.
 * sendGameReminders runs on a Cloud Scheduler trigger (no client call).
 *
 * Exports:
 *   sendWeatherAlertToTenant â€” onCall: fans out weather alert to tenant users
 *   sendGameRemindersToday   â€” onSchedule: fires fixture reminders for today's games
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const APP_ICON = '/Images/Phoenixes_Logo_2026.png';

const db = admin.firestore();

// â”€â”€ Role default preferences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROLE_DEFAULTS = {
	push_weatherAlerts: {
		coach: true, director: true, registrar: true,
		parent: false, player: false, tutor: false, recruiter: false,
	},
	push_gameReminders: {default: true},
	push_messages:      {default: true},
};

function getDefaultPreference(role, category) {
	const map = ROLE_DEFAULTS[category];
	if (!map) return true;
	if (map.hasOwnProperty(role)) return map[role];
	return map.default !== undefined ? map.default : true;
}

// â”€â”€ Core dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Sends a push notification to a single user.
 * Respects user preferences; silently drops if disabled.
 * Automatically prunes stale registration tokens.
 *
 * @param {string} userEmail â€” Firestore key (lower-cased email)
 * @param {{ title: string, body: string, link?: string, imageUrl?: string, data?: Record<string,string> }} payload
 * @param {string} category â€” preference key (e.g. 'push_weatherAlerts')
 * @returns {Promise<{ sent: number, failed: number, skipped: boolean }>}
 */
async function sendVanguardPush(userEmail, payload, category) {
	const userSnap = await db.doc(`users/${userEmail}`).get();
	if (!userSnap.exists) return {sent: 0, failed: 0, skipped: true};

	const userData = userSnap.data();
	const role = userData.role ?? 'player';
	const prefs = userData.preferences ?? {};

	// Preference gate: check user's explicit setting, fall back to role default
	const isEnabled = prefs.hasOwnProperty(category)
		? prefs[category]
		: getDefaultPreference(role, category);

	if (!isEnabled) {
		logger.info('[dispatcher] preference disabled, skipping', {userEmail, category});
		return {sent: 0, failed: 0, skipped: true};
	}

	const tokens = Array.isArray(userData.fcmTokens) ? userData.fcmTokens.filter(Boolean) : [];
	if (tokens.length === 0) return {sent: 0, failed: 0, skipped: true};

	const message = {
		tokens,
		notification: {title: payload.title, body: payload.body},
		data: {
			...payload.data,
			category,
			link: payload.link ?? '/',
		},
		webpush: {
			notification: {
				icon: APP_ICON,
				badge: APP_ICON,
				...(payload.imageUrl && {image: payload.imageUrl}),
				tag: category,
				renotify: true,
			},
			fcmOptions: {link: payload.link ?? '/'},
		},
	};

	const response = await admin.messaging().sendEachForMulticast(message);

	// â”€â”€ Dead token hygiene: prune stale/invalid tokens from Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€
	const staleTokens = [];
	response.responses.forEach((resp, idx) => {
		if (!resp.success) {
			const code = resp.error?.code ?? '';
			if (
				code === 'messaging/registration-token-not-registered' ||
				code === 'messaging/invalid-registration-token' ||
				code === 'messaging/invalid-argument'
			) {
				staleTokens.push(tokens[idx]);
			}
		}
	});
	if (staleTokens.length > 0) {
		await db.doc(`users/${userEmail}`).update({
			fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
		});
		logger.info('[dispatcher] pruned stale tokens', {userEmail, count: staleTokens.length});
	}

	return {sent: response.successCount, failed: response.failureCount, skipped: false};
}

// â”€â”€ sendWeatherAlertToTenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fans out a weather/safety alert to all users in a tenant whose
 * push_weatherAlerts preference is enabled (or set to role default).
 *
 * Called by the AEGIS weather service when alertLevel reaches CAUTION/DANGER.
 *
 * Input:
 *   { tenantId, title, body, alertLevel ('CAUTION'|'DANGER'), link? }
 *
 * Returns: { totalSent, totalFailed, totalSkipped, totalUsers }
 */
exports.sendWeatherAlertToTenant = onCall({region: REGION}, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

	const role = request.auth.token.role ?? '';
	const tokenTenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';

	if (!['coach', 'director', 'super_admin', 'global_admin'].includes(role)) {
		throw new HttpsError('permission-denied', 'Coach or Director role required.');
	}

	const {tenantId, title, body, alertLevel = 'CAUTION', link = '/coach'} = request.data ?? {};
	if (!tenantId || !title || !body) {
		throw new HttpsError('invalid-argument', 'tenantId, title, and body are required.');
	}
	if (tenantId !== tokenTenantId && role !== 'super_admin' && role !== 'global_admin') {
		throw new HttpsError('permission-denied', 'Cannot send alerts to a different organisation.');
	}

	// Query all users in the tenant
	const usersSnap = await db
		.collection('users')
		.where('clubId', '==', tenantId)
		.get();

	let totalSent = 0;
	let totalFailed = 0;
	let totalSkipped = 0;

	await Promise.all(
		usersSnap.docs.map(async (doc) => {
			const result = await sendVanguardPush(
				doc.id, // email key
				{title, body, link, data: {alertLevel, tenantId}},
				'push_weatherAlerts',
			);
			totalSent    += result.sent;
			totalFailed  += result.failed;
			totalSkipped += result.skipped ? 1 : 0;
		}),
	);

	// Audit log
	await db.collection('audit_logs').add({
		action: 'WEATHER_ALERT_DISPATCHED',
		tenantId,
		alertLevel,
		sentCount: totalSent,
		skippedCount: totalSkipped,
		actorUid: request.auth.uid,
		timestamp: admin.firestore.FieldValue.serverTimestamp(),
	});

	logger.info('[dispatcher] weather alert sent', {tenantId, totalSent, totalSkipped});
	return {totalSent, totalFailed, totalSkipped, totalUsers: usersSnap.size};
});

// â”€â”€ sendGameRemindersToday â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Scheduled function â€” fires every day at 08:00 (America/Denver).
 * Queries fixtures scheduled for today, sends reminders to assigned teams.
 */
exports.sendGameRemindersToday = onSchedule(
	{
		region: REGION,
		schedule: '0 8 * * *',
		timeZone: 'America/Denver',
	},
	async () => {
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

		const fixturesSnap = await db
			.collection('fixtures')
			.where('status', '==', 'Scheduled')
			.where('dateTime', '>=', admin.firestore.Timestamp.fromDate(todayStart))
			.where('dateTime', '<', admin.firestore.Timestamp.fromDate(todayEnd))
			.get();

		let totalSent = 0;

		await Promise.all(
			fixturesSnap.docs.map(async (fixtureDoc) => {
				const fixture = fixtureDoc.data();
				const {tenantId, teamId, opponent, dateTime} = fixture;
				if (!tenantId || !teamId) return;

				const kickoff = dateTime?.toDate?.()?.toLocaleTimeString('en-US', {
					hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver',
				}) ?? 'today';

				const usersSnap = await db
					.collection('users')
					.where('clubId', '==', tenantId)
					.where('teamId', '==', teamId)
					.get();

				await Promise.all(
					usersSnap.docs.map(async (userDoc) => {
						const result = await sendVanguardPush(
							userDoc.id,
							{
								title: `MATCH DAY â€” ${opponent?.name ?? 'Fixture'}`,
								body: `Kickoff ${kickoff}. Check the War Room for tactical briefing.`,
								link: '/coach/match-day',
								data: {fixtureId: fixtureDoc.id, tenantId},
							},
							'push_gameReminders',
						);
						totalSent += result.sent;
					}),
				);
			}),
		);

		logger.info('[dispatcher] game reminders sent', {date: todayStart.toISOString(), totalSent});
	},
);

// â”€â”€ Export sendVanguardPush for internal use by other CFs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
module.exports.sendVanguardPush = sendVanguardPush;
