'use strict';

/**
 * functions/src/utils/formatters.js
 * ──────────────────────────────────
 * Pure utility functions: normalisers, date helpers, crypto helpers,
 * leaderboard / display helpers.  No Firestore writes; no HttpsError throws.
 *
 * Extracted verbatim from index.js — functions/src/** domain modules
 * and future domain slices should import from here.
 *
 * External dependencies:
 *   crypto         — Node built-in (HMAC, hashing, random)
 *   firebase-admin — Timestamp instanceof check in lastActivityToUtcYmd
 *                    and computeAgeYears (admin is a singleton; safe to
 *                    require without re-calling initializeApp)
 */

const crypto = require('crypto');
const admin  = require('firebase-admin');

// ── Crypto helpers ────────────────────────────────────────────────────────────

/**
 * @param {string} secret
 * @param {Record<string, unknown>} fields
 * @return {string} hex HMAC-SHA256
 */
function workoutAttestationHmac(secret, fields) {
  const sortedKeys = Object.keys(fields).sort();
  const sorted = {};
  for (const k of sortedKeys) {
    sorted[k] = fields[k];
  }
  const canonical = JSON.stringify(sorted);
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

/**
 * @return {string} e.g. SST-A3F9-K2PL
 */
function generateLicenseKeyString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () =>
    Array.from({length: 4}, () =>
      chars[crypto.randomInt(0, chars.length)],
    ).join('');
  return `SST-${segment()}-${segment()}`;
}

/**
 * Stable opaque id for leaderboard payloads (not raw email / PII).
 * @param {string} emailKey
 * @return {string}
 */
function leaderboardPublicPlayerKey(emailKey) {
  return crypto
      .createHash('sha256')
      .update('sst_lb_v1|' + emailKey)
      .digest('hex')
      .slice(0, 24);
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * @param {string} ymd yyyy-mm-dd (UTC calendar)
 * @param {number} deltaDays
 * @return {string}
 */
function utcYmdAddDays(ymd, deltaDays) {
  const parts = ymd.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * @param {unknown} value Firestore field
 * @return {string|null} yyyy-mm-dd UTC or null
 */
function lastActivityToUtcYmd(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  return null;
}

/**
 * Monday UTC yyyy-mm-dd for the current week.
 * @return {string}
 */
function utcWeekMondayKey() {
  const now = new Date();
  const utc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (dow - 1));
  return utc.toISOString().slice(0, 10);
}

/**
 * Monday UTC yyyy-mm-dd for the week containing `d` (local UTC calendar).
 * @param {Date} d
 * @return {string}
 */
function utcWeekMondayKeyFromDate(d) {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (dow - 1));
  return utc.toISOString().slice(0, 10);
}

/**
 * Parse yyyy-mm-dd → UTC noon (stable ordering).
 * @param {string} ymd
 * @return {Date}
 */
function parseUtcYmd(ymd) {
  const parts = String(ymd).split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date(0);
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
}

// ── String normalisers ────────────────────────────────────────────────────────

/**
 * @param {unknown} e
 * @return {string|null}
 */
function normEmail(e) {
  if (typeof e !== 'string') return null;
  const s = e.trim().toLowerCase();
  return s || null;
}

/**
 * Lowercase a-z0-9 only, for Operative proxy local-part and login lookup.
 * @param {unknown} raw
 * @return {string}
 */
function normOperativeCallsignSlug(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalise a team invite code to canonical XX-XXXX form.
 * @param {unknown} raw
 * @return {string}
 */
function normTeamInviteCode(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const t = raw.trim();
  if (!t) {
    return '';
  }
  return t
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^(.{2})(.{4})$/, '$1-$2');
}

// ── Leaderboard helpers ───────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} u
 * @return {boolean}
 */
function isLeaderboardPlayerRow(u) {
  const r = typeof u.role === 'string' ? u.role : '';
  if (r === 'coach' || r === 'director' || r === 'registrar' ||
      r === 'parent' || r === 'super_admin') {
    return false;
  }
  return true;
}

// ── URL validation ────────────────────────────────────────────────────────────

/**
 * @param {string} url
 * @return {boolean}
 */
function isTrustedFirebaseStorageLogoUrl(url) {
  if (typeof url !== 'string' || url.length < 40 || url.length > 2000) {
    return false;
  }
  if (!url.startsWith('https://')) {
    return false;
  }
  return url.includes('firebasestorage.googleapis.com') ||
      url.includes('firebasestorage.app') ||
      url.includes('storage.googleapis.com');
}

// ── ID generators ─────────────────────────────────────────────────────────────

/**
 * Deterministic id for coach invite dedupe
 * (one pending invite per club+team+email).
 * @param {string} clubId
 * @param {string} teamId
 * @param {string} coachEmail
 * @return {string}
 */
function coachInviteDocId(clubId, teamId, coachEmail) {
  const safe = (s) =>
    String(s || '')
        .replace(/[/\s]/g, '_')
        .replace(/[^a-zA-Z0-9_@-]/g, '')
        .slice(0, 200);
  return `${safe(clubId)}__${safe(teamId)}__${safe(coachEmail)}`;
}

// ── Player profile helpers ────────────────────────────────────────────────────

/**
 * @param {admin.firestore.Timestamp} dob
 * @return {number}
 */
function computeAgeYears(dob) {
  const d = dob.toDate();
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--;
  }
  return age;
}

/**
 * Epic 16: age band label for recruiter filters (no DOB exposed on public doc).
 * @param {number} ageYears
 * @return {string}
 */
function ageGroupLabel(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) return 'Unknown';
  if (ageYears <= 10) return 'U10';
  if (ageYears <= 12) return 'U12';
  if (ageYears <= 14) return 'U14';
  if (ageYears <= 16) return 'U16';
  if (ageYears <= 18) return 'U18';
  return 'U19+';
}

/**
 * @param {string} playerName
 * @param {boolean} isMinor
 * @return {string}
 */
function sanitizePublicDisplayName(playerName, isMinor) {
  const raw = typeof playerName === 'string' ? playerName.trim() : '';
  if (!raw) return 'Athlete';
  if (!isMinor) return raw.slice(0, 80);
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Athlete';
  if (parts.length === 1) return parts[0].slice(0, 40);
  const last = parts[parts.length - 1];
  const initial = last.length > 0 ? last.charAt(0).toUpperCase() : '';
  return `${parts[0]} ${initial}.`.slice(0, 80);
}

/**
 * @param {Record<string, unknown>} physical
 * @param {Record<string, unknown>} technical
 * @return {string[]}
 */
function topAttributesFromMetrics(physical, technical) {
  /** @type {Array<{k: string, v: number}>} */
  const pairs = [];
  const phys = physical && typeof physical === 'object' ? physical : {};
  const tech = technical && typeof technical === 'object' ? technical : {};
  for (const [k, v] of Object.entries(phys)) {
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : null;
    if (n !== null) {
      pairs.push({
        k: k.charAt(0).toUpperCase() + k.slice(1),
        v: n,
      });
    }
  }
  for (const [k, v] of Object.entries(tech)) {
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : null;
    if (n !== null) {
      pairs.push({
        k: k.charAt(0).toUpperCase() + k.slice(1),
        v: n,
      });
    }
  }
  pairs.sort((a, b) => b.v - a.v);
  return pairs.slice(0, 3).map((p) => p.k);
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  workoutAttestationHmac,
  generateLicenseKeyString,
  leaderboardPublicPlayerKey,
  utcYmdAddDays,
  lastActivityToUtcYmd,
  utcWeekMondayKey,
  utcWeekMondayKeyFromDate,
  parseUtcYmd,
  normEmail,
  normOperativeCallsignSlug,
  normTeamInviteCode,
  isLeaderboardPlayerRow,
  isTrustedFirebaseStorageLogoUrl,
  coachInviteDocId,
  computeAgeYears,
  ageGroupLabel,
  sanitizePublicDisplayName,
  topAttributesFromMetrics,
};
