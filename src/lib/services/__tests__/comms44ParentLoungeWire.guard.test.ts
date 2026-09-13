/**
 * comms44ParentLoungeWire.guard.test.ts — Epic 4.4 W2 source-scan guards
 *
 * Verifies (without emulator) that the W2 parent lounge auto-wire is present
 * and structurally correct:
 *
 *   commsChannelOps.js exports provisionLoungesForParentHousehold
 *   operativeOps.js requires commsChannelOps and references the helper
 *   parentSignCoppaWaiver calls the helper in BOTH branches (creation + existing)
 *   parentProvisionOperative calls the helper when a team is linked
 *   All lounge provisioning is try/catch-guarded (cannot break COPPA waiver path)
 *   Per-child team resolution reads users/{childEmail} + player_lookup fallback
 *   Parent clubId merge-write is present in the helper
 */

import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const COMMS_CHANNEL_OPS = join(ROOT, '..', 'functions/src/domains/commsChannelOps.js');
const OPERATIVE_OPS     = join(ROOT, '..', 'functions/src/domains/operativeOps.js');

const commsSrc     = readFileSync(COMMS_CHANNEL_OPS, 'utf-8');
const operativeSrc = readFileSync(OPERATIVE_OPS, 'utf-8');

// ── commsChannelOps.js: W2 export ────────────────────────────────────────────

describe('Epic 4.4 W2 — commsChannelOps.js exports provisionLoungesForParentHousehold', () => {
	it('exports the helper function', () => {
		expect(commsSrc).toMatch(/exports\.provisionLoungesForParentHousehold\s*=/);
	});

	it('helper references provisionParentLoungeChannel (W1 call)', () => {
		const afterExport =
			commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(afterExport).toMatch(/provisionParentLoungeChannel/);
	});
});

// ── Per-child resolution ──────────────────────────────────────────────────────

describe('Epic 4.4 W2 — per-child team resolution in commsChannelOps.js', () => {
	it('reads users/{childEmail} for clubId/teamId', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(after).toMatch(/collection\(['"]users['"]\).*\.doc\(childEmail\)/s);
	});

	it('falls back to player_lookup/{childEmail} when users doc is incomplete', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(after).toMatch(/player_lookup/);
	});

	it('resolves coach emails from teams/{teamId}', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(after).toMatch(/collection\(['"]teams['"]\)/);
		expect(after).toMatch(/coachEmail/);
	});

	it('handles both coachEmail (string) and coachEmails (array) field shapes', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(after).toMatch(/coachEmails/);
		expect(after).toMatch(/coachEmail/);
		expect(after).toMatch(/Array\.isArray/);
	});

	it('skips children with no resolvable club or team', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(after).toMatch(/!childClubId\s*\|\|\s*!childTeamId/);
	});
});

// ── Parent clubId merge-write ─────────────────────────────────────────────────

describe('Epic 4.4 W2 — parent clubId set for Firestore channel-read rule', () => {
	it('writes clubId onto users/{parentEmail} via merge', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		expect(after).toMatch(/\.doc\(normParent\)/);
		expect(after).toMatch(/clubId.*firstResolvedClubId|firstResolvedClubId.*clubId/s);
		expect(after).toMatch(/merge\s*:\s*true/);
	});

	it('clubId merge-write is try/catch-guarded (non-fatal)', () => {
		const after = commsSrc.split('exports.provisionLoungesForParentHousehold')[1] ?? '';
		// Both per-child errors and the clubId write must be guarded.
		const tryCatchCount = (after.match(/}\s*catch\s*\(/g) ?? []).length;
		expect(tryCatchCount).toBeGreaterThanOrEqual(2);
	});
});

// ── operativeOps.js: require ──────────────────────────────────────────────────

describe('Epic 4.4 W2 — operativeOps.js requires commsChannelOps', () => {
	it('imports provisionLoungesForParentHousehold from commsChannelOps', () => {
		expect(operativeSrc).toMatch(/require\(['"]\.\/commsChannelOps['"]\)/);
		expect(operativeSrc).toMatch(/provisionLoungesForParentHousehold/);
	});
});

// ── parentSignCoppaWaiver: both branches wired ────────────────────────────────

describe('Epic 4.4 W2 — parentSignCoppaWaiver calls lounge provisioning (both branches)', () => {
	it('references provisionLoungesForParentHousehold in parentSignCoppaWaiver body', () => {
		const fnBlock = operativeSrc.match(
			/exports\.parentSignCoppaWaiver\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		expect(fnBlock).toMatch(/provisionLoungesForParentHousehold/);
	});

	it('provision call appears at least twice (creation branch + existing-household branch)', () => {
		const fnBlock = operativeSrc.match(
			/exports\.parentSignCoppaWaiver\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		const matches = fnBlock.match(/provisionLoungesForParentHousehold/g) ?? [];
		expect(matches.length).toBeGreaterThanOrEqual(2);
	});

	it('lounge provision in creation branch is try/catch-guarded', () => {
		// The creation branch ends with "createdHousehold: true" — confirm a
		// try/catch wraps provisionLoungesForParentHousehold before that return.
		const creationBlock =
			operativeSrc.split('createdHousehold: true')[0] ?? '';
		expect(creationBlock).toMatch(/try\s*\{[\s\S]*?provisionLoungesForParentHousehold/);
		expect(creationBlock).toMatch(/catch\s*\(\s*\w+\s*\)/);
	});

	it('lounge provision in existing-household branch is try/catch-guarded', () => {
		const existingBlock =
			operativeSrc.split('createdHousehold: false')[0].split('createdHousehold: true')[1] ?? '';
		expect(existingBlock).toMatch(/try\s*\{[\s\S]*?provisionLoungesForParentHousehold/);
		expect(existingBlock).toMatch(/catch\s*\(\s*\w+\s*\)/);
	});

	it('passes parentEmail, childEmails, and parentClubId to helper', () => {
		const fnBlock = operativeSrc.match(
			/exports\.parentSignCoppaWaiver\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		expect(fnBlock).toMatch(/parentEmail\s*:/);
		expect(fnBlock).toMatch(/childEmails\s*:/);
		expect(fnBlock).toMatch(/parentClubId\s*:/);
	});
});

// ── parentProvisionOperative: team-linked child wired ─────────────────────────

describe('Epic 4.4 W2 — parentProvisionOperative provisions lounge when team is linked', () => {
	it('references provisionLoungesForParentHousehold in parentProvisionOperative body', () => {
		const fnBlock = operativeSrc.match(
			/exports\.parentProvisionOperative\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		expect(fnBlock).toMatch(/provisionLoungesForParentHousehold/);
	});

	it('lounge provision is gated on teamIdForUser (only when team is linked)', () => {
		const fnBlock = operativeSrc.match(
			/exports\.parentProvisionOperative\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		// The W2 block must be inside an if(teamIdForUser) guard.
		const teamGateBlock = fnBlock.match(
			/if\s*\(\s*teamIdForUser\s*\)[\s\S]*?provisionLoungesForParentHousehold/,
		);
		expect(teamGateBlock).not.toBeNull();
	});

	it('parentProvisionOperative lounge call is try/catch-guarded', () => {
		const fnBlock = operativeSrc.match(
			/exports\.parentProvisionOperative\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		const afterBatchCommit =
			fnBlock.split('await batch.commit()')[1] ?? '';
		expect(afterBatchCommit).toMatch(/try\s*\{[\s\S]*?provisionLoungesForParentHousehold/);
		expect(afterBatchCommit).toMatch(/catch\s*\(\s*\w+\s*\)/);
	});
});

// ── COPPA safety: waiver completion not blocked by lounge errors ──────────────

describe('Epic 4.4 W2 — COPPA safety: lounge errors do not block waiver', () => {
	it('all provisionLoungesForParentHousehold calls in operativeOps are inside try/catch', () => {
		// Count occurrences and confirm each is inside a try block.
		const provisionMatches = [
			...operativeSrc.matchAll(/provisionLoungesForParentHousehold/g),
		];
		// The require() line is not inside a try; all actual await calls must be.
		const awaitCalls = [
			...operativeSrc.matchAll(/await\s+provisionLoungesForParentHousehold/g),
		];
		expect(awaitCalls.length).toBeGreaterThanOrEqual(3);

		for (const match of awaitCalls) {
			const before = operativeSrc.slice(0, match.index ?? 0);
			const lastTry = before.lastIndexOf('try {');
			const lastCatch = before.lastIndexOf('} catch');
			// The nearest try must appear after the nearest catch (i.e., still open).
			expect(lastTry).toBeGreaterThan(lastCatch);
		}
	});

	it('warn log emitted on lounge error (non-fatal marker in log message)', () => {
		expect(operativeSrc).toMatch(/lounge provision failed \(non-fatal\)/);
	});
});
