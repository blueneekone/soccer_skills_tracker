/* eslint-disable quotes */
/**
 * ingestRoster.js â€” Universal Roster Ingestion Engine
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Parses CSV, JSON, and PDF roster files and batch-writes
 * discovered players into Firestore under the Director's tenantId.
 *
 * For each parsed player:
 *   1. Creates (or patches) a `users/{email}` document with the Vanguard schema
 *   2. Generates a 6-character invite code in `invites/{code}` (single-use)
 *   3. Returns the invite codes so the director can distribute them
 *
 * Security:
 *   â€¢ Director role + matching clubId required
 *   â€¢ Batch size limited to 200 players per call
 *   â€¢ Email is normalised and validated server-side
 *   â€¢ PDF parsing uses Gemini 2.0 Flash for unstructured text extraction
 *     (handles legacy league rosters with non-uniform column layouts)
 *
 * Exports:
 *   ingestRoster â€” onCall
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');
const {GoogleGenAI} = require('@google/genai');
const {defineSecret} = require('firebase-functions/params');
const crypto = require('crypto');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';
const db = admin.firestore();

const MAX_PLAYERS_PER_BATCH = 200;

// â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

/** Generate a unique 6-character alphanumeric invite code. */
function generateCode() {
  return crypto.randomBytes(4).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
}

/**
 * Validate an email address with a regex (RFC-5322 simplified).
 * @param {string} email
 * @return {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// â”€â”€ CSV Parser (zero-dependency) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Lightweight CSV parser supporting quoted fields, embedded commas, and CRLF.
 * Returns an array of objects keyed by the header row.
 * @param {string} text
 * @return {Record<string, string>[]}
 */
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  /**
   * Splits a single CSV line respecting double-quoted fields.
   * @param {string} line
   * @return {string[]}
   */
  function splitLine(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'; i++; // escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur.trim()); cur = '';
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
    if (vals.every((v) => !v.trim())) continue; // skip blank rows
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// â”€â”€ Column aliasing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Map a raw CSV/JSON row to the Vanguard player schema.
 * Handles common column name variants from league exports.
 * @param {Record<string, string>} row
 * @return {{ email?: string, displayName?: string, position?: string, dateOfBirth?: string, jerseyNumber?: string } | null}
 */
function mapRowToSchema(row) {
  // Case-insensitive column resolution
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] ?? row[k.toLowerCase()] ?? row[k.replace(/\s+/g, '_').toLowerCase()];
      if (val && String(val).trim()) return String(val).trim();
    }
    return '';
  };

  const email = normEmail(get('email', 'email_address', 'player_email', 'e_mail'));
  const displayName = get('name', 'full_name', 'player_name', 'first_last', 'display_name') ||
    `${get('first_name', 'first')} ${get('last_name', 'last')}`.trim();
  const position = get('position', 'pos', 'player_position', 'field_position');
  const dateOfBirth = get('dob', 'date_of_birth', 'birth_date', 'birthday');
  const jerseyNumber = get('number', 'jersey', 'jersey_number', 'shirt_number', 'no_');

  if (!email || !isValidEmail(email)) return null; // Email is required

  return {email, displayName: displayName || undefined, position: position || undefined, dateOfBirth: dateOfBirth || undefined, jerseyNumber: jerseyNumber || undefined};
}

// â”€â”€ PDF extraction via Gemini â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Use Gemini 2.0 Flash to extract a structured player list from raw PDF text.
 * This handles non-uniform legacy roster formats that CSV parsers can't read.
 * @param {string} rawText
 * @param {string} apiKey
 * @return {Promise<Array<{email?: string, displayName?: string, position?: string, dateOfBirth?: string, jerseyNumber?: string}>>}
 */
async function extractPlayersFromPdfText(rawText, apiKey) {
  const ai = new GoogleGenAI({apiKey});

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          {
            text: [
              'You are a data extraction assistant for a soccer club management system.',
              'Extract ALL player entries from the following roster document text.',
              'For each player, extract: email, full name, position, date of birth (ISO 8601), jersey number.',
              'If a field is not present in the document, omit it from that player\'s object.',
              'Return ONLY a valid JSON array. No explanations, no markdown fences.',
              'Example: [{"email":"j.smith@email.com","displayName":"John Smith","position":"Midfielder","dateOfBirth":"2008-03-15","jerseyNumber":"7"}]',
              '',
              '--- ROSTER DOCUMENT TEXT ---',
              rawText.slice(0, 12000), // Limit to Gemini context window
            ].join('\n'),
          },
        ],
      },
    ],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const clean = text.replace(/```(?:json)?\n?|```/g, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    logger.warn('[ingestRoster] Gemini PDF extraction: JSON parse failed', {snippet: text.slice(0, 200)});
    return [];
  }
}

// â”€â”€ Main handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Ingest a roster from a Base64-encoded file payload.
 *
 * Input:
 *   {
 *     format:   'csv' | 'json' | 'pdf'
 *     content:  string   â€” UTF-8 text (CSV/JSON) or Base64 (PDF)
 *     teamId?:  string   â€” assign players to a team on creation
 *   }
 *
 * Returns:
 *   { processed: number, skipped: number, invites: Array<{ email, code, name }> }
 */
exports.ingestRoster = onCall(
    {region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role || '';
      const tenantId = request.auth.token.clubId || request.auth.token.tenantId || '';
      const callerUid = request.auth.uid;

      if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Director role required for roster ingestion.');
      }
      if (!tenantId && role === 'director') {
        throw new HttpsError('failed-precondition', 'No tenantId on your account.');
      }

      const {format, content, teamId = null} = request.data ?? {};
      if (!format || !['csv', 'json', 'pdf'].includes(format)) {
        throw new HttpsError('invalid-argument', 'format must be "csv", "json", or "pdf".');
      }
      if (!content || typeof content !== 'string') {
        throw new HttpsError('invalid-argument', 'content is required.');
      }

      // â”€â”€ Parse the input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      let rawPlayers = [];

      if (format === 'csv') {
        const rows = parseCsv(content);
        rawPlayers = rows.map(mapRowToSchema).filter(Boolean);
      } else if (format === 'json') {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new HttpsError('invalid-argument', 'Invalid JSON content.');
        }
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        rawPlayers = arr.map((r) => mapRowToSchema(r)).filter(Boolean);
      } else if (format === 'pdf') {
        // Decode Base64 PDF, extract text, use Gemini to parse structure
        let pdfBuf;
        try {
          pdfBuf = Buffer.from(content, 'base64');
        } catch {
          throw new HttpsError('invalid-argument', 'PDF content must be Base64-encoded.');
        }
        let pdfText = '';
        try {
          const pdfData = await pdfParse(pdfBuf);
          pdfText = pdfData.text;
        } catch (err) {
          throw new HttpsError('internal', `PDF parse failed: ${err.message}`);
        }
        if (!GEMINI_API_KEY.value()) {
          throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret is not configured. PDF ingestion requires the Gemini API.');
        }
        rawPlayers = await extractPlayersFromPdfText(pdfText, GEMINI_API_KEY.value());
        // Validate emails from Gemini output
        rawPlayers = rawPlayers
            .filter((p) => p.email && isValidEmail(normEmail(p.email)))
            .map((p) => ({...p, email: normEmail(p.email)}));
      }

      if (!rawPlayers.length) {
        throw new HttpsError('invalid-argument', 'No valid player records found in the uploaded file. Ensure emails are present.');
      }
      if (rawPlayers.length > MAX_PLAYERS_PER_BATCH) {
        throw new HttpsError('invalid-argument', `Too many players: ${rawPlayers.length} exceeds the ${MAX_PLAYERS_PER_BATCH} per-batch limit.`);
      }

      logger.info('[ingestRoster] parsed', {count: rawPlayers.length, format, tenantId});

      // â”€â”€ Batch write to Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const batchResult = {processed: 0, skipped: 0, invites: []};
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Firestore batch allows max 500 ops; we have 2 ops per player (user + invite)
      // so 200-player limit is safe.
      const batch = db.batch();

      for (const player of rawPlayers) {
        const email = normEmail(player.email);
        if (!email || !isValidEmail(email)) { batchResult.skipped++; continue; }

        const userRef = db.doc(`users/${email}`);
        const existingSnap = await userRef.get();

        const userData = {
          email,
          displayName: player.displayName || email.split('@')[0],
          position: player.position || null,
          dateOfBirth: player.dateOfBirth || null,
          jerseyNumber: player.jerseyNumber || null,
          role: 'player',
          clubId: tenantId,
          tenantId,
          teamId: teamId || null,
          ingestedByUid: callerUid,
          ingestedAt: now,
          status: 'invited',
        };

        if (existingSnap.exists()) {
          // Patch â€” do not overwrite role, xp, or stats if they exist
          const existing = existingSnap.data();
          batch.update(userRef, {
            ...userData,
            role: existing.role || 'player',
            updatedAt: now,
          });
        } else {
          batch.set(userRef, {...userData, createdAt: now, xp: 0, tier: 'ROOKIE'});
        }

        // Generate invite code
        const code = generateCode();
        const inviteRef = db.doc(`invites/${code}`);
        batch.set(inviteRef, {
          code,
          tenantId,
          clubId: tenantId,
          teamId: teamId || null,
          role: 'player',
          usageLimit: 1,
          usageCount: 0,
          consumedByUids: [],
          targetEmail: email,
          createdByUid: callerUid,
          createdAt: now,
          expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        batchResult.invites.push({email, code, name: player.displayName || email});
        batchResult.processed++;
      }

      await batch.commit();

      // Audit log
      await db.collection('audit_logs').add({
        action: 'ROSTER_INGESTED',
        actorUid: callerUid,
        tenantId,
        format,
        processed: batchResult.processed,
        skipped: batchResult.skipped,
        teamId: teamId || null,
        timestamp: now,
      });

      logger.info('[ingestRoster] batch committed', {processed: batchResult.processed, skipped: batchResult.skipped});
      return batchResult;
    },
);
