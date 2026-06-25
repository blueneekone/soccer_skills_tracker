/**
 * commsPhase4a.test.ts — Epic 4.16a omnichannel delivery bus guards
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const COMMS_TS = join(ROOT, 'lib/services/comms.svelte.ts');
const RECEIPT = join(ROOT, 'lib/components/comms/DeliveryReceipt.svelte');
const OMNICHANNEL = join(ROOT, '..', 'functions/src/domains/omnichannelOps.js');
const NOTIF = join(ROOT, '..', 'functions/src/domains/notificationOps.js');
const EGRESS = join(ROOT, '..', 'functions/egressGuard.js');

describe('commsPhase4a — client delivery types', () => {
	it('DeliveryChannel includes sms', () => {
		const src = readFileSync(COMMS_TS, 'utf8');
		expect(src).toMatch(/'sms'/);
		expect(src).toMatch(/DeliveryChannel.*sms/s);
	});

	it('DeliveryReceipt renders channel chips', () => {
		const src = readFileSync(RECEIPT, 'utf8');
		expect(src).toMatch(/delivery-receipt__chip/);
		expect(src).toMatch(/row\.channels/);
		expect(src).toMatch(/sms/);
	});
});

describe('commsPhase4a — server omnichannel bus', () => {
	it('omnichannelOps exports email + SMS senders', () => {
		const src = readFileSync(OMNICHANNEL, 'utf8');
		expect(src).toMatch(/exports\.sendBroadcastEmail/);
		expect(src).toMatch(/exports\.sendEmergencySms/);
		expect(src).toMatch(/commsEmailFallback/);
		expect(src).toMatch(/commsSmsEmergency/);
	});

	it('emergency SMS gated on priority/source', () => {
		const src = readFileSync(OMNICHANNEL, 'utf8');
		expect(src).toMatch(/priority.*emergency|emergency.*priority/s);
		expect(src).toMatch(/broadcastSource.*emergency|emergency.*broadcastSource/s);
	});

	it('onTeamBroadcastCreated wires omnichannel fallback', () => {
		const src = readFileSync(NOTIF, 'utf8');
		expect(src).toMatch(/processTeamBroadcastOmnichannel/);
		expect(src).toMatch(/OMNICHANNEL_SECRETS/);
	});

	it('egress whitelist includes twilio', () => {
		const src = readFileSync(EGRESS, 'utf8');
		expect(src).toMatch(/api\.twilio\.com/);
	});
});
