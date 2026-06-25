/**
 * commsPhase4b.test.ts — Epic 4.16b broadcast read/ack compliance guards
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const COMMS_JS = join(ROOT, '..', 'functions/comms.js');
const ACK_OPS = join(ROOT, '..', 'functions/src/domains/broadcastAckOps.js');
const INDEX = join(ROOT, '..', 'functions/index.js');
const COMMS_TS = join(ROOT, 'lib/services/comms.svelte.ts');
const INBOX = join(ROOT, 'lib/components/comms/AnnouncementsInbox.svelte');
const OUTBOX = join(ROOT, 'lib/components/comms/CommsOutbox.svelte');
const PAC = join(ROOT, 'lib/components/coach/ParentAnnouncementCompose.svelte');
const EMERGENCY = join(ROOT, 'lib/components/comms/CommsEmergencyChannel.svelte');
const RULES = join(ROOT, '..', 'firestore.rules');
const INDEXES = join(ROOT, '..', 'firestore.indexes.json');
const PKG = join(ROOT, '..', 'package.json');

describe('commsPhase4b — broadcastAckOps', () => {
	it('exports acknowledgeBroadcast and getBroadcastAckStatus', () => {
		expect(existsSync(ACK_OPS)).toBe(true);
		const src = readFileSync(ACK_OPS, 'utf8');
		expect(src).toMatch(/exports\.acknowledgeBroadcast/);
		expect(src).toMatch(/exports\.getBroadcastAckStatus/);
		expect(src).toMatch(/broadcast_acknowledgements/);
		expect(src).toMatch(/ackDocId/);
	});

	it('index.js wires ack callables', () => {
		const src = readFileSync(INDEX, 'utf8');
		expect(src).toMatch(/acknowledgeBroadcast/);
		expect(src).toMatch(/getBroadcastAckStatus/);
	});
});

describe('commsPhase4b — commitTeamBroadcast requiresAck', () => {
	it('persists requiresAck fields on team_broadcasts', () => {
		const src = readFileSync(COMMS_JS, 'utf8');
		expect(src).toMatch(/requiresAck/);
		expect(src).toMatch(/ackDeadline/);
		expect(src).toMatch(/ackEligibleEmails/);
		expect(src).toMatch(/acknowledgedCount/);
	});

	it('safeSportBroadcast and emergencyClubBroadcast pass requiresAck', () => {
		const src = readFileSync(COMMS_JS, 'utf8');
		expect(src).toMatch(/parseAckDeadline/);
		const emergencyBlock = src.slice(src.indexOf('exports.emergencyClubBroadcast'));
		expect(emergencyBlock).toMatch(/requiresAck/);
	});
});

describe('commsPhase4b — client ack surfaces', () => {
	it('CommsEngine exposes ack methods', () => {
		const src = readFileSync(COMMS_TS, 'utf8');
		expect(src).toMatch(/acknowledgeBroadcast/);
		expect(src).toMatch(/getBroadcastAckStatus/);
		expect(src).toMatch(/BroadcastAckStatus/);
	});

	it('AnnouncementsInbox shows parent ack CTA', () => {
		const src = readFileSync(INBOX, 'utf8');
		expect(src).toMatch(/I have read this/);
		expect(src).toMatch(/acknowledgeBroadcast/);
		expect(src).toMatch(/broadcast_acknowledgements/);
	});

	it('CommsOutbox shows acknowledgment rollup', () => {
		const src = readFileSync(OUTBOX, 'utf8');
		expect(src).toMatch(/getBroadcastAckStatus/);
		expect(src).toMatch(/Acknowledgments:/);
		expect(src).toMatch(/pendingEmails/);
	});

	it('compose surfaces offer requiresAck checkbox', () => {
		expect(readFileSync(PAC, 'utf8')).toMatch(/Require parent acknowledgment/);
		expect(readFileSync(EMERGENCY, 'utf8')).toMatch(/Require parent acknowledgment/);
	});
});

describe('commsPhase4b — firestore + deploy', () => {
	it('rules and indexes for broadcast_acknowledgements', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/broadcast_acknowledgements/);
		expect(rules).toMatch(/parentUid == request\.auth\.uid/);
		const indexes = readFileSync(INDEXES, 'utf8');
		expect(indexes).toMatch(/broadcast_acknowledgements/);
		expect(indexes).toMatch(/messageId/);
	});

	it('deploy:comms includes ack callables', () => {
		const pkg = readFileSync(PKG, 'utf8');
		expect(pkg).toMatch(/acknowledgeBroadcast/);
		expect(pkg).toMatch(/getBroadcastAckStatus/);
	});
});
