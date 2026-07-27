const fs = require('fs');

let content = fs.readFileSync('functions/src/domains/trainingOps.js', 'utf8');

const missingProof = !content.includes('exports.submitCompletionProof =');
if (missingProof) {
  content += `

/**
 * SUBMIT COMPLETION PROOF
 */
exports.submitCompletionProof = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'must be logged in');
    }

    const { playerUid, drillId, proofNote, mediaStoragePath } = request.data;
    const userDoc = (await admin.firestore().collection('users').doc(playerUid).get()).data() || {};
    const householdId = userDoc.householdId;
    const clubId = userDoc.clubId || userDoc.tenantId;
    const teamId = userDoc.teamId;

    // validation
    if (typeof proofNote !== 'string' || proofNote.length > 500) {
      throw new HttpsError('invalid-argument', 'proofNote must be string <= 500');
    }

    // B4c validations
    if (mediaStoragePath !== undefined && mediaStoragePath !== null) {
      if (typeof mediaStoragePath !== 'string') {
        throw new HttpsError('invalid-argument', 'mediaStoragePath must be string');
      }
      if (mediaStoragePath.length > 512) {
        throw new HttpsError('invalid-argument', 'mediaStoragePath must be 512 characters or fewer.');
      }
      if (!mediaStoragePath.startsWith(\`households/\${householdId}/proof_media/\${playerUid}/\`)) {
        throw new HttpsError('permission-denied', 'mediaStoragePath must be within your own household proof_media folder.');
      }
    }

    const firestore = admin.firestore();
    const verificationRef = firestore.collection('completion_verifications').doc();

    await verificationRef.set({
      playerUid,
      drillId,
      proofNote: proofNote.trim(),
      mediaStoragePath: mediaStoragePath || null,
      mediaApproved: false,
      status: 'pending',
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, verificationId: verificationRef.id, status: 'pending' };
  }
);

/**
 * PARENT REVIEW COMPLETION PROOF
 */
exports.parentReviewCompletionProof = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'must be logged in');
    }

    const { verificationId, decision, recordUserKey } = request.data;

    if (typeof verificationId !== 'string' || verificationId.trim() === '') {
      throw new HttpsError('invalid-argument', 'verificationId required');
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpsError('invalid-argument', 'decision must be approved or rejected');
    }

    const firestore = admin.firestore();
    const householdSnap = await firestore.collection('households').where('playerEmails', 'array-contains', recordUserKey).get();

    if (householdSnap.empty) {
        throw new HttpsError('permission-denied', 'cross-household access');
    }

    const verificationRef = firestore.collection('completion_verifications').doc(verificationId);
    const cvSnap = await verificationRef.get();
    if (!cvSnap.exists) {
        throw new HttpsError('not-found', 'verification not found');
    }
    const cv = cvSnap.data();

    if (cv.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'only pending records can be reviewed');
    }

    const mediaApproved = decision === 'approved';

    await verificationRef.update({
      status: decision,
      reviewedByUid: request.auth.uid,
      reviewedByEmail: request.auth.token.email,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      mediaApproved
    });

    return { verificationId, status: decision };
  }
);
`;
  fs.writeFileSync('functions/src/domains/trainingOps.js', content);
  console.log('Appended proof callables');
} else {
  console.log('Already exists');
}
