/* eslint-disable quotes */
/**
 * cellConstants.js
 * ────────────────
 * Server-side mirror of `src/lib/types/cells.ts`.
 *
 * The Cloud Functions codebase is plain CommonJS (no TS build step), so
 * the canonical TypeScript module cannot be imported directly.  Keep the
 * three constants below in sync with `src/lib/types/cells.ts` — any
 * divergence introduces split-brain routing.
 *
 * If a fourth constant is ever added, mirror it here BEFORE shipping any
 * server code that depends on it.
 */

'use strict';

/**
 * The Firebase Multi-Database reserved name for the default Firestore
 * database.  All absent / null / empty cell references in code MUST
 * normalize to this exact string before any routing decision.
 */
const DEFAULT_CELL_ID = '(default)';

/** Primary region for all current cells. */
const PRIMARY_REGION = 'us-east1';

/**
 * Coerce any cell-id-like value to a non-empty cell ID, falling back
 * to (default).  Whitespace-only inputs are treated as empty.
 *
 * @param {*} raw
 * @returns {string}
 */
function resolveCellId(raw) {
  if (typeof raw !== 'string') return DEFAULT_CELL_ID;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_CELL_ID;
}

/**
 * Is this the shared default cell?
 *
 * @param {string} cellId
 * @returns {boolean}
 */
function isDefaultCell(cellId) {
  return resolveCellId(cellId) === DEFAULT_CELL_ID;
}

module.exports = {
  DEFAULT_CELL_ID,
  PRIMARY_REGION,
  resolveCellId,
  isDefaultCell,
};
