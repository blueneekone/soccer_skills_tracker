'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const REGION = 'us-east1';
const db = () => admin.firestore();

const ALLOWED_STAFF_ROLES = new Set([
  'assistant_coach',
  'team_manager',
  'schedule_manager',
  'event_manager',
  'head_coach',
]);

/**
 * Assigns or updates a team staff role strictly scoped under:
 * /clubs/{clubId}/teams/{teamId}/staff/{userId}
 * Client-side direct mutations of staff roles are blocked.
 */
exports.callableUpdateStaffRole = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerRole = request.auth.token.role || '';
  const tokenClub = typeof request.auth.token.clubId === 'string' ? request.auth.token.clubId.trim() : '';
  const isSuper = ['director', 'super_admin', 'global_admin'].includes(callerRole);

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const targetUserId = typeof data.targetUserId === 'string' ? data.targetUserId.trim() : '';
  const newRole = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';

  if (!clubId || !teamId || !targetUserId || !newRole) {
    throw new HttpsError('invalid-argument', 'clubId, teamId, targetUserId, and role are required.');
  }

  if (!ALLOWED_STAFF_ROLES.has(newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid staff role specified.');
  }

  if (!isSuper && (!tokenClub || tokenClub !== clubId)) {
    throw new HttpsError('permission-denied', 'You can only update staff permissions for your own club.');
  }

  const staffRef = db()
    .collection('clubs')
    .doc(clubId)
    .collection('teams')
    .doc(teamId)
    .collection('staff')
    .doc(targetUserId);

  const now = admin.firestore.FieldValue.serverTimestamp();

  await staffRef.set(
    {
      clubId,
      teamId,
      userId: targetUserId,
      role: newRole,
      updatedAt: now,
      updatedBy: request.auth.uid,
    },
    { merge: true }
  );

  logger.info(`[callableUpdateStaffRole] Updated staff ${targetUserId} role to ${newRole} under team ${teamId} in club ${clubId}`);

  return { ok: true, clubId, teamId, targetUserId, role: newRole };
});
