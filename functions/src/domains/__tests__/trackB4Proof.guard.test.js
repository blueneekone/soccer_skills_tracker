/**
 * trackB4Proof.guard.test.js — Track B slice B4a (completion-proof foundation)
 * Authority: functions/src/domains/trainingOps.js · submitCompletionProof
 *
 * Source-scan + behavioral-mirror guards for the `submitCompletionProof` callable:
 *   - Callable exists, is exported, uses LAUNCH_CORE_CALLABLE_OPTS (region us-east1).
 *   - Creates `completion_verifications` with status: 'pending' + required fields.
 *   - Resolves householdId, clubId, teamId from users/{email} doc (Admin SDK).
 *   - Does NOT write workout_logs / XP / intent fulfillment (advisory contract).
 *   - proofNote <= 500 char trim is enforced.
 *
 * Run: node --test functions/src/domains/__tests__/trackB4Proof.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const TRAINING_OPS = join(__dirname, '..', 'trainingOps.js');
const SRC = readFileSync(TRAINING_OPS, 'utf-8');

// ── Behavioral mirror helpers ──────────────────────────────────────────────

/**
 * Mirror of the proofNote validation in submitCompletionProof.
 * @param {unknown} raw
 * @returns {{ ok: boolean; value: string | null; error?: string }}
 */
function validateProofNote(raw) {
  if (raw === undefined || raw === null) {
    return {ok: true, value: null};
  }
  if (typeof raw !== 'string') {
    return {ok: false, value: null, error: 'proofNote must be a string.'};
  }
  const trimmed = raw.trim();
  if (trimmed.length > 500) {
    return {ok: false, value: null, error: 'proofNote must be 500 characters or fewer.'};
  }
  return {ok: true, value: trimmed || null};
}

// ── Existence + wiring ─────────────────────────────────────────────────────

describe('B4a — source-scan: submitCompletionProof callable exists and is wired', () => {
  it('exports.submitCompletionProof is defined in trainingOps.js', () => {
    assert.match(SRC, /exports\.submitCompletionProof\s*=/);
  });

  it('submitCompletionProof uses onCall (Cloud Functions callable pattern)', () => {
    assert.match(
        SRC,
        /exports\.submitCompletionProof\s*=\s*onCall\s*\(/,
    );
  });

  it('submitCompletionProof uses LAUNCH_CORE_CALLABLE_OPTS (region us-east1 + 512MiB)', () => {
    assert.match(
        SRC,
        /exports\.submitCompletionProof\s*=\s*onCall\s*\(\s*LAUNCH_CORE_CALLABLE_OPTS/,
    );
  });
});

// ── Collection write ───────────────────────────────────────────────────────

describe('B4a — source-scan: submitCompletionProof creates completion_verifications', () => {
  it('writes to the completion_verifications collection (canonical path)', () => {
    assert.match(
        SRC,
        /\.collection\s*\(\s*'completion_verifications'\s*\)/,
    );
  });

  it('sets status: \'pending\' on the new doc', () => {
    assert.match(SRC, /status:\s*'pending'/);
  });

  it('includes createdAt: admin.firestore.FieldValue.serverTimestamp()', () => {
    assert.match(SRC, /createdAt:\s*admin\.firestore\.FieldValue\.serverTimestamp\(\)/);
  });

  it('includes mediaStoragePath field in completion_verifications write (B4c)', () => {
    // B4c: mediaStoragePath is now a validated variable (null or validated path), no longer always null.
    // Guard: the field is written to completion_verifications in the add() call.
    assert.match(SRC, /mediaStoragePath[,\s]/);
  });

  it('includes mediaApproved: false placeholder (B4c)', () => {
    assert.match(SRC, /mediaApproved:\s*false/);
  });
});

// ── Household + tenant resolution ─────────────────────────────────────────

describe('B4a — source-scan: server-side context resolution', () => {
  it('resolves householdId from users/{email} doc (Admin SDK)', () => {
    assert.match(SRC, /householdId/);
    // The callable reads the users doc and extracts householdId.
    assert.match(
        SRC,
        /userDoc\.householdId[\s\S]{0,200}householdId/,
    );
  });

  it('resolves clubId from user doc (with tenantId fallback)', () => {
    assert.match(
        SRC,
        /userDoc\.clubId[\s\S]{0,100}tenantId/,
    );
  });

  it('resolves teamId from user doc', () => {
    assert.match(
        SRC,
        /userDoc\.teamId[\s\S]{0,100}teamId/,
    );
  });

  it('player email is derived from the Auth token (not client-supplied)', () => {
    // Must NOT rely solely on client-supplied data for playerEmail — it comes
    // from request.auth.token.email (server-side).
    assert.match(SRC, /request\.auth\.token\.email/);
  });
});

// ── Advisory contract ──────────────────────────────────────────────────────

describe('B4a — source-scan: advisory contract (no XP / workout_logs / fulfillment)', () => {
  // Extract just the submitCompletionProof callable body: from its exports declaration
  // up to (but not including) the next exports. declaration.
  const proofCallableBody = (() => {
    const start = SRC.indexOf('exports.submitCompletionProof');
    if (start === -1) return '';
    // Find the next exports. assignment after the start to bound the body.
    const afterStart = SRC.indexOf('\nexports.', start + 1);
    const end = afterStart !== -1 ? afterStart : start + 4000;
    return SRC.slice(start, end);
  })();

  it('submitCompletionProof body is non-empty (callable was found)', () => {
    assert.ok(proofCallableBody.length > 100, `Expected callable body, got: ${proofCallableBody.slice(0, 80)}`);
  });

  it('submitCompletionProof body does NOT mention workout_logs collection', () => {
    assert.doesNotMatch(proofCallableBody, /workout_logs/);
  });

  it('submitCompletionProof body does NOT call gamificationWorkoutXp or grantXp', () => {
    assert.doesNotMatch(proofCallableBody, /gamificationWorkoutXp|grantTrainingXp|grantXp/);
  });

  it('submitCompletionProof body does NOT touch xpByAttribute or totalXp', () => {
    assert.doesNotMatch(proofCallableBody, /xpByAttribute|totalXp/);
  });

  it('submitCompletionProof body does NOT update team_assignments fulfilledByUids', () => {
    assert.doesNotMatch(proofCallableBody, /fulfilledByUids/);
  });
});

// ── proofNote behavioral mirror ────────────────────────────────────────────

describe('B4a — behavioral mirror: proofNote validation (≤ 500, trim)', () => {
  it('accepts undefined proofNote (maps to null)', () => {
    const r = validateProofNote(undefined);
    assert.equal(r.ok, true);
    assert.equal(r.value, null);
  });

  it('accepts null proofNote (maps to null)', () => {
    const r = validateProofNote(null);
    assert.equal(r.ok, true);
    assert.equal(r.value, null);
  });

  it('trims whitespace from proofNote', () => {
    const r = validateProofNote('  Great session!  ');
    assert.equal(r.ok, true);
    assert.equal(r.value, 'Great session!');
  });

  it('whitespace-only proofNote normalises to null', () => {
    const r = validateProofNote('   ');
    assert.equal(r.ok, true);
    assert.equal(r.value, null);
  });

  it('accepts proofNote exactly 500 chars', () => {
    const r = validateProofNote('a'.repeat(500));
    assert.equal(r.ok, true);
    assert.equal(r.value?.length, 500);
  });

  it('rejects proofNote > 500 chars after trimming', () => {
    const r = validateProofNote('b'.repeat(501));
    assert.equal(r.ok, false);
  });

  it('rejects non-string proofNote (number)', () => {
    const r = validateProofNote(42);
    assert.equal(r.ok, false);
  });

  it('returns { verificationId, status: pending } shape from callable', () => {
    assert.match(SRC, /verificationId:\s*ref\.id,\s*status:\s*'pending'/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// B4b — parentReviewCompletionProof callable guards
// ══════════════════════════════════════════════════════════════════════════════

// ── Behavioral mirror helpers ─────────────────────────────────────────────────

/**
 * Mirror of the decision validation in parentReviewCompletionProof.
 * @param {unknown} raw
 * @returns {{ ok: boolean; value?: 'approved' | 'rejected'; error?: string }}
 */
function validateDecision(raw) {
  if (typeof raw !== 'string') {
    return {ok: false, error: 'decision must be a string.'};
  }
  const v = raw.trim();
  if (v !== 'approved' && v !== 'rejected') {
    return {ok: false, error: "decision must be 'approved' or 'rejected'."};
  }
  return {ok: true, value: /** @type {'approved'|'rejected'} */ (v)};
}

// ── B4b source-scan: existence + wiring ──────────────────────────────────────

describe('B4b — source-scan: parentReviewCompletionProof callable exists and is wired', () => {
  it('exports.parentReviewCompletionProof is defined in trainingOps.js', () => {
    assert.match(SRC, /exports\.parentReviewCompletionProof\s*=/);
  });

  it('parentReviewCompletionProof uses onCall (Cloud Functions callable pattern)', () => {
    assert.match(SRC, /exports\.parentReviewCompletionProof\s*=\s*onCall\s*\(/);
  });

  it('parentReviewCompletionProof uses LAUNCH_CORE_CALLABLE_OPTS (region us-east1 + 512MiB)', () => {
    assert.match(
        SRC,
        /exports\.parentReviewCompletionProof\s*=\s*onCall\s*\(\s*LAUNCH_CORE_CALLABLE_OPTS/,
    );
  });
});

// ── B4b source-scan: extract callable body ───────────────────────────────────

const reviewCallableBody = (() => {
  const start = SRC.indexOf('exports.parentReviewCompletionProof');
  if (start === -1) return '';
  const afterStart = SRC.indexOf('\nexports.', start + 1);
  const end = afterStart !== -1 ? afterStart : start + 5000;
  return SRC.slice(start, end);
})();

describe('B4b — source-scan: parentReviewCompletionProof body is non-empty', () => {
  it('callable body is non-empty (was found in source)', () => {
    assert.ok(
        reviewCallableBody.length > 100,
        `Expected B4b callable body, got: ${reviewCallableBody.slice(0, 80)}`,
    );
  });
});

// ── B4b source-scan: parent authentication ────────────────────────────────────

describe('B4b — source-scan: parent authentication gate', () => {
  it('calls assertParent(request) to enforce parent role', () => {
    assert.match(reviewCallableBody, /assertParent\s*\(\s*request\s*\)/);
  });
});

// ── B4b source-scan: input validation ────────────────────────────────────────

describe('B4b — source-scan: input validation', () => {
  it("validates verificationId is a non-empty string", () => {
    assert.match(reviewCallableBody, /verificationId/);
    assert.match(reviewCallableBody, /invalid-argument/);
  });

  it("validates decision against 'approved' | 'rejected' allowlist", () => {
    assert.match(reviewCallableBody, /'approved'/);
    assert.match(reviewCallableBody, /'rejected'/);
  });

  it("rejects decision values outside the allowlist", () => {
    assert.match(
        reviewCallableBody,
        /decision\s*!==\s*'approved'[\s\S]*?decision\s*!==\s*'rejected'|decision\s*!==\s*'rejected'[\s\S]*?decision\s*!==\s*'approved'/,
    );
  });
});

// ── B4b source-scan: household membership check ──────────────────────────────

describe('B4b — source-scan: household membership verification', () => {
  it('reads households collection to verify child membership', () => {
    assert.match(reviewCallableBody, /\.collection\s*\(\s*'households'\s*\)/);
  });

  it('checks playerEmails array contains the record userKey', () => {
    assert.match(reviewCallableBody, /playerEmails/);
    assert.match(reviewCallableBody, /playerSet\.has\(recordUserKey\)|playerSet\.has/);
  });

  it('throws permission-denied on cross-household access', () => {
    assert.match(reviewCallableBody, /permission-denied/);
  });
});

// ── B4b source-scan: pending-only guard ──────────────────────────────────────

describe('B4b — source-scan: only pending records can be reviewed', () => {
  it('reads the completion_verifications doc before updating', () => {
    assert.match(
        reviewCallableBody,
        /\.collection\s*\(\s*'completion_verifications'\s*\)[\s\S]*?\.doc\s*\(\s*verificationId\s*\)/,
    );
  });

  it('throws failed-precondition when status is not pending', () => {
    assert.match(reviewCallableBody, /failed-precondition/);
    assert.match(reviewCallableBody, /cv\.status\s*!==\s*'pending'|status.*!==.*pending/);
  });
});

// ── B4b source-scan: update fields ───────────────────────────────────────────

describe('B4b — source-scan: review update sets correct fields', () => {
  it('updates status to the decision value', () => {
    assert.match(reviewCallableBody, /status:\s*decision/);
  });

  it('records reviewedByUid from request.auth.uid', () => {
    assert.match(reviewCallableBody, /reviewedByUid:\s*request\.auth\.uid/);
  });

  it('records reviewedByEmail from parent actor email', () => {
    assert.match(reviewCallableBody, /reviewedByEmail/);
  });

  it('records reviewedAt as serverTimestamp', () => {
    assert.match(reviewCallableBody, /reviewedAt:\s*admin\.firestore\.FieldValue\.serverTimestamp\(\)/);
  });

  it('returns { verificationId, status: decision } shape', () => {
    assert.match(reviewCallableBody, /return\s*\{\s*verificationId,\s*status:\s*decision\s*\}/);
  });
});

// ── B4b source-scan: advisory contract ───────────────────────────────────────

describe('B4b — advisory contract: parentReviewCompletionProof must NOT touch XP or logs', () => {
  it('does NOT mention workout_logs collection', () => {
    assert.doesNotMatch(reviewCallableBody, /workout_logs/);
  });

  it('does NOT call grantTrainingXp or gamificationWorkoutXp', () => {
    assert.doesNotMatch(reviewCallableBody, /grantTrainingXp|gamificationWorkoutXp|grantXp/);
  });

  it('does NOT touch xpByAttribute or totalXp', () => {
    assert.doesNotMatch(reviewCallableBody, /xpByAttribute|totalXp/);
  });

  it('does NOT update team_assignments fulfilledByUids', () => {
    assert.doesNotMatch(reviewCallableBody, /fulfilledByUids/);
  });
});

// ── B4b behavioral mirror: decision validation ────────────────────────────────

describe('B4b — behavioral mirror: decision validation', () => {
  it("accepts 'approved'", () => {
    const r = validateDecision('approved');
    assert.equal(r.ok, true);
    assert.equal(r.value, 'approved');
  });

  it("accepts 'rejected'", () => {
    const r = validateDecision('rejected');
    assert.equal(r.ok, true);
    assert.equal(r.value, 'rejected');
  });

  it("rejects 'pending' (not an allowed decision)", () => {
    const r = validateDecision('pending');
    assert.equal(r.ok, false);
  });

  it("rejects empty string", () => {
    const r = validateDecision('');
    assert.equal(r.ok, false);
  });

  it("rejects non-string (number)", () => {
    const r = validateDecision(42);
    assert.equal(r.ok, false);
  });

  it("rejects undefined", () => {
    const r = validateDecision(undefined);
    assert.equal(r.ok, false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// B4c — mediaStoragePath validation guards
// ══════════════════════════════════════════════════════════════════════════════

// ── Behavioral mirror helpers ─────────────────────────────────────────────────

/**
 * Mirror of the mediaStoragePath validation added in B4c.
 * @param {{ raw: unknown; householdId: string; playerUid: string }} opts
 * @returns {{ ok: boolean; value?: string | null; error?: string; code?: string }}
 */
function validateMediaStoragePath({raw, householdId, playerUid}) {
  if (raw === undefined || raw === null) {
    return {ok: true, value: null};
  }
  if (typeof raw !== 'string') {
    return {ok: false, error: 'mediaStoragePath must be a string.', code: 'invalid-argument'};
  }
  if (raw.length > 512) {
    return {
      ok: false,
      error: 'mediaStoragePath must be 512 characters or fewer.',
      code: 'invalid-argument',
    };
  }
  const expectedPrefix = `households/${householdId}/proof_media/${playerUid}/`;
  if (!raw.startsWith(expectedPrefix)) {
    return {
      ok: false,
      error: 'mediaStoragePath must be within your own household proof_media folder.',
      code: 'permission-denied',
    };
  }
  return {ok: true, value: raw};
}

// ── B4c source-scan: submitCompletionProof handles mediaStoragePath ───────────

describe('B4c — source-scan: submitCompletionProof mediaStoragePath validation', () => {
  // Extract submitCompletionProof body.
  const submitBody = (() => {
    const start = SRC.indexOf('exports.submitCompletionProof');
    if (start === -1) return '';
    const afterStart = SRC.indexOf('\nexports.', start + 1);
    const end = afterStart !== -1 ? afterStart : start + 6000;
    return SRC.slice(start, end);
  })();

  it('submitCompletionProof body references rawMediaStoragePath or mediaStoragePath', () => {
    assert.ok(
        submitBody.includes('rawMediaStoragePath') || submitBody.includes('mediaStoragePath'),
        'Expected mediaStoragePath handling in submitCompletionProof',
    );
  });

  it('submitCompletionProof validates path starts with households/{householdId}/proof_media/{playerUid}/', () => {
    assert.match(
        submitBody,
        /households\/\$\{householdId\}\/proof_media\/\$\{playerUid\}\//,
    );
  });

  it('submitCompletionProof throws permission-denied for cross-household/cross-user path', () => {
    assert.match(submitBody, /permission-denied/);
    assert.match(
        submitBody,
        /mediaStoragePath must be within your own household proof_media folder\./,
    );
  });

  it('submitCompletionProof enforces length <= 512', () => {
    assert.match(submitBody, /512/);
    assert.match(
        submitBody,
        /mediaStoragePath must be 512 characters or fewer\./,
    );
  });

  it('submitCompletionProof persists mediaStoragePath (not hardcoded null)', () => {
    // After B4c, the add() call uses the validated mediaStoragePath variable, not always null.
    assert.match(submitBody, /mediaStoragePath,|mediaStoragePath:\s*mediaStoragePath/);
  });

  it('submitCompletionProof still keeps mediaApproved: false at submit time', () => {
    assert.match(submitBody, /mediaApproved:\s*false/);
  });
});

// ── B4c behavioral mirror: mediaStoragePath validation ───────────────────────

describe('B4c — behavioral mirror: mediaStoragePath validation', () => {
  const HID = 'household-abc';
  const UID = 'player-uid-123';
  const VALID_PREFIX = `households/${HID}/proof_media/${UID}/`;

  it('accepts undefined mediaStoragePath (maps to null)', () => {
    const r = validateMediaStoragePath({raw: undefined, householdId: HID, playerUid: UID});
    assert.equal(r.ok, true);
    assert.equal(r.value, null);
  });

  it('accepts null mediaStoragePath (maps to null)', () => {
    const r = validateMediaStoragePath({raw: null, householdId: HID, playerUid: UID});
    assert.equal(r.ok, true);
    assert.equal(r.value, null);
  });

  it('accepts valid path with correct prefix', () => {
    const path = `${VALID_PREFIX}abc-uuid.jpg`;
    const r = validateMediaStoragePath({raw: path, householdId: HID, playerUid: UID});
    assert.equal(r.ok, true);
    assert.equal(r.value, path);
  });

  it('rejects path with wrong householdId (cross-household)', () => {
    const path = `households/OTHER-household/proof_media/${UID}/file.jpg`;
    const r = validateMediaStoragePath({raw: path, householdId: HID, playerUid: UID});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'permission-denied');
  });

  it('rejects path with wrong playerUid (cross-user)', () => {
    const path = `${VALID_PREFIX.replace(UID, 'other-uid')}file.jpg`;
    const r = validateMediaStoragePath({raw: path, householdId: HID, playerUid: UID});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'permission-denied');
  });

  it('rejects path that exceeds 512 characters', () => {
    const path = `${VALID_PREFIX}${'a'.repeat(520)}`;
    const r = validateMediaStoragePath({raw: path, householdId: HID, playerUid: UID});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'invalid-argument');
  });

  it('accepts path exactly at 512 characters (boundary)', () => {
    // Make path exactly 512 chars with a valid prefix.
    const remaining = 512 - VALID_PREFIX.length;
    const path = `${VALID_PREFIX}${'f'.repeat(remaining)}`;
    assert.equal(path.length, 512);
    const r = validateMediaStoragePath({raw: path, householdId: HID, playerUid: UID});
    assert.equal(r.ok, true);
  });

  it('rejects non-string mediaStoragePath (number)', () => {
    const r = validateMediaStoragePath({raw: 42, householdId: HID, playerUid: UID});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'invalid-argument');
  });

  it('rejects empty path (would not start with expected prefix)', () => {
    const r = validateMediaStoragePath({raw: '', householdId: HID, playerUid: UID});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'permission-denied');
  });

  it('rejects path that starts with prefix but is missing trailing slash child', () => {
    // Path that matches only up to playerUid without the trailing slash separator.
    const path = `households/${HID}/proof_media/${UID}`;
    const r = validateMediaStoragePath({raw: path, householdId: HID, playerUid: UID});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'permission-denied');
  });
});

// ── B4c source-scan: parentReviewCompletionProof sets mediaApproved ───────────

describe('B4c — source-scan: parentReviewCompletionProof sets mediaApproved on approve', () => {
  it('review callable body sets mediaApproved based on decision', () => {
    // mediaApproved: decision === 'approved' (or equivalent conditional).
    assert.match(
        reviewCallableBody,
        /mediaApproved:\s*decision\s*===\s*'approved'|mediaApproved.*decision.*approved/,
    );
  });

  it('review callable body still does NOT mention workout_logs', () => {
    assert.doesNotMatch(reviewCallableBody, /workout_logs/);
  });

  it('review callable body still does NOT call grantXp or gamificationWorkoutXp', () => {
    assert.doesNotMatch(
        reviewCallableBody,
        /grantTrainingXp|gamificationWorkoutXp|grantXp/,
    );
  });
});
