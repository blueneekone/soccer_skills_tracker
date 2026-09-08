const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');
const { defineSecret, defineString } = require('firebase-functions/params');
const CHECKR_API_KEY = defineSecret('CHECKR_API_KEY');
const CHECKR_API_ENV = defineString('CHECKR_API_ENV', { default: 'production' });

function resolveCheckrEnv() {
  const raw = String(CHECKR_API_ENV.value() || 'production').toLowerCase().trim();
  return raw === 'staging' ? 'staging' : 'production';
}

function checkrApiHost() {
  return resolveCheckrEnv() === 'staging'
    ? 'https://api.checkr-staging.com/v1'
    : 'https://api.checkr.com/v1';
}

async function checkrApiRequest(apiKey, method, path, body = null) {
  const b64Key = Buffer.from(`${apiKey}:`).toString('base64');
  const url = `${checkrApiHost()}${path.startsWith('/') ? path : `/${path}`}`;

  const opts = {
    method,
    headers: {
      Authorization: `Basic ${b64Key}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const rawBody = await res.text().catch(() => String(res.status));
  if (!res.ok) {
    const err = new Error(`Checkr API request failed: ${res.status}`);
    err.status = res.status;
    err.rawBody = rawBody;
    throw err;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('Checkr returned a non-JSON response.');
  }
}

/**
 * inviteRecruiterCheckr — sends a Checkr background check invitation to a
 * pending recruiter. Called by the admin who approves the recruiter application.
 * Zero-trust: strips role/access fields from recruiter payload before write.
 */
exports.inviteRecruiterCheckr = onCall(
  { enforceAppCheck: true, secrets: [CHECKR_API_KEY] },
  async (request) => {
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

    const apiKey = CHECKR_API_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'Checkr API key not configured.');

    const rData = recruiterSnap.data();
    let candidateId = rData.checkrCandidateId;

    if (!candidateId) {
      const candidate = await checkrApiRequest(apiKey, 'POST', '/candidates', {
        email: rData.email || `${recruiterUid}@placeholder.com`,
        first_name: rData.firstName || rData.scoutName || 'Recruiter',
        last_name: rData.lastName || 'Vetting',
      });
      candidateId = String(candidate.id || '');
      if (!candidateId) throw new HttpsError('internal', 'Checkr did not return a candidate ID.');
    }

    // Recruiters are platform-level, no specific club Checkr config applies here.
    // Assuming standard package for recruiters.
    const invitationBody = {
      candidate_id: candidateId,
      package: 'tasker_standard',
      work_locations: [{
        country: 'US',
        state: 'CA'
      }],
    };

    let invitation;
    try {
      invitation = await checkrApiRequest(apiKey, 'POST', '/invitations', invitationBody);
    } catch (inviteErr) {
      const status = inviteErr && typeof inviteErr.status === 'number' ? inviteErr.status : 500;
      throw new HttpsError(
        status === 422 || status === 403 ? 'failed-precondition' : 'internal',
        'Checkr Invitation Failed'
      );
    }

    const invitationId = String(invitation.id || '');

    await recruiterRef.update({
      checkrStatus: 'invited',
      checkrCandidateId: candidateId,
      checkrInvitationId: invitationId,
      invitedAt: new Date().toISOString(),
    });

    return { success: true, invitationId };
  }
);
