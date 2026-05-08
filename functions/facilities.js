/* eslint-disable quotes */
/**
 * facilities.js — Pitch Collision Avoidance System
 * ──────────────────────────────────────────────────
 * Prevents double-booking of physical facilities (pitches, courts, indoor turf)
 * by running a transactional overlap check before every booking.
 *
 * OVERLAP ALGORITHM (Allen's Interval Intersection)
 * ─────────────────────────────────────────────────
 *   Event A [startA, endA] overlaps Event B [startB, endB] iff:
 *       startA < endB  AND  endA > startB
 *
 *   Firestore limitation: two inequality filters on DIFFERENT fields are not allowed.
 *   Solution:
 *     1. Query:  startMs < requestedEndMs   (Firestore index on startMs)
 *     2. Filter: endMs   > requestedStartMs (in-memory post-filter)
 *   This returns a superset that is then narrowed in application code.
 *   The Firestore transaction prevents TOCTOU races between the check and insert.
 *
 * COLLECTIONS
 * ───────────
 *  facilities/{facilityId}
 *    name, tenantId, location, capacity, pitchType, isActive
 *
 *  facility_bookings/{bookingId}
 *    facilityId, tenantId, teamId, eventType ('fixture'|'practice'|'other'),
 *    eventId, label, date (YYYY-MM-DD), startMs, endMs,
 *    bookedByUid, createdAt
 *
 * CONFLICT RESPONSE
 * ─────────────────
 *  When a time block is already taken, the function throws:
 *    HttpsError('already-exists', ...) with code 409 semantics.
 *  The UI maps this to a glowing "RESOURCE UNAVAILABLE" banner on the scheduling board.
 *
 * Exports:
 *   checkFacilityAvailability — onCall: non-mutating probe (UI pre-validation)
 *   bookFacility              — onCall: transactional booking (with lock)
 *   releaseFacilityBooking    — onCall: cancel a booking
 *   listFacilities            — onCall: return all facilities for a tenant
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-central1';
const db = admin.firestore();

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Detect overlapping bookings for a facility in a given time window.
 * Uses a Firestore query + in-memory filter to handle the two-inequality constraint.
 *
 * @param {string} facilityId
 * @param {string} date       — YYYY-MM-DD (local date for index grouping)
 * @param {number} startMs    — epoch ms
 * @param {number} endMs      — epoch ms
 * @param {string|null} excludeBookingId — exclude this booking ID (for update checks)
 * @param {FirebaseFirestore.Transaction=} transaction
 * @return {Promise<FirebaseFirestore.QueryDocumentSnapshot[]>}
 */
async function findOverlaps(facilityId, date, startMs, endMs, excludeBookingId = null, transaction = null) {
  const colRef = db.collection('facility_bookings');

  // Stage 1: Firestore query — events whose start is BEFORE our end
  const queryRef = colRef
      .where('facilityId', '==', facilityId)
      .where('date', '==', date)
      .where('startMs', '<', endMs);

  const snap = transaction
      ? await transaction.get(queryRef)
      : await queryRef.get();

  // Stage 2: In-memory filter — events whose end is AFTER our start
  return snap.docs.filter(
      (doc) => doc.data().endMs > startMs && doc.id !== excludeBookingId,
  );
}

/**
 * Build a human-readable conflict summary for the UI.
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} conflicts
 * @return {string}
 */
function summariseConflicts(conflicts) {
  const labels = conflicts.map((c) => c.data().label ?? 'Unnamed event').slice(0, 3);
  return `FACILITY CONFLICT: Time block overlaps ${labels.join(', ')}${conflicts.length > 3 ? ` +${conflicts.length - 3} more` : ''}.`;
}

// ── checkFacilityAvailability ─────────────────────────────────────────────────

/**
 * Non-mutating availability probe — use for real-time UI feedback before submit.
 *
 * Input:
 *   { facilityId, date (YYYY-MM-DD), startMs, endMs, excludeBookingId? }
 *
 * Returns:
 *   { available: boolean, conflicts: Array<{ bookingId, label, startMs, endMs, teamId }> }
 */
exports.checkFacilityAvailability = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const {facilityId, date, startMs, endMs, excludeBookingId = null} = request.data ?? {};
  if (!facilityId || !date || !startMs || !endMs) {
    throw new HttpsError('invalid-argument', 'facilityId, date, startMs, endMs are required.');
  }
  if (endMs <= startMs) {
    throw new HttpsError('invalid-argument', 'endMs must be after startMs.');
  }

  const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
  const role = request.auth.token.role ?? '';
  if (!tenantId) throw new HttpsError('permission-denied', 'No tenant on token.');

  // Verify the facility belongs to this tenant
  const facSnap = await db.doc(`facilities/${facilityId}`).get();
  if (!facSnap.exists) throw new HttpsError('not-found', `Facility ${facilityId} not found.`);
  if (facSnap.data()?.tenantId !== tenantId && role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'Facility belongs to another organisation.');
  }

  const overlaps = await findOverlaps(facilityId, date, startMs, endMs, excludeBookingId);

  return {
    available: overlaps.length === 0,
    facilityName: facSnap.data()?.name ?? facilityId,
    conflicts: overlaps.map((doc) => {
      const d = doc.data();
      return {bookingId: doc.id, label: d.label, startMs: d.startMs, endMs: d.endMs, teamId: d.teamId ?? null};
    }),
  };
});

// ── bookFacility ──────────────────────────────────────────────────────────────

/**
 * Transactionally creates a facility booking with a collision lock.
 * If any overlap is detected inside the transaction, throws `already-exists`
 * which the UI maps to a 409 "RESOURCE UNAVAILABLE" banner.
 *
 * Input:
 *   {
 *     facilityId, date, startMs, endMs,
 *     label, eventType, eventId?, teamId?
 *   }
 *
 * Returns: { bookingId: string }
 */
exports.bookFacility = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const role = request.auth.token.role ?? '';
  const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
  const callerUid = request.auth.uid;

  if (!['coach', 'director', 'super_admin', 'global_admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Coach or Director role required to book facilities.');
  }
  if (!tenantId) throw new HttpsError('permission-denied', 'No tenant on token.');

  const {facilityId, date, startMs, endMs, label, eventType = 'other', eventId = null, teamId = null} = request.data ?? {};
  if (!facilityId || !date || !startMs || !endMs || !label) {
    throw new HttpsError('invalid-argument', 'facilityId, date, startMs, endMs, label are required.');
  }
  if (endMs <= startMs) {
    throw new HttpsError('invalid-argument', 'endMs must be after startMs.');
  }
  if (endMs - startMs > 24 * 60 * 60 * 1000) {
    throw new HttpsError('invalid-argument', 'Booking cannot exceed 24 hours.');
  }

  // Verify facility ownership
  const facSnap = await db.doc(`facilities/${facilityId}`).get();
  if (!facSnap.exists) throw new HttpsError('not-found', 'Facility not found.');
  if (facSnap.data()?.tenantId !== tenantId && !['super_admin', 'global_admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Facility belongs to another organisation.');
  }

  // Pre-check outside transaction for fast fail (no strong consistency guarantee here)
  const preCheck = await findOverlaps(facilityId, date, startMs, endMs);
  if (preCheck.length > 0) {
    throw new HttpsError('already-exists', summariseConflicts(preCheck), {
      conflictType: 'facility_overlap',
      conflicts: preCheck.map((doc) => {
        const d = doc.data();
        return {bookingId: doc.id, label: d.label, startMs: d.startMs, endMs: d.endMs};
      }),
    });
  }

  // TRANSACTIONAL BOOKING — prevents race conditions
  const newBookingRef = db.collection('facility_bookings').doc();

  try {
    await db.runTransaction(async (tx) => {
      // Re-check inside transaction for strong consistency
      const transactionalConflicts = await findOverlaps(facilityId, date, startMs, endMs, null, tx);
      if (transactionalConflicts.length > 0) {
        throw new HttpsError('already-exists', summariseConflicts(transactionalConflicts), {
          conflictType: 'facility_overlap',
          conflicts: transactionalConflicts.map((doc) => {
            const d = doc.data();
            return {bookingId: doc.id, label: d.label, startMs: d.startMs, endMs: d.endMs};
          }),
        });
      }

      tx.set(newBookingRef, {
        bookingId: newBookingRef.id,
        facilityId,
        facilityName: facSnap.data()?.name ?? facilityId,
        tenantId,
        teamId,
        eventType,
        eventId,
        label,
        date,
        startMs,
        endMs,
        bookedByUid: callerUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    // Re-throw HttpsErrors from inside the transaction
    if (err instanceof HttpsError) throw err;
    logger.error('[bookFacility] transaction error', {err: err.message});
    throw new HttpsError('internal', `Booking failed: ${err.message}`);
  }

  logger.info('[bookFacility] booked', {bookingId: newBookingRef.id, facilityId, date});
  return {bookingId: newBookingRef.id};
});

// ── releaseFacilityBooking ────────────────────────────────────────────────────

/**
 * Cancels an existing booking. Only the creator, a coach, or a director may cancel.
 *
 * Input: { bookingId: string }
 * Returns: { released: boolean }
 */
exports.releaseFacilityBooking = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const role = request.auth.token.role ?? '';
  const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
  const callerUid = request.auth.uid;

  const {bookingId} = request.data ?? {};
  if (!bookingId) throw new HttpsError('invalid-argument', 'bookingId is required.');

  const bookingRef = db.doc(`facility_bookings/${bookingId}`);
  const snap = await bookingRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Booking not found.');

  const data = snap.data();
  const isOwner = data.bookedByUid === callerUid;
  const isAdmin = ['director', 'super_admin', 'global_admin'].includes(role);
  const sameTenant = data.tenantId === tenantId;

  if (!isOwner && !(isAdmin && sameTenant)) {
    throw new HttpsError('permission-denied', 'Only the booking creator or a director can release this booking.');
  }

  await bookingRef.delete();

  await db.collection('audit_logs').add({
    action: 'FACILITY_BOOKING_RELEASED',
    actorUid: callerUid,
    bookingId,
    facilityId: data.facilityId,
    tenantId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('[releaseFacilityBooking] released', {bookingId});
  return {released: true};
});

// ── listFacilities ────────────────────────────────────────────────────────────

/**
 * Returns all active facilities for the caller's tenant.
 * Returns: { facilities: Array<{ facilityId, name, location, capacity, pitchType }> }
 */
exports.listFacilities = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
  if (!tenantId) throw new HttpsError('permission-denied', 'No tenant on token.');

  const snap = await db
      .collection('facilities')
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .orderBy('name')
      .get();

  return {
    facilities: snap.docs.map((doc) => {
      const d = doc.data();
      return {
        facilityId: doc.id,
        name: d.name,
        location: d.location ?? null,
        capacity: d.capacity ?? null,
        pitchType: d.pitchType ?? 'outdoor',
      };
    }),
  };
});
