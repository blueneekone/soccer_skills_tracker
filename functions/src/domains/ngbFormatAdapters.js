'use strict';

/** Phase 1 universal CSV v1 columns (NGB-agnostic row model). */
const CSV_V1_HEADERS = [
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

/** US Soccer / state association roster template columns. */
const US_SOCCER_HEADERS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'player_email',
  'team_name',
  'jersey_number',
  'guardian_email',
  'household_id',
  'vpc_status',
  'club_id',
];

/** GotSport-style roster column map. */
const GOTSPORT_HEADERS = [
  'PlayerName',
  'Email',
  'DOB',
  'Team',
  'Jersey',
  'ParentEmail',
  'HouseholdID',
  'VPCStatus',
  'ClubID',
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
 * @param {string[]} headers
 * @return {string}
 */
function rowsToCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} name
 * @return {{ first: string, last: string }}
 */
function splitPlayerName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return {first: '', last: ''};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return {first: parts[0], last: ''};
  const last = parts.pop() || '';
  return {first: parts.join(' '), last};
}

/**
 * @param {Record<string, string>} row
 * @return {Record<string, string>}
 */
function mapUsSoccerRow(row) {
  const {first, last} = splitPlayerName(row.player_name || '');
  return {
    first_name: first,
    last_name: last,
    date_of_birth: row.date_of_birth || '',
    player_email: row.player_email || '',
    team_name: row.team_name || '',
    jersey_number: row.jersey_number || '',
    guardian_email: row.primary_guardian_email || '',
    household_id: row.household_id || '',
    vpc_status: row.vpc_status || '',
    club_id: row.club_id || '',
  };
}

/**
 * @param {Record<string, string>} row
 * @return {Record<string, string>}
 */
function mapGotsportRow(row) {
  return {
    PlayerName: row.player_name || '',
    Email: row.player_email || '',
    DOB: row.date_of_birth || '',
    Team: row.team_name || '',
    Jersey: row.jersey_number || '',
    ParentEmail: row.primary_guardian_email || '',
    HouseholdID: row.household_id || '',
    VPCStatus: row.vpc_status || '',
    ClubID: row.club_id || '',
  };
}

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   mimeType: string,
 *   extension: string,
 *   transform: (rows: Array<Record<string, string>>) => string,
 * }} FormatAdapter
 */

/** @type {Record<string, FormatAdapter>} */
const formatAdapterRegistry = {
  csv_v1: {
    id: 'csv_v1',
    label: 'CSV v1 (universal)',
    mimeType: 'text/csv',
    extension: 'csv',
    transform: (rows) => rowsToCsv(rows, CSV_V1_HEADERS),
  },
  us_soccer_roster: {
    id: 'us_soccer_roster',
    label: 'US Soccer / state association roster',
    mimeType: 'text/csv',
    extension: 'csv',
    transform: (rows) =>
      rowsToCsv(rows.map(mapUsSoccerRow), US_SOCCER_HEADERS),
  },
  gotsport_roster: {
    id: 'gotsport_roster',
    label: 'GotSport roster template',
    mimeType: 'text/csv',
    extension: 'csv',
    transform: (rows) =>
      rowsToCsv(rows.map(mapGotsportRow), GOTSPORT_HEADERS),
  },
};

/**
 * @param {string} formatId
 * @return {FormatAdapter | null}
 */
function getFormatAdapter(formatId) {
  const id = typeof formatId === 'string' ? formatId.trim() : '';
  return id ? formatAdapterRegistry[id] || null : null;
}

/**
 * @return {Array<{ id: string, label: string }>}
 */
function listBuiltinFormatAdapters() {
  return Object.values(formatAdapterRegistry).map((a) => ({
    id: a.id,
    label: a.label,
  }));
}

/**
 * Build a CSV adapter from a club `export_profiles/{bodyId}` document.
 *
 * @param {Record<string, unknown>} profile
 * @return {FormatAdapter | null}
 */
function buildCustomProfileAdapter(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const bodyId =
    typeof profile.bodyId === 'string' && profile.bodyId.trim() ?
      profile.bodyId.trim() :
      '';
  const label =
    typeof profile.label === 'string' && profile.label.trim() ?
      profile.label.trim() :
      bodyId || 'Custom export profile';
  const columns = Array.isArray(profile.columns) ? profile.columns : [];
  const validColumns = columns
      .filter(
          (col) =>
            col &&
            typeof col === 'object' &&
            typeof col.header === 'string' &&
            col.header.trim() &&
            typeof col.field === 'string' &&
            col.field.trim(),
      )
      .map((col) => ({
        header: col.header.trim(),
        field: col.field.trim(),
      }));

  if (validColumns.length === 0) return null;

  const headers = validColumns.map((c) => c.header);
  const profileId = bodyId || 'custom';

  return {
    id: `profile:${profileId}`,
    label,
    mimeType: 'text/csv',
    extension: 'csv',
    transform: (rows) => {
      const mapped = rows.map((row) => {
        /** @type {Record<string, string>} */
        const out = {};
        for (const col of validColumns) {
          out[col.header] = row[col.field] ?? '';
        }
        return out;
      });
      return rowsToCsv(mapped, headers);
    },
  };
}

/**
 * Resolve export adapter from built-in id or club export profile id.
 *
 * @param {string} formatId
 * @param {Record<string, unknown> | null | undefined} customProfile
 * @return {FormatAdapter | null}
 */
function resolveExportAdapter(formatId, customProfile) {
  const id = typeof formatId === 'string' ? formatId.trim() : '';
  if (id.startsWith('profile:')) {
    return buildCustomProfileAdapter(customProfile || {});
  }
  const builtin = getFormatAdapter(id || 'csv_v1');
  if (builtin) return builtin;
  if (customProfile) return buildCustomProfileAdapter(customProfile);
  return formatAdapterRegistry.csv_v1;
}

module.exports = {
  CSV_V1_HEADERS,
  CSV_HEADERS: CSV_V1_HEADERS,
  US_SOCCER_HEADERS,
  GOTSPORT_HEADERS,
  escapeCsvCell,
  rowsToCsv,
  splitPlayerName,
  mapUsSoccerRow,
  mapGotsportRow,
  formatAdapterRegistry,
  getFormatAdapter,
  listBuiltinFormatAdapters,
  buildCustomProfileAdapter,
  resolveExportAdapter,
};
