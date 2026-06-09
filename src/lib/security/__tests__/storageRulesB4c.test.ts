/**
 * storageRulesB4c.test.ts — B4c COPPA-safe optional media proof
 * Authority: storage.rules · households/{householdId}/proof_media/{playerUid}/{fileName}
 *
 * Source-scan guards (no Storage emulator required):
 *   - proof_media match block exists with correct path pattern.
 *   - write: requires playerUid == auth.uid AND household claim == householdId.
 *   - write: enforces content-type (image/* or video/*).
 *   - write: enforces size caps (image ≤10MB, video ≤50MB).
 *   - read: owning player (uid == playerUid) allowed.
 *   - read: same-household parent (householdId claim match) allowed.
 *   - read: super_admin allowed.
 *   - read: NO coach or director read branch in the proof_media block.
 *   - No public read.
 *
 * Run: npx vitest run src/lib/security/__tests__/storageRulesB4c.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('storage.rules'), 'utf8');

// ── Extract the proof_media match block ──────────────────────────────────────

/**
 * Extract the match block body for proof_media.
 * Scans for the `match` line containing `proof_media/{playerUid}/{fileName}`,
 * then finds the opening `{` of the block body (the first `{` after the path's
 * closing `}` on that line), counts braces to find the matching close, and
 * returns the full slice from the `match` keyword through the closing `}`.
 *
 * This avoids the pitfall of the path wildcards `{householdId}` / `{playerUid}` /
 * `{fileName}` contributing to the brace depth count.
 */
const proofMediaBlock = (() => {
	// Find the line that declares the proof_media match path.
	const matchLineIdx = RULES.indexOf('match /households/{householdId}/proof_media');
	if (matchLineIdx === -1) return '';

	// From the start of this match line, find the end of the path expression.
	// The path ends at the `}` that closes `{fileName}`.
	// We identify it as the `}` followed (only whitespace) by a `{` on the same line.
	// Strategy: scan forward from matchLineIdx to find the newline, then within that
	// line find the last `}` before the block-open `{`.
	const lineEnd = RULES.indexOf('\n', matchLineIdx);
	const matchLine = lineEnd !== -1 ? RULES.slice(matchLineIdx, lineEnd) : RULES.slice(matchLineIdx);

	// Find the position of the block-open `{` on the match line — it's the `{` that
	// comes after at least one space/tab following `{fileName}`.
	// Since the line is: `match /.../{fileName} {`
	// the last `{` on the line is the block-open brace.
	const blockOpenRelative = matchLine.lastIndexOf('{');
	if (blockOpenRelative === -1) return '';
	const blockOpenAbsolute = matchLineIdx + blockOpenRelative;

	// Now count braces starting from blockOpenAbsolute.
	let depth = 0;
	let pos = blockOpenAbsolute;
	while (pos < RULES.length) {
		if (RULES[pos] === '{') depth++;
		else if (RULES[pos] === '}') {
			depth--;
			if (depth === 0) {
				return RULES.slice(matchLineIdx, pos + 1);
			}
		}
		pos++;
	}
	return RULES.slice(matchLineIdx);
})();

// ── Block existence ──────────────────────────────────────────────────────────

describe('B4c storageRules — proof_media block existence', () => {
	it('storage.rules contains the proof_media match path', () => {
		expect(RULES).toContain(
			'households/{householdId}/proof_media/{playerUid}/{fileName}',
		);
	});

	it('proof_media block is non-empty (was found and extracted)', () => {
		expect(proofMediaBlock.length).toBeGreaterThan(50);
	});
});

// ── Write rules ──────────────────────────────────────────────────────────────

describe('B4c storageRules — write: player uid + household claim required', () => {
	it('write requires request.auth.uid == playerUid', () => {
		expect(proofMediaBlock).toMatch(/request\.auth\.uid\s*==\s*playerUid/);
	});

	it('write requires request.auth.token.householdId == householdId', () => {
		expect(proofMediaBlock).toMatch(
			/request\.auth\.token\.householdId\s*==\s*householdId/,
		);
	});

	it('write enforces request.resource != null guard', () => {
		expect(proofMediaBlock).toMatch(/request\.resource\s*!=\s*null/);
	});
});

describe('B4c storageRules — write: content-type enforcement', () => {
	it('write allows image/* content-type', () => {
		expect(proofMediaBlock).toMatch(/contentType\.matches\s*\(\s*['"]image\/\.\*/);
	});

	it('write allows video/* content-type', () => {
		expect(proofMediaBlock).toMatch(/contentType\.matches\s*\(\s*['"]video\/\.\*/);
	});
});

describe('B4c storageRules — write: size caps', () => {
	it('write enforces image size cap (10MB)', () => {
		// 10 * 1024 * 1024 = 10485760
		expect(proofMediaBlock).toMatch(/10\s*\*\s*1024\s*\*\s*1024/);
	});

	it('write enforces video size cap (50MB)', () => {
		// 50 * 1024 * 1024 = 52428800
		expect(proofMediaBlock).toMatch(/50\s*\*\s*1024\s*\*\s*1024/);
	});
});

// ── Read rules ───────────────────────────────────────────────────────────────

describe('B4c storageRules — read: owning player allowed', () => {
	it('read allows owning player (uid == playerUid)', () => {
		expect(proofMediaBlock).toMatch(/request\.auth\.uid\s*==\s*playerUid/);
	});
});

describe('B4c storageRules — read: same-household member allowed', () => {
	it('read allows same-household member via householdId token claim', () => {
		// The read branch must check the household claim — this allows parents in the same household.
		expect(proofMediaBlock).toMatch(
			/request\.auth\.token\.householdId\s*==\s*householdId/,
		);
	});
});

describe('B4c storageRules — read: super_admin allowed', () => {
	it("read allows super_admin role", () => {
		expect(proofMediaBlock).toMatch(/request\.auth\.token\.role\s*==\s*'super_admin'/);
	});
});

// ── COPPA: no coach/director read ────────────────────────────────────────────

describe('B4c storageRules — COPPA: coaches and directors have NO read branch', () => {
	it("proof_media block does NOT contain a 'coach' role read branch", () => {
		// The proof_media block must not grant any read access to role == 'coach'.
		expect(proofMediaBlock).not.toMatch(/role\s*(==|in)\s*['"\[].*coach/);
	});

	it("proof_media block does NOT contain a 'director' role read branch", () => {
		expect(proofMediaBlock).not.toMatch(/role\s*(==|in)\s*['"\[].*director/);
	});

	it('proof_media block does NOT contain a recruiter read branch', () => {
		expect(proofMediaBlock).not.toMatch(/tier\s*==\s*'recruiter'|role.*recruiter/);
	});

	it('proof_media block does NOT contain allow read: if true (no public read)', () => {
		expect(proofMediaBlock).not.toMatch(/allow\s+read\s*:\s*if\s+true/);
	});
});

// ── No public read ────────────────────────────────────────────────────────────

describe('B4c storageRules — no public read on proof_media', () => {
	it('proof_media block does NOT have an unauthenticated read path (request.auth != null required)', () => {
		// The read rule must include a request.auth != null guard.
		const readBlock = (() => {
			const idx = proofMediaBlock.indexOf('allow read');
			if (idx === -1) return '';
			const end = proofMediaBlock.indexOf(';', idx);
			return end !== -1 ? proofMediaBlock.slice(idx, end + 1) : proofMediaBlock.slice(idx);
		})();
		expect(readBlock).toMatch(/request\.auth\s*!=\s*null/);
	});
});

// ── Regression: completion_verifications Firestore rule unchanged ─────────────

describe('B4c regression — completion_verifications Firestore writes stay CF-only', () => {
	const FIRESTORE_RULES = readFileSync(resolve('firestore.rules'), 'utf8');

	it('completion_verifications match block exists in firestore.rules', () => {
		expect(FIRESTORE_RULES).toContain('completion_verifications');
	});

	it('completion_verifications create/update/delete: if false (CF-only writes unchanged)', () => {
		// The allow create, update, delete block for completion_verifications must still be false.
		expect(FIRESTORE_RULES).toMatch(
			/completion_verifications[\s\S]{0,600}allow create, update, delete: if false/,
		);
	});
});
