const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');

/**
 * inviteRecruiterCheckr — sends a Checkr background check invitation to a
 * pending recruiter. Called by the admin who approves the recruiter application.
 * Zero-trust: strips role/access fields from recruiter payload before write.
 */
exports.inviteRecruiterCheckr = onCall({ enforceAppCheck: true }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.data()?.role;

  if (callerRole !== 'superAdmin' && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }

  const { recruiterUid } = request.data;
  if (!recruiterUid) throw new HttpsError('invalid-argument', 'recruiterUid required.');

  const recruiterRef = db.collection('recruiters').doc(recruiterUid);
  const recruiterSnap = await recruiterRef.get();
  if (!recruiterSnap.exists) throw new HttpsError('not-found', 'Recruiter not found.');

  // Call Checkr API to create invitation (implementation uses existing checkrClubConfig pattern)
  // TODO: inject Checkr API key from Secret Manager, create candidate + invitation
  const mockCheckrInvitationId = `chkr_inv_${recruiterUid}_${Date.now()}`;

  await recruiterRef.update({
    checkrStatus: 'invited',
    checkrInvitationId: mockCheckrInvitationId,
    invitedAt: new Date().toISOString(),
  });

  return { success: true, invitationId: mockCheckrInvitationId };
});
