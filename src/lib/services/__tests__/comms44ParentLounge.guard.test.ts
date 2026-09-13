/**
 * comms44ParentLounge.guard.test.ts — Epic 4.4 W1 source-scan guards
 *
 * Verifies (without emulator) that the Parent Lounge channel provisioning
 * wiring is present and structurally correct:
 *
 *   commsChannelOps.js exports provisionParentLoungeChannel (internal fn)
 *   commsChannelOps.js exports coachProvisionParentLounge (callable)
 *   channelId is computed as `parent-lounge-${teamId}`
 *   upsert uses set(..., { merge: true }) + arrayUnion for memberIds
 *   safesportMonitored: true is set on creation
 *   callable lives in us-east1 region
 *   functions/index.js re-exports coachProvisionParentLounge
 */

import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const COMMS_CHANNEL_OPS = join(ROOT, '..', 'functions/src/domains/commsChannelOps.js');
const INDEX_JS          = join(ROOT, '..', 'functions/index.js');

const opsSrc   = readFileSync(COMMS_CHANNEL_OPS, 'utf-8');
const indexSrc = readFileSync(INDEX_JS, 'utf-8');

// ── exports ──────────────────────────────────────────────────────────────────

describe('Epic 4.4 W1 — commsChannelOps.js exports', () => {
	it('exports provisionParentLoungeChannel (internal reusable fn)', () => {
		expect(opsSrc).toMatch(/exports\.provisionParentLoungeChannel\s*=/);
	});

	it('exports coachProvisionParentLounge (onCall callable)', () => {
		expect(opsSrc).toMatch(/exports\.coachProvisionParentLounge\s*=/);
	});
});

// ── channel id ───────────────────────────────────────────────────────────────

describe('Epic 4.4 W1 — channelId computation', () => {
	it('computes channelId as parent-lounge-${teamId}', () => {
		expect(opsSrc).toMatch(/['"`]parent-lounge-[`${'"`]/);
	});

	it('channel stored under clubs/{clubId}/channels/', () => {
		expect(opsSrc).toMatch(/\.collection\(['"]clubs['"]\).*\.collection\(['"]channels['"]\)/s);
	});
});

// ── upsert mechanics ─────────────────────────────────────────────────────────

describe('Epic 4.4 W1 — idempotent upsert shape', () => {
	it('uses merge: true for set() upsert', () => {
		expect(opsSrc).toMatch(/merge\s*:\s*true/);
	});

	it('uses arrayUnion for memberIds (never clobbers members)', () => {
		const afterProvision = opsSrc.split('exports.provisionParentLoungeChannel')[1] ?? '';
		expect(afterProvision).toMatch(/arrayUnion/);
		expect(afterProvision).toMatch(/memberIds/);
	});

	it('uses arrayUnion for ccParentEmails when parents present', () => {
		const afterProvision = opsSrc.split('exports.provisionParentLoungeChannel')[1] ?? '';
		expect(afterProvision).toMatch(/ccParentEmails/);
		expect(afterProvision).toMatch(/arrayUnion/);
	});
});

// ── SafeSport / COPPA fields ──────────────────────────────────────────────────

describe('Epic 4.4 W1 — SafeSport / COPPA channel shape', () => {
	it('sets safesportMonitored: true on creation', () => {
		expect(opsSrc).toMatch(/safesportMonitored\s*:\s*true/);
	});

	it('sets type: group on creation', () => {
		expect(opsSrc).toMatch(/type\s*:\s*['"]group['"]/);
	});

	it('sets teamId and clubId on creation', () => {
		expect(opsSrc).toMatch(/teamId\s*:/);
		expect(opsSrc).toMatch(/clubId\s*:/);
	});

	it('sets ccParentEmails field on creation', () => {
		expect(opsSrc).toMatch(/ccParentEmails/);
	});
});

// ── callable region ───────────────────────────────────────────────────────────

describe('Epic 4.4 W1 — callable region', () => {
	it('callable uses us-east1 region (via REGION constant or inline)', () => {
		// The literal 'us-east1' may appear as a constant defined at module level
		// and referenced inside the onCall call — checking the full source is correct.
		expect(opsSrc).toMatch(/us-east1/);
	});
});

// ── auth guard ───────────────────────────────────────────────────────────────

describe('Epic 4.4 W1 — auth guard in callable', () => {
	it('callable uses assertCoachMessageSender for auth', () => {
		const callableBlock = opsSrc.split('exports.coachProvisionParentLounge')[1] ?? '';
		expect(callableBlock).toMatch(/assertCoachMessageSender/);
	});

	it('coach scope-checks own teamId', () => {
		const callableBlock = opsSrc.split('exports.coachProvisionParentLounge')[1] ?? '';
		expect(callableBlock).toMatch(/actor\.role.*coach|coach.*actor\.role/s);
		expect(callableBlock).toMatch(/actor\.teamId/);
	});

	it('director scope-checks own clubId', () => {
		const callableBlock = opsSrc.split('exports.coachProvisionParentLounge')[1] ?? '';
		expect(callableBlock).toMatch(/actor\.clubId/);
	});
});

// ── index.js re-export ────────────────────────────────────────────────────────

describe('Epic 4.4 W1 — index.js re-exports (deploy:core)', () => {
	it('index.js imports commsChannelOps', () => {
		expect(indexSrc).toMatch(/require\(['"]\.\/src\/domains\/commsChannelOps['"]\)/);
	});

	it('index.js exports coachProvisionParentLounge', () => {
		expect(indexSrc).toMatch(/exports\.coachProvisionParentLounge/);
	});
});
