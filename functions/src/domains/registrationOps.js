'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = () => admin.firestore();

/**
 * Public (no auth): safe registration program fields for marketing /register/[clubId].
 */
exports.getPublicRegistrationProgram = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const clubId =
        typeof data.clubId === 'string' ? data.clubId.trim() : '';
      if (!clubId || clubId.length > 128) {
        throw new HttpsError('invalid-argument', 'clubId is required.');
      }

      const [orgSnap, clubSnap] = await Promise.all([
        db().doc(`organizations/${clubId}`).get(),
        db().doc(`clubs/${clubId}`).get(),
      ]);

      if (!orgSnap.exists && !clubSnap.exists) {
        return {ok: false, notFound: true};
      }

      const org = orgSnap.exists ? orgSnap.data() || {} : {};
      const club = clubSnap.exists ? clubSnap.data() || {} : {};
      const activeSeason =
        org.activeSeason && typeof org.activeSeason === 'object' ?
          org.activeSeason :
          {};

      if (activeSeason.registrationOpen === false) {
        return {ok: false, closed: true, clubId};
      }

      const seasonId =
        typeof activeSeason.seasonId === 'string' ? activeSeason.seasonId.trim() : '';
      if (!seasonId) {
        return {ok: false, notConfigured: true, clubId};
      }

      const feeRaw = Number(activeSeason.feeAmountDollars);
      const feeAmountDollars =
        Number.isFinite(feeRaw) && feeRaw > 0 ? feeRaw : 0;

      const clubName =
        (typeof club.name === 'string' && club.name.trim()) ||
        (typeof org.name === 'string' && org.name.trim()) ||
        clubId;

      return {
        ok: true,
        clubId,
        clubName,
        seasonId,
        seasonName:
          typeof activeSeason.name === 'string' && activeSeason.name.trim() ?
            activeSeason.name.trim() :
            seasonId,
        feeAmountDollars,
        registrationDeadline:
          typeof activeSeason.registrationDeadline === 'string' ?
            activeSeason.registrationDeadline :
            null,
      };
    },
);
