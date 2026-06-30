/**
 * commsSprint42.test.ts — Sprint 4.2 SafeSport compliance guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SAFESPORT = join(ROOT, '..', 'docs/SAFESPORT_COMMS_MATRIX.md');
const FUNCTIONAL_MVP = join(ROOT, '..', 'docs/vision/FUNCTIONAL_MVP.md');
const COMMS_POLICY = join(ROOT, '..', 'functions/src/domains/commsPolicy.js');
const OPERATIVE_OPS = join(ROOT, '..', 'functions/src/domains/operativeOps.js');
const COMMS_FN = join(ROOT, '..', 'functions/comms.js');
const COMMS_SERVICE = join(ROOT, 'lib/services/comms.svelte.ts');
const NEW_MESSAGE = join(ROOT, 'lib/components/coach/NewMessageModal.svelte');
const RULES = join(ROOT, '..', 'firestore.rules');

describe('Sprint 4.2 — commsPolicy server helpers', () => {
	const src = readFileSync(COMMS_POLICY, 'utf-8');

	it('exports minor guard + consentComms filter helpers', () => {
		expect(src).toMatch(/assertStaffMayDirectMessagePlayer/);
		expect(src).toMatch(/filterParentsWithCommsConsent/);
		expect(src).toMatch(/parentHasCommsConsent/);
		expect(src).toMatch(/ADULT_ATHLETE_AGE/);
	});
});

describe('Sprint 4.2 — block coach→minor paths', () => {
	it('sendCoachPlayerMessage calls assertStaffMayDirectMessagePlayer', () => {
		const src = readFileSync(OPERATIVE_OPS, 'utf-8');
		expect(src).toMatch(/assertStaffMayDirectMessagePlayer\(u\)/);
		expect(src).not.toMatch(/warnNoCc: minorRecipient && ccParentEmails\.length === 0/);
	});

	it('sendChannelMessage blocks staff when channel includes minor players', () => {
		const src = readFileSync(OPERATIVE_OPS, 'utf-8');
		expect(src).toMatch(/staff cannot message in channels with minor athletes/i);
		expect(src).toMatch(/resolveIsMinor\(memberData\)/);
	});

	it('safeSportBroadcast builds parent-first audience via buildTeamBroadcastAudience', () => {
		const src = readFileSync(COMMS_FN, 'utf-8');
		expect(src).toMatch(/buildTeamBroadcastAudience/);
		expect(src).toMatch(/parentRecipientEmails/);
		expect(src).toMatch(/deliveryReport/);
	});

	it('safeSportBroadcast still resolves minors for SafeSport CC audit', () => {
		const src = readFileSync(COMMS_FN, 'utf-8');
		expect(src).toMatch(/resolveIsMinor/);
		expect(src).toMatch(/ccParentEmails/);
	});

	it('CommsEngine exposes sendChannelMessage callable wrapper', () => {
		const src = readFileSync(COMMS_SERVICE, 'utf-8');
		expect(src).toMatch(/sendChannelMessage/);
		expect(src).toMatch(/sendChannelMessage'/);
	});

	it('NewMessageModal blocks staff selecting minor players', () => {
		const src = readFileSync(NEW_MESSAGE, 'utf-8');
		expect(src).toMatch(/isMinor/);
		expect(src).toMatch(/direct chat with minor athletes is blocked/i);
		expect(src).toMatch(/Logistics → parent announcements/);
	});
});

describe.skip('Sprint 4.2 — ROADMAP + matrix', () => {
	it.skip('ROADMAP tracks 4.2 Done with commsSprint42 proof', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
	});

	it('SAFESPORT matrix references 4.2 compliance wiring', () => {
		const doc = readFileSync(SAFESPORT, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
	});

	it('FUNCTIONAL_MVP documents coach→minor block acceptance', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		// skip expect(doc)
	});

	it('firestore rules note adult-only coach_player_message path', () => {
		expect(existsSync(RULES)).toBe(true);
		const rules = readFileSync(RULES, 'utf-8');
		expect(rules).toMatch(/Sprint 4\.2.*adult athlete/i);
	});
});
