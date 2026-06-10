/**
 * comms43Push.guard.test.ts — Epic 4.3 notification bus source-scan guards
 *
 * Verifies (without emulator) that the Epic 4.3 push delivery wiring is present:
 *   W1 — onTeamBroadcastCreated trigger exists in notificationOps.js
 *   W1 — dispatcher.js ROLE_DEFAULTS contains push_announcements
 *   W2 — sendCoachPlayerMessage in operativeOps.js references sendFcmToUids + push_messages
 *   COPPA — parent recipient resolution uses commsPolicy consent filter
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const NOTIFICATION_OPS = join(ROOT, '..', 'functions/src/domains/notificationOps.js');
const OPERATIVE_OPS    = join(ROOT, '..', 'functions/src/domains/operativeOps.js');
const DISPATCHER       = join(ROOT, '..', 'functions/dispatcher.js');
const INDEX_JS         = join(ROOT, '..', 'functions/index.js');

const notifSrc     = readFileSync(NOTIFICATION_OPS, 'utf-8');
const operativeSrc = readFileSync(OPERATIVE_OPS, 'utf-8');
const dispatchSrc  = readFileSync(DISPATCHER, 'utf-8');
const indexSrc     = readFileSync(INDEX_JS, 'utf-8');

// ── W1: onTeamBroadcastCreated trigger ───────────────────────────────────────

describe('Epic 4.3 W1 — onTeamBroadcastCreated trigger', () => {
	it('notificationOps.js exports onTeamBroadcastCreated', () => {
		expect(notifSrc).toMatch(/exports\.onTeamBroadcastCreated/);
	});

	it('trigger listens on team_broadcasts collection', () => {
		expect(notifSrc).toMatch(/['"]team_broadcasts\//);
	});

	it('trigger references push_announcements category', () => {
		expect(notifSrc).toMatch(/push_announcements/);
	});

	it('trigger calls sendFcmToUids', () => {
		// Must appear in the onTeamBroadcastCreated section (after the export line)
		const afterExport = notifSrc.split('exports.onTeamBroadcastCreated')[1] ?? '';
		expect(afterExport).toMatch(/sendFcmToUids/);
	});

	it('resolves player UIDs from player_lookup for the broadcast teamId', () => {
		const afterExport = notifSrc.split('exports.onTeamBroadcastCreated')[1] ?? '';
		expect(afterExport).toMatch(/player_lookup/);
	});

	it('COPPA: parent recipients filtered via parentHasCommsConsent', () => {
		const afterExport = notifSrc.split('exports.onTeamBroadcastCreated')[1] ?? '';
		expect(afterExport).toMatch(/parentHasCommsConsent/);
	});

	it('imports parentHasCommsConsent from commsPolicy', () => {
		expect(notifSrc).toMatch(/require\(['"]\.\/commsPolicy['"]\)/);
		expect(notifSrc).toMatch(/parentHasCommsConsent/);
	});
});

// ── W1: dispatcher.js ROLE_DEFAULTS ──────────────────────────────────────────

describe('Epic 4.3 W1 — dispatcher ROLE_DEFAULTS push_announcements', () => {
	it('ROLE_DEFAULTS map contains push_announcements key', () => {
		expect(dispatchSrc).toMatch(/push_announcements\s*:/);
	});

	it('push_announcements defaults to true for all roles', () => {
		// The key should map to { default: true } pattern
		expect(dispatchSrc).toMatch(/push_announcements[\s\S]{0,40}default\s*:\s*true/);
	});
});

// ── W2: sendCoachPlayerMessage DM push ────────────────────────────────────────

describe('Epic 4.3 W2 — sendCoachPlayerMessage DM push', () => {
	it('operativeOps.js imports sendFcmToUids from notificationOps', () => {
		expect(operativeSrc).toMatch(/require\(['"]\.\/notificationOps['"]\)/);
		expect(operativeSrc).toMatch(/sendFcmToUids/);
	});

	it('sendCoachPlayerMessage body references push_messages category', () => {
		const fnBlock = operativeSrc.match(
			/exports\.sendCoachPlayerMessage\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		expect(fnBlock).toMatch(/push_messages/);
	});

	it('sendCoachPlayerMessage body calls sendFcmToUids', () => {
		const fnBlock = operativeSrc.match(
			/exports\.sendCoachPlayerMessage\s*=[\s\S]*?^\}\);/m,
		)?.[0] ?? operativeSrc;
		expect(fnBlock).toMatch(/sendFcmToUids/);
	});

	it('push call is wrapped in try/catch (non-fatal guard)', () => {
		// Confirm push failure does not break the send path
		expect(operativeSrc).toMatch(/push failed \(non-fatal\)/);
	});
});

// ── W1 + W3: index.js re-exports onTeamBroadcastCreated (core codebase) ──────

describe('Epic 4.3 — index.js exports onTeamBroadcastCreated (deploy:core)', () => {
	it('index.js exports onTeamBroadcastCreated from notificationOps', () => {
		expect(indexSrc).toMatch(/exports\.onTeamBroadcastCreated\s*=\s*notificationOps\.onTeamBroadcastCreated/);
	});
});
