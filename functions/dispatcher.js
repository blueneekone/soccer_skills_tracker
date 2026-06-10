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
	push_gameReminders:  {default: true},
	push_messages:       {default: true},
	push_announcements:  {default: true},
	push_paymentReminders: {parent: true, default: false},
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

	// Resolve uid from email to read device_tokens/{uid} (canonical single store)
	let uid;
	try {
		const userRecord = await admin.auth().getUserByEmail(userEmail);
		uid = userRecord.uid;
	} catch (e) {
		logger.warn('[dispatcher] uid lookup failed; no push', {userEmail});
		return {sent: 0, failed: 0, skipped: true};
	}

	const tokenSnap = await db.doc(`device_tokens/${uid}`).get();
	const tokens = tokenSnap.exists && Array.isArray(tokenSnap.data().tokens)
		? tokenSnap.data().tokens.filter(Boolean)
		: [];
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
		await db.doc(`device_tokens/${uid}`).update({
			tokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
		});
		logger.info('[dispatcher] pruned stale tokens', {userEmail, uid, count: staleTokens.length});
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

// ── sendScheduledEventReminders (Epic 4.6) ───────────────────────────────────
// Consumes `reminderOffsets` on team_workouts scheduled events (written by coach
// forms but previously never read). Fires push_gameReminders at each offset.

const REMINDER_TZ = 'America/Denver';
const REMINDER_CRON_WINDOW_MS = 15 * 60 * 1000;
const MORNING_HOUR_MT = 8;

/** @param {number} ms @param {string} tz */
function calendarDayInTz(ms, tz) {
	return new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'})
		.format(new Date(ms));
}

/** @param {Date} now */
function hourMinuteInTz(now, tz) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hour: 'numeric',
		minute: 'numeric',
		hour12: false,
	}).formatToParts(now);
	const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
	const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
	return {hour, minute};
}

/**
 * @param {number | string} offset minutes before start, or 'morning'
 * @param {number} startMs event startTimestamp
 * @param {number} nowMs
 */
function shouldFireReminderOffset(offset, startMs, nowMs) {
	if (startMs <= nowMs) return false;
	if (offset === 'morning') {
		if (calendarDayInTz(startMs, REMINDER_TZ) !== calendarDayInTz(nowMs, REMINDER_TZ)) {
			return false;
		}
		const {hour, minute} = hourMinuteInTz(new Date(nowMs), REMINDER_TZ);
		return hour === MORNING_HOUR_MT && minute < REMINDER_CRON_WINDOW_MS / 60000;
	}
	const mins = Number(offset);
	if (!Number.isFinite(mins) || mins <= 0) return false;
	const targetMs = startMs - mins * 60 * 1000;
	return nowMs >= targetMs && nowMs < targetMs + REMINDER_CRON_WINDOW_MS;
}

/** @param {number | string} offset */
function reminderOffsetLabel(offset) {
	if (offset === 'morning') return 'Today';
	const mins = Number(offset);
	if (mins === 60) return '1 hour';
	if (mins === 30) return '30 minutes';
	if (Number.isFinite(mins)) return `${mins} minutes`;
	return 'soon';
}

exports.sendScheduledEventReminders = onSchedule(
	{
		region: REGION,
		schedule: 'every 15 minutes',
		timeZone: REMINDER_TZ,
	},
	async () => {
		const nowMs = Date.now();
		const horizonMs = nowMs + 26 * 60 * 60 * 1000;

		const snap = await db
			.collection('team_workouts')
			.where('recordType', '==', 'scheduled_event')
			.where('startTimestamp', '>=', nowMs)
			.where('startTimestamp', '<=', horizonMs)
			.get();

		let totalSent = 0;

		for (const eventDoc of snap.docs) {
			const data = eventDoc.data();
			const offsets = Array.isArray(data.reminderOffsets) ? data.reminderOffsets : [];
			if (offsets.length === 0) continue;

			const startMs = Number(data.startTimestamp);
			const teamId = data.teamId;
			if (!teamId || !Number.isFinite(startMs)) continue;

			const sentMap = data.remindersSent && typeof data.remindersSent === 'object'
				? data.remindersSent
				: {};
			const kind = data.eventKind === 'game' ? 'Game' : 'Practice';
			const name = data.name || kind;
			const kickoff = new Date(startMs).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: REMINDER_TZ,
			});

			for (const offset of offsets) {
				const key = String(offset);
				if (sentMap[key]) continue;
				if (!shouldFireReminderOffset(offset, startMs, nowMs)) continue;

				const usersSnap = await db.collection('users').where('teamId', '==', teamId).get();
				let sentForOffset = 0;

				await Promise.all(
					usersSnap.docs.map(async (userDoc) => {
						const result = await sendVanguardPush(
							userDoc.id,
							{
								title: `${kind} in ${reminderOffsetLabel(offset)} — ${name}`,
								body: `Starts at ${kickoff}. Check your schedule.`,
								link: '/player/dashboard',
								data: {eventId: eventDoc.id, teamId, offset: key},
							},
							'push_gameReminders',
						);
						sentForOffset += result.sent;
					}),
				);

				await eventDoc.ref.update({
					[`remindersSent.${key}`]: admin.firestore.FieldValue.serverTimestamp(),
				});
				totalSent += sentForOffset;
			}
		}

		logger.info('[dispatcher] scheduled event reminders', {totalSent, eventsScanned: snap.size});
	},
);

// ── sendRegistrationPaymentReminders (Epic 4.6 B/C) ───────────────────────────
// Daily nudges for abandoned/failed registration payments + deadline reminders
// keyed off organizations.activeSeason.registrationDeadline.

const PAYMENT_DEADLINE_OFFSETS = [7, 3, 1, 0];
const PENDING_PAYMENT_MIN_AGE_MS = 48 * 60 * 60 * 1000;

/** @param {string} e */
function normEmail(e) {
	return typeof e === 'string' ? e.trim().toLowerCase() : '';
}

/** @param {string} isoDate YYYY-MM-DD */
function parseDeadlineMs(isoDate) {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || '').trim());
	if (!m) return NaN;
	return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** @param {number} nowMs @param {number} deadlineMs @param {string} tz */
function calendarDaysUntil(nowMs, deadlineMs, tz) {
	const endDay = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
	}).format(new Date(deadlineMs));
	const nowDay = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
	}).format(new Date(nowMs));
	const [ey, em, ed] = endDay.split('-').map(Number);
	const [ny, nm, nd] = nowDay.split('-').map(Number);
	const endUtc = Date.UTC(ey, em - 1, ed);
	const nowUtc = Date.UTC(ny, nm - 1, nd);
	return Math.round((endUtc - nowUtc) / (24 * 60 * 60 * 1000));
}

/** @param {string} playerEmail */
async function resolveParentEmailsForPlayer(playerEmail) {
	const email = normEmail(playerEmail);
	if (!email) return [];
	const set = new Set();

	const profSnap = await db.collection('users').doc(email).get();
	if (profSnap.exists) {
		const prof = profSnap.data();
		const direct = normEmail(prof.parentEmail || '');
		if (direct) set.add(direct);
		const householdId = prof.householdId || '';
		if (householdId) {
			const hSnap = await db.collection('households').doc(householdId).get();
			if (hSnap.exists) {
				for (const p of hSnap.data().parentEmails || []) {
					const n = normEmail(String(p));
					if (n) set.add(n);
				}
			}
		}
	}

	const hq = await db
		.collection('households')
		.where('playerEmails', 'array-contains', email)
		.limit(5)
		.get();
	for (const hDoc of hq.docs) {
		for (const p of hDoc.data().parentEmails || []) {
			const n = normEmail(String(p));
			if (n) set.add(n);
		}
	}

	return [...set];
}

/** @param {string} tenantId @param {string} seasonId */
async function collectUnpaidPlayerEmails(tenantId, seasonId) {
	const teamsSnap = await db.collection('teams').where('clubId', '==', tenantId).get();
	const teamIds = teamsSnap.docs.map((d) => d.id);
	const rosterEmails = new Set();

	await Promise.all(
		teamIds.map(async (teamId) => {
			const snap = await db
				.collection('player_lookup')
				.where('teamId', '==', teamId)
				.get();
			for (const d of snap.docs) {
				const em = normEmail(d.data().email || d.id);
				if (em) rosterEmails.add(em);
			}
		}),
	);

	const paidSnap = await db
		.collection('season_registrations')
		.where('tenantId', '==', tenantId)
		.where('seasonId', '==', seasonId)
		.where('paymentStatus', '==', 'paid')
		.get();
	const paid = new Set(paidSnap.docs.map((d) => normEmail(d.data().playerEmail)));

	const unpaid = [];
	for (const em of rosterEmails) {
		if (!paid.has(em)) unpaid.push(em);
	}
	return unpaid;
}

exports.sendRegistrationPaymentReminders = onSchedule(
	{
		region: REGION,
		schedule: '0 9 * * *',
		timeZone: REMINDER_TZ,
	},
	async () => {
		const nowMs = Date.now();
		let totalSent = 0;

		// ── Track B: abandoned pending + failed payment intents ───────────────
		const [pendingSnap, failedSnap] = await Promise.all([
			db.collection('season_registrations').where('paymentStatus', '==', 'pending').get(),
			db.collection('season_registrations').where('paymentStatus', '==', 'failed').get(),
		]);

		for (const regDoc of [...pendingSnap.docs, ...failedSnap.docs]) {
			const data = regDoc.data();
			const playerEmail = normEmail(data.playerEmail);
			if (!playerEmail) continue;

			const sent = data.paymentRemindersSent && typeof data.paymentRemindersSent === 'object'
				? data.paymentRemindersSent
				: {};
			const status = data.paymentStatus;
			const reminderKey = status === 'failed' ? 'failed' : 'pending';

			if (sent[reminderKey]) continue;
			if (status === 'pending') {
				const createdMs = data.createdAt?.toMillis?.() ?? 0;
				if (!createdMs || nowMs - createdMs < PENDING_PAYMENT_MIN_AGE_MS) continue;
			}

			const parents = await resolveParentEmailsForPlayer(playerEmail);
			if (parents.length === 0) continue;

			const seasonName = data.seasonId || 'season';
			const title = status === 'failed'
				? 'Registration payment failed'
				: 'Complete registration payment';
			const body = status === 'failed'
				? `Payment did not go through for ${seasonName}. Retry from Payments.`
				: `Your ${seasonName} registration payment is still pending.`;

			for (const parentEmail of parents) {
				const result = await sendVanguardPush(
					parentEmail,
					{
						title,
						body,
						link: '/parent/payments',
						data: {
							registrationId: regDoc.id,
							tenantId: data.tenantId || '',
							playerEmail,
							kind: reminderKey,
						},
					},
					'push_paymentReminders',
				);
				totalSent += result.sent;
			}

			await regDoc.ref.update({
				[`paymentRemindersSent.${reminderKey}`]: admin.firestore.FieldValue.serverTimestamp(),
			});
		}

		// ── Track C: registration deadline offsets per organization ───────────
		const orgsSnap = await db.collection('organizations').get();
		for (const orgDoc of orgsSnap.docs) {
			const org = orgDoc.data();
			const activeSeason = org.activeSeason && typeof org.activeSeason === 'object'
				? org.activeSeason
				: null;
			if (!activeSeason?.seasonId || !activeSeason.registrationDeadline) continue;

			const deadlineMs = parseDeadlineMs(activeSeason.registrationDeadline);
			if (!Number.isFinite(deadlineMs)) continue;

			const daysUntil = calendarDaysUntil(nowMs, deadlineMs, REMINDER_TZ);
			if (!PAYMENT_DEADLINE_OFFSETS.includes(daysUntil)) continue;

			const offsetKey = `deadline_${daysUntil}`;
			const sentMap = activeSeason.remindersSent && typeof activeSeason.remindersSent === 'object'
				? activeSeason.remindersSent
				: {};
			if (sentMap[offsetKey]) continue;

			const tenantId = orgDoc.id;
			const seasonId = activeSeason.seasonId;
			const seasonName = activeSeason.name || seasonId;
			const unpaidPlayers = await collectUnpaidPlayerEmails(tenantId, seasonId);

			const deadlineLabel = daysUntil === 0
				? 'due today'
				: daysUntil === 1
					? 'due tomorrow'
					: `due in ${daysUntil} days`;

			for (const playerEmail of unpaidPlayers) {
				const parents = await resolveParentEmailsForPlayer(playerEmail);
				for (const parentEmail of parents) {
					const result = await sendVanguardPush(
						parentEmail,
						{
							title: `Registration ${deadlineLabel}`,
							body: `${seasonName} registration — complete payment for your player.`,
							link: '/parent/payments',
							data: {
								tenantId,
								seasonId,
								playerEmail,
								deadline: activeSeason.registrationDeadline,
								offset: String(daysUntil),
							},
						},
						'push_paymentReminders',
					);
					totalSent += result.sent;
				}
			}

			await orgDoc.ref.update({
				[`activeSeason.remindersSent.${offsetKey}`]: admin.firestore.FieldValue.serverTimestamp(),
			});
		}

		logger.info('[dispatcher] registration/payment reminders', {totalSent});
	},
);

// ── Export sendVanguardPush for internal use by other CFs ────────────────────
module.exports.sendVanguardPush = sendVanguardPush;
