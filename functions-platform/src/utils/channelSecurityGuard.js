'use strict';

/**
 * sanitizeChannelPayload
 * Enforces Zero-Trust Security by stripping out any protected RBAC
 * or system-reserved fields that the client might try to inject.
 *
 * @param {Record<string, any>} rawPayload
 * @returns {Record<string, any>}
 */
exports.sanitizeChannelPayload = (rawPayload) => {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }

  // Explicitly extract ONLY the allowed fields from the client
  // The client is compromised and cannot dictate SafeSport flags,
  // ccParentEmails, or roles.

  const cleanPayload = {};

  // Basic channel string fields
  if (typeof rawPayload.name === 'string') {
    cleanPayload.name = rawPayload.name.trim().slice(0, 200);
  }

  if (typeof rawPayload.type === 'string') {
    cleanPayload.type = rawPayload.type;
  }

  if (typeof rawPayload.teamId === 'string') {
    cleanPayload.teamId = rawPayload.teamId.trim();
  }

  if (typeof rawPayload.clubId === 'string') {
    cleanPayload.clubId = rawPayload.clubId.trim();
  }

  // Clean member IDs (ensure they are strings and normalized)
  if (Array.isArray(rawPayload.memberIds)) {
    cleanPayload.memberIds = rawPayload.memberIds
      .map(id => String(id).toLowerCase().trim())
      .filter(Boolean);

    // Deduplicate array
    cleanPayload.memberIds = [...new Set(cleanPayload.memberIds)];
  } else {
    cleanPayload.memberIds = [];
  }

  return cleanPayload;
};
