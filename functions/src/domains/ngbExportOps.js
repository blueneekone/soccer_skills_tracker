'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {normEmail} = require('../utils/formatters');

const REGION = 'us-east1';
const db = () => admin.firestore();
const MAX_EXPORT_ROWS = 500;

/** Phase 1 CSV v1 — universal state-roster columns (NGB-agnostic). */
const CSV_HEADERS = [
  'player_name',
  'player_email',
  'team_id',
  'team_name',
  'jersey_number',
  'date_of_birth',
  'household_id',
  'guardian_emails',
  'primary_guardian_email',
  'vpc_status',
  'club_id',
];

/**
 * @param {unknown} value
 * @return {string}
 */
function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * @param {Array<Record<string, string>>} rows
 * @return {string}
 */
function rowsToCsv(rows) {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(CSV_HEADERS.map((h) => escapeCsvCell(row[h] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {unknown} raw
 * @return {string}
 */
function formatDob(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw &&
      typeof raw.toDate === 'function') {
    try {
      return raw.toDate().toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * @param {string} clubId
 * @param {string} [teamId]
 */
async function resolveTargetTeams(clubId, teamId) {
  if (teamId) {
    const teamSnap = await db().collection('teams').doc(teamId).get();
    if (!teamSnap.exists) {
      throw new HttpsError('not-found', 'Team not found.');
    }
    const rowClub =
      typeof teamSnap.data().clubId === 'string' ?
        teamSnap.data().clubId.trim() :
        '';
    if (rowClub !== clubId) {
      throw new HttpsError('permission-denied', 'Team does not belong to this club.');
    }
    const name =
      typeof teamSnap.data().name === 'string' && teamSnap.data().name.trim() ?
        teamSnap.data().name.trim() :
        teamId;
    return [{id: teamId, name}];
  }

  const teamsSnap = await db().collection('teams')
      .where('clubId', '==', clubId)
      .get();
  return teamsSnap.docs.map((d) => {
    const data = d.data() || {};
    const name =
      typeof data.name === 'string' && data.name.trim() ? data.name.trim() : d.id;
    return {id: d.id, name};
  });
}

/**
 * Director/registrar: export linked roster rows as CSV v1 for state/NGB filing.
 */
exports.exportStateRoster = onCall({region: REGION}, async (request) => {
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
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }

  if (role === 'director' || role === 'registrar') {
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'Export must belong to your club.');
    }
  }

  const clubSnap = await db().collection('clubs').doc(clubId).get();
  if (!clubSnap.exists) {
    throw new HttpsError('not-found', 'Club not found.');
  }

  const teamId =
    typeof data.teamId === 'string' && data.teamId.trim() ? data.teamId.trim() : '';
  const teams = await resolveTargetTeams(clubId, teamId || undefined);
  if (teams.length === 0) {
    return {
      ok: true,
      clubId,
      teamId: teamId || null,
      rowCount: 0,
      csv: rowsToCsv([]),
      filename: `state-roster-${clubId}.csv`,
    };
  }

  /** @type {Array<{
   *   playerEmail: string,
   *   playerName: string,
   *   teamId: string,
   *   teamName: string,
   *   householdId: string,
   *   parentEmails: string[],
   *   vpcStatus: string,
   * }>} */
  const players = [];

  for (const team of teams) {
    const lookupSnap = await db().collection('player_lookup')
        .where('teamId', '==', team.id)
        .get();
    lookupSnap.forEach((docSnap) => {
      const row = docSnap.data() || {};
      const playerEmail = normEmail(docSnap.id);
      if (!playerEmail) return;
      const playerName =
        typeof row.playerName === 'string' && row.playerName.trim() ?
          row.playerName.trim() :
          playerEmail;
      const householdId =
        typeof row.householdId === 'string' && row.householdId.trim() ?
          row.householdId.trim() :
          '';
      const parentEmails = Array.isArray(row.parentEmails) ?
        [...new Set(
            row.parentEmails
                .map((x) => normEmail(String(x || '')))
                .filter(Boolean),
        )] :
        [];
      const vpcStatus =
        typeof row.vpcStatus === 'string' && row.vpcStatus.trim() ?
          row.vpcStatus.trim() :
          '';
      players.push({
        playerEmail,
        playerName,
        teamId: team.id,
        teamName: team.name,
        householdId,
        parentEmails,
        vpcStatus,
      });
    });
  }

  if (players.length > MAX_EXPORT_ROWS) {
    throw new HttpsError(
        'resource-exhausted',
        `Export limited to ${MAX_EXPORT_ROWS} players; narrow with teamId.`,
    );
  }

  const householdIds = [...new Set(players.map((p) => p.householdId).filter(Boolean))];
  /** @type {Map<string, Record<string, unknown>>} */
  const householdMap = new Map();
  await Promise.all(householdIds.map(async (hid) => {
    const hSnap = await db().collection('households').doc(hid).get();
    if (hSnap.exists) householdMap.set(hid, hSnap.data() || {});
  }));

  const playerEmails = [...new Set(players.map((p) => p.playerEmail))];
  /** @type {Map<string, Record<string, unknown>>} */
  const userMap = new Map();
  await Promise.all(playerEmails.map(async (em) => {
    const uSnap = await db().collection('users').doc(em).get();
    if (uSnap.exists) userMap.set(em, uSnap.data() || {});
  }));

  /** @type {Map<string, Record<string, string>>} */
  const jerseyByTeam = new Map();
  await Promise.all(teams.map(async (team) => {
    const rosterSnap = await db().collection('rosters').doc(team.id).get();
    const jerseys = rosterSnap.exists && rosterSnap.data().jerseys &&
      typeof rosterSnap.data().jerseys === 'object' ?
      rosterSnap.data().jerseys :
      {};
    /** @type {Record<string, string>} */
    const map = {};
    for (const [name, num] of Object.entries(jerseys)) {
      if (typeof name === 'string' && name.trim() && num != null) {
        map[name.trim()] = String(num);
      }
    }
    jerseyByTeam.set(team.id, map);
  }));

  /** @type {Array<Record<string, string>>} */
  const exportRows = players
      .sort((a, b) => {
        const teamCmp = a.teamName.localeCompare(b.teamName);
        if (teamCmp !== 0) return teamCmp;
        return a.playerName.localeCompare(b.playerName);
      })
      .map((p) => {
        const household = p.householdId ? householdMap.get(p.householdId) : null;
        const hhParents = household && Array.isArray(household.parentEmails) ?
          [...new Set(
              household.parentEmails
                  .map((x) => normEmail(String(x || '')))
                  .filter(Boolean),
          )] :
          [];
        const guardians = hhParents.length > 0 ? hhParents : p.parentEmails;
        const user = userMap.get(p.playerEmail) || {};
        const dob =
          formatDob(user.dateOfBirth) ||
          formatDob(user.dob) ||
          formatDob(user.birthDate);
        const jerseys = jerseyByTeam.get(p.teamId) || {};
        const jersey = jerseys[p.playerName] || '';

        return {
          player_name: p.playerName,
          player_email: p.playerEmail,
          team_id: p.teamId,
          team_name: p.teamName,
          jersey_number: jersey,
          date_of_birth: dob,
          household_id: p.householdId,
          guardian_emails: guardians.join(';'),
          primary_guardian_email: guardians[0] || '',
          vpc_status: p.vpcStatus,
          club_id: clubId,
        };
      });

  const filename = teamId ?
    `state-roster-${clubId}-${teamId}.csv` :
    `state-roster-${clubId}.csv`;

  return {
    ok: true,
    clubId,
    teamId: teamId || null,
    rowCount: exportRows.length,
    csv: rowsToCsv(exportRows),
    filename,
  };
});

module.exports.escapeCsvCell = escapeCsvCell;
module.exports.rowsToCsv = rowsToCsv;
module.exports.CSV_HEADERS = CSV_HEADERS;
