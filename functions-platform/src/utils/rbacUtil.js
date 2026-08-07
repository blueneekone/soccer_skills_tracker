'use strict';

/**
 * Strips protected RBAC fields from a payload to satisfy Zero-Trust Security.
 * @param {Record<string, unknown>} payload The incoming data payload.
 * @returns {Record<string, unknown>} The sanitized payload.
 */
function stripProtectedFields(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  // Create a shallow copy to avoid mutating the original reference
  const sanitized = { ...payload };

  const protectedFields = [
    'role',
    'clubId',
    'teamId',
    'permissions',
    'isSuperAdmin',
    'isGlobalAdmin',
    'tenantId'
  ];

  for (const field of protectedFields) {
    if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
      delete sanitized[field];
    }
  }

  return sanitized;
}

module.exports = {
  stripProtectedFields
};
