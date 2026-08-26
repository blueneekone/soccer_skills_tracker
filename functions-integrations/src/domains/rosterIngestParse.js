'use strict';

/**
 * Shared roster file parsing for director ingestRoster + coachRosterIngest.
 */

const pdfParse = require('pdf-parse');
const {GoogleGenAI} = require('@google/genai');
const logger = require('firebase-functions/logger');

const MAX_PLAYERS_PER_BATCH = 200;

const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

/**
 * @param {string} text
 * @return {Record<string, string>[]}
 */
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  function splitLine(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    if (vals.every((v) => !v.trim())) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * @param {Record<string, string>} row
 * @param {...string} keys
 * @return {string}
 */
function getCol(row, ...keys) {
  for (const k of keys) {
    const v = row[k] ?? row[k.replace(/\s+/g, '_').toLowerCase()];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

/**
 * Director ingest — email required.
 * @param {Record<string, string>} row
 * @return {{ email: string, displayName?: string, position?: string, dateOfBirth?: string, jerseyNumber?: string } | null}
 */
function mapRowToSchema(row) {
  const email = normEmail(getCol(row, 'email', 'email_address', 'player_email', 'e_mail'));
  const displayName = getCol(row, 'name', 'full_name', 'player_name', 'first_last', 'display_name') ||
    `${getCol(row, 'first_name', 'first')} ${getCol(row, 'last_name', 'last')}`.trim();
  const position = getCol(row, 'position', 'pos', 'player_position', 'field_position');
  const dateOfBirth = getCol(row, 'dob', 'date_of_birth', 'birth_date', 'birthday');
  const jerseyNumber = getCol(row, 'number', 'jersey', 'jersey_number', 'shirt_number', 'no_');

  if (!email || !isValidEmail(email)) return null;

  return {
    email,
    displayName: displayName || undefined,
    position: position || undefined,
    dateOfBirth: dateOfBirth || undefined,
    jerseyNumber: jerseyNumber || undefined,
  };
}

/**
 * Coach bulk import — name required, email optional.
 * @param {Record<string, string>} row
 * @return {{ playerName: string, playerEmail?: string, jersey?: string } | null}
 */
function mapCsvRowToCoachPlayer(row) {
  let playerName =
    getCol(row, 'name', 'full_name', 'player_name', 'first_last', 'display_name') ||
    `${getCol(row, 'first_name', 'first')} ${getCol(row, 'last_name', 'last')}`.trim();
  playerName = playerName.replace(/\s+/g, ' ');
  if (!playerName || playerName.length > 200) return null;

  const emailRaw = getCol(row, 'email', 'email_address', 'player_email', 'e_mail');
  let playerEmail;
  if (emailRaw) {
    const normalized = normEmail(emailRaw);
    if (!normalized || !isValidEmail(normalized)) return null;
    playerEmail = normalized;
  }

  const jerseyRaw = getCol(row, 'number', 'jersey', 'jersey_number', 'shirt_number', 'no_');
  const jersey = jerseyRaw ? jerseyRaw.slice(0, 16) : undefined;

  return {
    playerName,
    ...(playerEmail ? {playerEmail} : {}),
    ...(jersey ? {jersey} : {}),
  };
}

/**
 * @param {string} rawText
 * @param {string} apiKey
 * @return {Promise<Array<{email?: string, displayName?: string, jerseyNumber?: string}>>}
 */
async function extractPlayersFromPdfText(rawText, apiKey) {
  const ai = new GoogleGenAI({apiKey});

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      'You are a data extraction assistant for a soccer club management system.',
      'Extract ALL player entries from the following roster document text.',
      'Rosters often have an "Admins" (coaches/managers) section and a "Players" section. DO NOT include Coaches, Assistant Coaches, or Team Managers as players.',
      'When rows list "Player ID Last Name First Name DOB ...", extract displayName as "First Name Last Name".',
      'For each player, extract: email, displayName (full name), position, date of birth (ISO 8601), jerseyNumber.',
      'If a field is not present in the document, omit it from that player\'s object.',
      'Return ONLY a valid JSON array. No explanations, no markdown fences.',
      'Example: [{"email":"j.smith@email.com","displayName":"John Smith","position":"Midfielder","dateOfBirth":"2008-03-15","jerseyNumber":"7"}]',
      '',
      '--- ROSTER DOCUMENT TEXT ---',
      rawText.slice(0, 12000),
    ].join('\n'),
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const clean = text.replace(/```(?:json)?\n?|```/g, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    logger.warn('[rosterIngestParse] Gemini PDF extraction: JSON parse failed', {
      snippet: text.slice(0, 200),
    });
    return [];
  }
}

/**
 * @param {unknown} player
 * @return {{ playerName: string, playerEmail?: string, jersey?: string } | null}
 */
function mapExtractedPlayerToCoach(player) {
  if (!player || typeof player !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ (player);
  const rawName =
    typeof p.displayName === 'string' ? p.displayName.trim() :
    typeof p.name === 'string' ? p.name.trim() :
    typeof p.playerName === 'string' ? p.playerName.trim() :
    '';
  const playerName = rawName.replace(/\s+/g, ' ');
  if (!playerName || playerName.length > 200) return null;

  let playerEmail;
  if (typeof p.email === 'string' && p.email.trim()) {
    const normalized = normEmail(p.email);
    if (normalized && isValidEmail(normalized)) playerEmail = normalized;
  }

  let jersey;
  const jerseyRaw =
    typeof p.jerseyNumber === 'string' ? p.jerseyNumber :
    typeof p.jersey === 'string' ? p.jersey :
    typeof p.number === 'string' ? p.number :
    p.jerseyNumber != null ? String(p.jerseyNumber) :
    p.jersey != null ? String(p.jersey) :
    '';
  if (jerseyRaw && String(jerseyRaw).trim()) {
    jersey = String(jerseyRaw).trim().slice(0, 16);
  }

  return {
    playerName,
    ...(playerEmail ? {playerEmail} : {}),
    ...(jersey ? {jersey} : {}),
  };
}

/**
 * Deterministic local fallback parser when Gemini is unavailable or returns empty.
 * @param {string} rawText
 * @return {Array<{ displayName?: string, email?: string, jerseyNumber?: string }>}
 */
function extractPlayersFromPdfTextFallback(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  const players = [];
  let inAdmins = false;
  let inPlayers = false;

  for (const line of lines) {
    if (/^Admins\b/i.test(line) || /^Admin\s*ID/i.test(line)) {
      inAdmins = true;
      inPlayers = false;
      continue;
    }
    if (/^Players\b/i.test(line) || /^Player\s*ID/i.test(line)) {
      inPlayers = true;
      inAdmins = false;
      continue;
    }
    if (/^(Signatures|Printed\s*On|Team\s*Roster)/i.test(line)) {
      inAdmins = false;
      inPlayers = false;
      continue;
    }

    if (inAdmins) continue;

    // Pattern 1: Affinity / UYSA format with or without spaces:
    // e.g. 28990-249512MilleeAnderson10/08/2015... or 28990-249512 Millee Anderson 10/08/2015
    const affinityMatch = line.match(/^\s*(\d{4,7}-\d{4,8})\s*([A-Z][a-z]+)\s*([A-Z][a-zA-Z'-]+)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (affinityMatch) {
      const firstName = affinityMatch[2].trim();
      const lastName = affinityMatch[3].trim();
      players.push({
        displayName: `${firstName} ${lastName}`,
      });
      continue;
    }

    // Pattern 2: GotSport format: [Jersey#] [LastName] [FirstName] [DOB] ...
    const gotSportMatch = line.match(/^\s*#?\s*(\d{1,3})\s+([A-Za-z'.-]+)\s+([A-Za-z'.-]+)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (gotSportMatch && inPlayers) {
      const jersey = gotSportMatch[1];
      const lastName = gotSportMatch[2].trim();
      const firstName = gotSportMatch[3].trim();
      players.push({
        displayName: `${firstName} ${lastName}`,
        jerseyNumber: jersey,
      });
      continue;
    }

    // Pattern 3: Comma separated: [LastName], [FirstName]
    const commaMatch = line.match(/^\s*([A-Za-z'.-]+),\s*([A-Za-z'.-]+)/);
    if (commaMatch && inPlayers) {
      players.push({
        displayName: `${commaMatch[2].trim()} ${commaMatch[1].trim()}`,
      });
      continue;
    }
  }
  return players;
}

/**
 * @param {string} contentBase64
 * @param {string} apiKey
 * @return {Promise<Array<{ playerName: string, playerEmail?: string, jersey?: string }>>}
 */
async function parsePdfBase64ToCoachPlayers(contentBase64, apiKey) {
  let pdfBuf;
  try {
    pdfBuf = Buffer.from(contentBase64, 'base64');
  } catch {
    throw new Error('PDF content must be Base64-encoded.');
  }
  let pdfText = '';
  try {
    const pdfData = await pdfParse(pdfBuf);
    pdfText = (pdfData && pdfData.text) ? pdfData.text : '';
  } catch (err) {
    throw new Error(`PDF parse failed: ${err.message}`);
  }

  let extracted = [];
  if (apiKey) {
    try {
      extracted = await extractPlayersFromPdfText(pdfText, apiKey);
    } catch (err) {
      logger.warn('[rosterIngestParse] Gemini PDF extraction failed, using local parser', {
        error: err && err.message ? err.message : String(err),
      });
    }
  }

  if (!extracted || !extracted.length) {
    extracted = extractPlayersFromPdfTextFallback(pdfText);
  }

  return extracted.map(mapExtractedPlayerToCoach).filter(Boolean);
}

/**
 * @param {string} contentBase64
 * @return {Array<{ playerName: string, playerEmail?: string, jersey?: string }>}
 */
function parseCsvBase64ToCoachPlayers(contentBase64) {
  let text;
  try {
    text = Buffer.from(contentBase64, 'base64').toString('utf8');
  } catch {
    throw new Error('CSV content must be Base64-encoded UTF-8 text.');
  }
  return parseCsv(text).map(mapCsvRowToCoachPlayer).filter(Boolean);
}

module.exports = {
  MAX_PLAYERS_PER_BATCH,
  normEmail,
  isValidEmail,
  parseCsv,
  mapRowToSchema,
  mapCsvRowToCoachPlayer,
  extractPlayersFromPdfText,
  extractPlayersFromPdfTextFallback,
  mapExtractedPlayerToCoach,
  parsePdfBase64ToCoachPlayers,
  parseCsvBase64ToCoachPlayers,
};
