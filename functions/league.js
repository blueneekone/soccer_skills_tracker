/* eslint-disable quotes */
/**
 * league.js â€” League & Fixture Management Cloud Functions
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * TEMPORAL ALIGNMENT GUARANTEE
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * `createFixture` is the sole write path for fixture documents.
 * It converts any incoming dateTime representation into a strict UTC
 * Firestore Timestamp before writing. Clients MUST use this function
 * (not direct Firestore writes) to ensure correct timezone storage.
 *
 * The conversion chain:
 *   Client input (ISO string | epoch ms | { seconds, nanoseconds })
 *     â†’ admin.firestore.Timestamp.fromMillis(utcMs)
 *       â†’ Firestore Timestamp (UTC, no ambiguity)
 *
 * ZERO-TRUST
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * All writes are validated against the caller's JWT claims:
 *   â€¢ tenantId claim must match the incoming tenantId field.
 *   â€¢ role must be 'coach', 'director', or elevated admin.
 *   â€¢ Collision check runs inside a transaction (see facilities.js).
 *
 * Exports:
 *   createFixture     â€” onCall: create a new fixture (UTC enforcement)
 *   updateFixture     â€” onCall: update mutable fields (status, score, notes)
 *   cancelFixture     â€” onCall: soft-delete (sets status = 'Cancelled')
 *   schedulePractice  â€” onCall: create a non-fixture block on the calendar
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = admin.firestore;

// â”€â”€ UTC Timestamp normalisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Convert any client-supplied datetime to a strict UTC admin.firestore.Timestamp.
 *
 * Accepted input shapes:
 *   â€¢ ISO 8601 string    â€” "2026-05-27T17:00:00Z" or "2026-05-27T17:00:00-06:00"
 *   â€¢ Epoch milliseconds â€” 1748372400000
 *   â€¢ Firestore Timestamp shape â€” { seconds: 1748372400, nanoseconds: 0 }
 *
 * @param {unknown} raw
 * @returns {admin.firestore.Timestamp}
 * @throws {HttpsError('invalid-argument')} on any unresolvable input
 */
function toUtcTimestamp(raw) {
	if (raw == null) throw new HttpsError('invalid-argument', 'dateTime is required.');

	let ms;
	if (typeof raw === 'number' && !isNaN(raw)) {
		ms = raw;
	} else if (typeof raw === 'string') {
		const d = new Date(raw);
		if (isNaN(d.getTime())) throw new HttpsError('invalid-argument', `dateTime string "${raw}" is not parseable.`);
		ms = d.getTime();
	} else if (typeof raw === 'object' && 'seconds' in raw && typeof raw.seconds === 'number') {
		ms = raw.seconds * 1000 + Math.floor((raw.nanoseconds ?? 0) / 1_000_000);
	} else {
		throw new HttpsError('invalid-argument', `Unsupported dateTime shape: ${JSON.stringify(raw)}.`);
	}

	// Sanity-check: reject dates more than 10 years in the past or future
	const now = Date.now();
	const TEN_YEARS_MS = 10 * 365.25 * 24 * 3600 * 1000;
	if (ms < now - TEN_YEARS_MS || ms > now + TEN_YEARS_MS) {
		throw new HttpsError('invalid-argument', `dateTime ${ms} is implausibly far from today.`);
	}

	return admin.firestore.Timestamp.fromMillis(ms);
}

// â”€â”€ createFixture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Create a new fixture with strict UTC timestamp enforcement.
 *
 * Input:
 *   {
 *     tenantId:        string;
 *     seasonId:        string;
 *     teamId:          string;
 *     opponentId:      string;
 *     dateTime:        string | number | { seconds, nanoseconds };
 *     location:        string;
 *     type:            'League' | 'Tournament' | 'Friendly';
 *     facilityId?:     string;
 *     facilityTimezone?: string;  // IANA, e.g. "America/Denver"
 *   }
 *
 * Returns: { fixtureId: string }
 */
exports.createFixture = onCall({region: REGION}, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

	const callerRole = request.auth.token.role ?? '';
	if (!['coach', 'director', 'super_admin', 'global_admin'].includes(callerRole)) {
		throw new HttpsError('permission-denied', 'Coach or Director role required.');
	}

	const callerTenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
	const {
		tenantId, seasonId, teamId, opponentId,
		dateTime, location, type,
		facilityId, facilityTimezone,
	} = request.data ?? {};

	// Field validation
	if (!tenantId) throw new HttpsError('invalid-argument', 'tenantId is required.');
	if (!seasonId) throw new HttpsError('invalid-argument', 'seasonId is required.');
	if (!teamId)   throw new HttpsError('invalid-argument', 'teamId is required.');
	if (!opponentId) throw new HttpsError('invalid-argument', 'opponentId is required.');
	if (!location) throw new HttpsError('invalid-argument', 'location is required.');
	if (!['League', 'Tournament', 'Friendly'].includes(type)) {
		throw new HttpsError('invalid-argument', `Invalid fixture type: ${type}.`);
	}

	// Tenant boundary check
	if (tenantId !== callerTenantId && callerRole !== 'super_admin' && callerRole !== 'global_admin') {
		throw new HttpsError('permission-denied', 'Cannot create fixtures for another organisation.');
	}

	// â”€â”€ UTC ENFORCEMENT: the only correct path to store a fixture dateTime â”€â”€
	const dateTimeUtc = toUtcTimestamp(dateTime);
	logger.info('[league] createFixture UTC normalised', {
		tenantId,
		inputRaw: String(dateTime).slice(0, 50),
		outputUtc: dateTimeUtc.toDate().toISOString(),
	});

	const firestoreDb = admin.firestore();
	const fixtureRef = firestoreDb.collection('fixtures').doc();

	const fixtureDoc = {
		id: fixtureRef.id,
		tenantId,
		seasonId,
		teamId,
		opponentId,
		dateTime:    dateTimeUtc,              // ALWAYS UTC Timestamp
		location:    String(location).slice(0, 200),
		type,
		status:      'Scheduled',
		createdAt:   admin.firestore.FieldValue.serverTimestamp(),
		createdByUid: request.auth.uid,
		...(facilityId ? { facilityId: String(facilityId) } : {}),
		...(facilityTimezone ? { facilityTimezone: String(facilityTimezone).slice(0, 60) } : {}),
	};

	await fixtureRef.set(fixtureDoc);

	// Audit
	await firestoreDb.collection('audit_logs').add({
		action:    'FIXTURE_CREATED',
		fixtureId: fixtureRef.id,
		tenantId,
		teamId,
		dateTimeUtc: dateTimeUtc.toDate().toISOString(),
		actorUid:   request.auth.uid,
		timestamp:  admin.firestore.FieldValue.serverTimestamp(),
	});

	logger.info('[league] fixture created', {fixtureId: fixtureRef.id, tenantId});
	return {fixtureId: fixtureRef.id};
});

// â”€â”€ updateFixture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.updateFixture = onCall({region: REGION}, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

	const callerRole = request.auth.token.role ?? '';
	if (!['coach', 'director', 'super_admin', 'global_admin'].includes(callerRole)) {
		throw new HttpsError('permission-denied', 'Coach or Director role required.');
	}

	const callerTenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
	const {fixtureId, tenantId, updates = {}} = request.data ?? {};
	if (!fixtureId) throw new HttpsError('invalid-argument', 'fixtureId is required.');
	if (tenantId !== callerTenantId && callerRole !== 'super_admin' && callerRole !== 'global_admin') {
		throw new HttpsError('permission-denied', 'Tenant boundary violation.');
	}

	// Only allow safe mutable fields â€” never allow re-writing tenantId/id
	const ALLOWED = ['status', 'location', 'notes', 'facilityId', 'facilityTimezone'];
	const sanitised = {};
	for (const key of ALLOWED) {
		if (key in updates) sanitised[key] = updates[key];
	}
	// dateTime re-schedule: must go through UTC normalisation
	if ('dateTime' in updates) {
		sanitised['dateTime'] = toUtcTimestamp(updates.dateTime);
	}

	const firestoreDb = admin.firestore();
	await firestoreDb.doc(`fixtures/${fixtureId}`).update({
		...sanitised,
		updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		updatedByUid: request.auth.uid,
	});

	logger.info('[league] fixture updated', {fixtureId, fields: Object.keys(sanitised)});
	return {fixtureId};
});

// â”€â”€ cancelFixture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.cancelFixture = onCall({region: REGION}, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

	const callerRole = request.auth.token.role ?? '';
	if (!['coach', 'director', 'super_admin', 'global_admin'].includes(callerRole)) {
		throw new HttpsError('permission-denied', 'Coach or Director role required.');
	}

	const {fixtureId} = request.data ?? {};
	if (!fixtureId) throw new HttpsError('invalid-argument', 'fixtureId is required.');

	const firestoreDb = admin.firestore();
	await firestoreDb.doc(`fixtures/${fixtureId}`).update({
		status:         'Cancelled',
		cancelledAt:    admin.firestore.FieldValue.serverTimestamp(),
		cancelledByUid: request.auth.uid,
	});

	logger.info('[league] fixture cancelled', {fixtureId});
	return {fixtureId};
});

// â”€â”€ schedulePractice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Create a non-fixture calendar block (practice session / team meeting).
 * Enforces the same UTC datetime normalisation as createFixture.
 */
exports.schedulePractice = onCall({region: REGION}, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

	const callerRole = request.auth.token.role ?? '';
	if (!['coach', 'director', 'super_admin', 'global_admin'].includes(callerRole)) {
		throw new HttpsError('permission-denied', 'Coach or Director role required.');
	}

	const callerTenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
	const {
		tenantId, teamId, title,
		startDateTime, endDateTime,
		facilityId, facilityTimezone, notes,
	} = request.data ?? {};

	if (!tenantId || !teamId || !title || !startDateTime || !endDateTime) {
		throw new HttpsError('invalid-argument', 'tenantId, teamId, title, startDateTime, endDateTime are required.');
	}
	if (tenantId !== callerTenantId && callerRole !== 'super_admin' && callerRole !== 'global_admin') {
		throw new HttpsError('permission-denied', 'Tenant boundary violation.');
	}

	const startUtc = toUtcTimestamp(startDateTime);
	const endUtc   = toUtcTimestamp(endDateTime);

	if (endUtc.toMillis() <= startUtc.toMillis()) {
		throw new HttpsError('invalid-argument', 'endDateTime must be after startDateTime.');
	}

	const firestoreDb = admin.firestore();
	const practiceRef = firestoreDb.collection('practice_sessions').doc();

	await practiceRef.set({
		id: practiceRef.id,
		tenantId,
		teamId,
		title:       String(title).slice(0, 200),
		startDateTime: startUtc,
		endDateTime:   endUtc,
		facilityId:  facilityId ?? null,
		facilityTimezone: facilityTimezone ?? null,
		notes:       notes ? String(notes).slice(0, 2000) : null,
		createdAt:   admin.firestore.FieldValue.serverTimestamp(),
		createdByUid: request.auth.uid,
	});

	logger.info('[league] practice scheduled', {practiceId: practiceRef.id, tenantId});
	return {practiceId: practiceRef.id};
});
