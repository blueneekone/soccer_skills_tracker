/**
 * Denormalize household guardian fields onto player_lookup for roster/comms surfaces.
 * player_lookup writes remain Cloud Function–only (Firestore rules).
 */
const admin = require('firebase-admin');

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

/**
 * @param {import('firebase-admin/firestore').WriteBatch} batch
 * @param {string} playerEmail
 * @param {{
 *   householdId?: string,
 *   parentEmails?: string[],
 *   vpcStatus?: string,
 * }} fields
 */
function stampPlayerLookupGuardians(batch, playerEmail, fields) {
  const em = String(playerEmail || '').trim().toLowerCase();
  if (!em) return;

  /** @type {Record<string, unknown>} */
  const payload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (typeof fields.householdId === 'string' && fields.householdId.trim()) {
    payload.householdId = fields.householdId.trim();
  }
  if (Array.isArray(fields.parentEmails) && fields.parentEmails.length > 0) {
    payload.parentEmails = [...new Set(
        fields.parentEmails.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean),
    )];
  }
  if (typeof fields.vpcStatus === 'string' && fields.vpcStatus.trim()) {
    payload.vpcStatus = fields.vpcStatus.trim();
  }

  batch.set(db().collection('player_lookup').doc(em), payload, {merge: true});
}

/**
 * After household merge, refresh guardian denorm on every linked player row.
 * @param {import('firebase-admin/firestore').WriteBatch} batch
 * @param {string[]} playerEmails
 * @param {string} householdId
 * @param {string[]} parentEmails
 * @param {Map<string, Record<string, unknown>>} userMap
 */
function stampAllPlayerLookupGuardians(
    batch,
    playerEmails,
    householdId,
    parentEmails,
    userMap,
) {
  for (const em of playerEmails) {
    const u = userMap.get(em) || {};
    const vpc =
        typeof u.vpcStatus === 'string' && u.vpcStatus.trim() ?
          u.vpcStatus.trim() :
          undefined;
    stampPlayerLookupGuardians(batch, em, {
      householdId,
      parentEmails,
      vpcStatus: vpc,
    });
  }
}

module.exports = {
  stampPlayerLookupGuardians,
  stampAllPlayerLookupGuardians,
};
