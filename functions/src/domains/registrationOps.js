'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {normEmail} = require('../utils/formatters');
const {stampPlayerLookupGuardians} = require('./householdGraph');
const {postChannelSystemMessage} = require('./commsChannelOps');

const REGION = 'us-east1';
const db = () => admin.firestore();

/**
 * @param {string} role
 * @param {string} tokenClub
 * @param {string} clubId
 */
function staffCanAccessClub(role, tokenClub, clubId) {
  if (role === 'super_admin' || role === 'global_admin') return true;
  if (role === 'director' || role === 'registrar') {
    return Boolean(tokenClub && tokenClub === clubId);
  }
  return false;
}

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

/**
 * Director/registrar: assign a paid season registration to a team roster + player_lookup.
 * Input: { registrationId: string, teamId: string }
 */
exports.assignSeasonRegistrationToRoster = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = ['director', 'registrar', 'super_admin', 'global_admin'].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Director or registrar access required.');
  }

  const data = request.data || {};
  const registrationId =
    typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
  const teamId =
    typeof data.teamId === 'string' ? data.teamId.trim() : '';

  if (!registrationId || !teamId) {
    throw new HttpsError(
        'invalid-argument',
        'registrationId and teamId are required.',
    );
  }

  const regRef = db().collection('season_registrations').doc(registrationId);
  const teamRef = db().collection('teams').doc(teamId);
  const [regSnap, teamSnap] = await Promise.all([regRef.get(), teamRef.get()]);

  if (!regSnap.exists) {
    throw new HttpsError('not-found', 'Registration not found.');
  }
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }

  const reg = regSnap.data() || {};
  const tenantId =
    typeof reg.tenantId === 'string' ? reg.tenantId.trim() : '';
  const paymentStatus =
    typeof reg.paymentStatus === 'string' ? reg.paymentStatus.trim() : '';

  if (paymentStatus !== 'paid') {
    throw new HttpsError(
        'failed-precondition',
        'Only paid registrations can be assigned to a roster.',
    );
  }

  if (!staffCanAccessClub(role, tokenClub, tenantId)) {
    throw new HttpsError('permission-denied', 'Registration must belong to your club.');
  }

  const teamClub =
    typeof teamSnap.data().clubId === 'string' ? teamSnap.data().clubId.trim() : '';
  if (teamClub && teamClub !== tenantId) {
    throw new HttpsError('failed-precondition', 'Team must belong to the registration club.');
  }

  const playerEmail = normEmail(reg.playerEmail);
  if (!playerEmail) {
    throw new HttpsError('failed-precondition', 'Registration missing player email.');
  }

  const uRef = db().collection('users').doc(playerEmail);
  const plRef = db().collection('player_lookup').doc(playerEmail);
  const rosterRef = db().collection('rosters').doc(teamId);
  const entRef = db().collection('license_entitlements').doc(tenantId);
  const teamEntRef = db().collection('team_entitlements').doc(teamId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const txResult = await db().runTransaction(async (transaction) => {
    const [uSnap, plSnap, rosterSnap, entSnap, teamEntSnap] = await Promise.all([
      transaction.get(uRef),
      transaction.get(plRef),
      transaction.get(rosterRef),
      transaction.get(entRef),
      transaction.get(teamEntRef),
    ]);

    let playerName =
      uSnap.exists && typeof uSnap.data().playerName === 'string' ?
        uSnap.data().playerName.trim().slice(0, 200) :
        '';
    if (!playerName && plSnap.exists && typeof plSnap.data().playerName === 'string') {
      playerName = plSnap.data().playerName.trim().slice(0, 200);
    }
    if (!playerName) {
      const slug = playerEmail.split('@')[0] || 'Athlete';
      playerName = slug.replace(/[._-]+/g, ' ').trim() || 'Athlete';
    }

    const oldTeamId =
      (plSnap.exists && typeof plSnap.data().teamId === 'string' ?
        plSnap.data().teamId.trim() :
        '') ||
      (uSnap.exists && typeof uSnap.data().teamId === 'string' ?
        uSnap.data().teamId.trim() :
        '') ||
      (typeof reg.assignedTeamId === 'string' ? reg.assignedTeamId.trim() : '');

    if (oldTeamId === teamId && plSnap.exists && plSnap.data().teamId === teamId) {
      return {kind: 'noop', playerEmail, playerName, teamId};
    }

    let householdId =
      uSnap.exists && typeof uSnap.data().householdId === 'string' ?
        uSnap.data().householdId.trim() :
        '';
    if (!householdId && plSnap.exists && typeof plSnap.data().householdId === 'string') {
      householdId = plSnap.data().householdId.trim();
    }

    const oldRosterRef =
      oldTeamId && oldTeamId !== teamId ?
        db().collection('rosters').doc(oldTeamId) :
        null;
    const oldTeamEntRef =
      oldTeamId && oldTeamId !== teamId ?
        db().collection('team_entitlements').doc(oldTeamId) :
        null;
    const householdRef =
      householdId ? db().collection('households').doc(householdId) : null;

    const [oldRosterSnap, oldTeamEntSnap, hSnap] = await Promise.all([
      oldRosterRef ? transaction.get(oldRosterRef) : Promise.resolve(null),
      oldTeamEntRef ? transaction.get(oldTeamEntRef) : Promise.resolve(null),
      householdRef ? transaction.get(householdRef) : Promise.resolve(null),
    ]);

    const rosterPlayers = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
      rosterSnap.data().players.filter((x) => typeof x === 'string') :
      [];
    const alreadyOnRoster = rosterPlayers.includes(playerName);

    if (plSnap.exists) {
      const existingTid = plSnap.data().teamId;
      if (existingTid && existingTid !== teamId && existingTid !== oldTeamId) {
        throw new HttpsError(
            'already-exists',
            'Player is already linked to another team.',
        );
      }
    }

    if (teamEntSnap.exists && !alreadyOnRoster && oldTeamId !== teamId) {
      const td = teamEntSnap.data() || {};
      const teClub = typeof td.clubId === 'string' ? td.clubId.trim() : '';
      if (teClub && teClub !== tenantId) {
        throw new HttpsError('failed-precondition', 'Target team scope mismatch.');
      }
      const tLimit =
        typeof td.seats_limit === 'number' && !Number.isNaN(td.seats_limit) ?
          td.seats_limit :
          0;
      const tActive =
        typeof td.active_seats === 'number' && !Number.isNaN(td.active_seats) ?
          td.active_seats :
          0;
      if (tLimit > 0 && tActive >= tLimit) {
        throw new HttpsError('failed-precondition', 'team-full');
      }
    }

    const addingSeat = !oldTeamId || oldTeamId !== teamId;
    const isFirstAssignment = !oldTeamId;
    if (isFirstAssignment && !alreadyOnRoster) {
      if (!entSnap.exists) {
        throw new HttpsError(
            'failed-precondition',
            'Club license is not configured yet.',
        );
      }
      const ent = entSnap.data() || {};
      const seatsLimit =
        typeof ent.seats_limit === 'number' && !Number.isNaN(ent.seats_limit) ?
          ent.seats_limit :
          0;
      const activeSeats =
        typeof ent.active_seats === 'number' && !Number.isNaN(ent.active_seats) ?
          ent.active_seats :
          0;
      const reservedSeats =
        typeof ent.reserved_seats === 'number' && !Number.isNaN(ent.reserved_seats) ?
          ent.reserved_seats :
          0;
      if (seatsLimit > 0 && activeSeats + reservedSeats >= seatsLimit) {
        throw new HttpsError(
            'resource-exhausted',
            'Licensed roster seats are fully allocated.',
        );
      }
    }

    if (oldTeamId && oldTeamId !== teamId && oldRosterRef && oldRosterSnap?.exists) {
      const oldPlayers = Array.isArray(oldRosterSnap.data().players) ?
        oldRosterSnap.data().players.filter((x) => typeof x === 'string') :
        [];
      if (oldPlayers.includes(playerName)) {
        transaction.set(
            oldRosterRef,
            {
              players: oldPlayers.filter((n) => n !== playerName),
              updatedAt: now,
            },
            {merge: true},
        );
      }
    }
    if (oldTeamId && oldTeamId !== teamId && oldTeamEntRef && oldTeamEntSnap?.exists) {
      transaction.update(oldTeamEntRef, {
        active_seats: admin.firestore.FieldValue.increment(-1),
        updatedAt: now,
        updatedBy: 'system:assignSeasonRegistrationToRoster',
      });
    }

    if (!alreadyOnRoster) {
      transaction.set(
          rosterRef,
          {
            players: [...rosterPlayers, playerName],
            updatedAt: now,
          },
          {merge: true},
      );
    }

    if (addingSeat && teamEntSnap.exists && !alreadyOnRoster && oldTeamId !== teamId) {
      transaction.update(teamEntRef, {
        active_seats: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
        updatedBy: 'system:assignSeasonRegistrationToRoster',
      });
    }
    if (isFirstAssignment && !alreadyOnRoster) {
      transaction.update(entRef, {
        active_seats: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
        updatedBy: 'system:assignSeasonRegistrationToRoster',
      });
    }

    /** @type {Record<string, unknown>} */
    const lookupPayload = {
      email: playerEmail,
      playerEmail,
      playerName,
      teamId,
      clubId: tenantId,
      updatedAt: now,
    };

    /** @type {string[]} */
    let parentEmails = [];
    let vpcStatus;
    if (hSnap?.exists) {
      const h = hSnap.data() || {};
      parentEmails = Array.isArray(h.parentEmails) ?
        h.parentEmails.map((x) => normEmail(String(x || ''))).filter(Boolean) :
        [];
      lookupPayload.householdId = householdId;
    }
    if (uSnap.exists && typeof uSnap.data().vpcStatus === 'string') {
      vpcStatus = uSnap.data().vpcStatus.trim();
    }
    transaction.set(plRef, lookupPayload, {merge: true});
    stampPlayerLookupGuardians(transaction, playerEmail, {
      householdId: householdId || undefined,
      parentEmails: parentEmails.length ? parentEmails : undefined,
      vpcStatus,
    });

    if (uSnap.exists) {
      transaction.set(
          uRef,
          {teamId, clubId: tenantId, updatedAt: now},
          {merge: true},
      );
    }

    transaction.update(regRef, {
      assignedTeamId: teamId,
      rosterAssignedAt: now,
      updatedAt: now,
    });

    return {kind: 'ok', playerEmail, playerName, teamId, tenantId, householdId};
  });

  if (txResult.kind === 'noop') {
    return {
      ok: true,
      noop: true,
      registrationId,
      ...txResult,
    };
  }

  if (txResult.householdId && txResult.tenantId && txResult.teamId) {
    void postChannelSystemMessage({
      channelType: 'registration',
      clubId: txResult.tenantId,
      householdId: txResult.householdId,
      playerEmail: txResult.playerEmail,
      teamId: txResult.teamId,
      subject: 'Assigned to team',
      body: `${txResult.playerName || txResult.playerEmail} was assigned to team ${txResult.teamId}.`,
      sourceCallable: 'assignSeasonRegistrationToRoster',
      actorRole: 'system',
    }).catch(() => undefined);
  }

  return {
    ok: true,
    registrationId,
    playerEmail: txResult.playerEmail,
    playerName: txResult.playerName,
    teamId: txResult.teamId,
    tenantId: txResult.tenantId,
  };
});
