'use strict';

/**
 * Zero-Trust RBAC resolution for universal roster ingestion.
 * Validates the caller token and strips incoming payloads of any
 * restricted fields (role, tenantId, etc.) enforcing safe boundaries.
 */

const {HttpsError} = require('firebase-functions/v2/https');

/**
 * Validates director access and resolves context.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @return {{ role: string, tenantId: string, callerUid: string }}
 */
function resolveDirectorRbac(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tenantId = request.auth.token.clubId || request.auth.token.tenantId || '';
  const callerUid = request.auth.uid;

  if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'Director role required for roster ingestion.');
  }

  if (!tenantId && role === 'director') {
    throw new HttpsError('failed-precondition', 'No tenantId on your account.');
  }

  return {role, tenantId, callerUid};
}

/**
 * Safely parses the callable payload strictly.
 * @param {unknown} rawData
 * @return {{ format: string, content: string, teamId: string | null }}
 */
function sanitizeIngestPayload(rawData) {
  const data = rawData || {};
  const format = typeof data.format === 'string' ? data.format.trim().toLowerCase() : '';
  const content = typeof data.content === 'string' && data.content ? data.content :
                  typeof data.contentBase64 === 'string' ? data.contentBase64 : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : null;

  return {format, content, teamId};
}

/**
 * Helper to validate basic arguments for ingestRoster.
 * @param {{ format: string, content: string }} payload
 */
function validateIngestPayload(payload) {
  const {format, content} = payload;
  if (!format || !['csv', 'json', 'pdf'].includes(format)) {
    throw new HttpsError('invalid-argument', 'format must be "csv", "json", or "pdf".');
  }
  if (!content) {
    throw new HttpsError('invalid-argument', 'content is required.');
  }
}

module.exports = {
  resolveDirectorRbac,
  sanitizeIngestPayload,
  validateIngestPayload,
};
