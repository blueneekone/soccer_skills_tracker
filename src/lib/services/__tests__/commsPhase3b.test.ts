/**
 * commsPhase3b.test.ts — Epic 4.15b emergency break-glass channel guards
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	COMMS_CHANNEL_TYPE_REGISTRY,
	canPersonaPostChannel,
	canPersonaReadChannel,
} from '$lib/comms/channelTypes.js';

const ROOT = join(__dirname, '..', '..', '..');
const HUB_SHELL = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const EMERGENCY = join(ROOT, 'lib/components/comms/CommsEmergencyChannel.svelte');
const COMMS_TS = join(ROOT, 'lib/services/comms.svelte.ts');
const COMMS_JS = join(ROOT, '..', 'functions/comms.js');
const INDEX_JS = join(ROOT, '..', 'functions/index.js');
const NOTIF = join(ROOT, '..', 'functions/src/domains/notificationOps.js');
const RULES = join(ROOT, '..', 'firestore.rules');
const PARENT_ANN = join(ROOT, 'lib/components/parent/ParentLatestAnnouncements.svelte');

describe('commsPhase3b — channelTypes emergency', () => {
	it('registers emergency with director/admin post and parent read', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.emergency).toBeDefined();
		expect(canPersonaPostChannel('emergency', 'director')).toBe(true);
		expect(canPersonaPostChannel('emergency', 'coach')).toBe(false);
		expect(canPersonaReadChannel('emergency', 'parent')).toBe(true);
	});
});

describe('commsPhase3b — server emergencyClubBroadcast', () => {
	it('exports emergencyClubBroadcast from comms.js and index.js', () => {
		const comms = readFileSync(COMMS_JS, 'utf8');
		const indexJs = readFileSync(INDEX_JS, 'utf8');
		expect(comms).toMatch(/exports\.emergencyClubBroadcast\s*=\s*onCall/);
		expect(indexJs).toMatch(/exports\.emergencyClubBroadcast\s*=\s*commsHandlers\.emergencyClubBroadcast/);
	});

	it('fans out with priority emergency and deliveryReport rollup', () => {
		const comms = readFileSync(COMMS_JS, 'utf8');
		expect(comms).toMatch(/priority:\s*'emergency'/);
		expect(comms).toMatch(/broadcastSource:\s*'emergency'/);
		expect(comms).toMatch(/aggregateClubDeliveryReport/);
		expect(comms).toMatch(/deliveryReport/);
	});

	it('onTeamBroadcastCreated uses high-priority FCM for emergency', () => {
		const src = readFileSync(NOTIF, 'utf8');
		expect(src).toMatch(/isEmergency/);
		expect(src).toMatch(/emergency:\s*isEmergency/);
		expect(src).toMatch(/emergency_alerts/);
	});
});

describe('commsPhase3b — client emergency hub', () => {
	it('CommsEmergencyChannel exists with confirm + DeliveryReceipt', () => {
		expect(existsSync(EMERGENCY)).toBe(true);
		const src = readFileSync(EMERGENCY, 'utf8');
		expect(src).toMatch(/emergencyClubBroadcast/);
		expect(src).toMatch(/DeliveryReceipt/);
		expect(src).toMatch(/alertdialog|Confirm emergency/);
	});

	it('CommsEngine wires emergencyClubBroadcast', () => {
		const src = readFileSync(COMMS_TS, 'utf8');
		expect(src).toMatch(/emergencyClubBroadcast/);
		expect(src).toMatch(/httpsCallable\(fns,\s*'emergencyClubBroadcast'\)/);
	});

	it('CommsHubShell mounts emergency rail director/admin only', () => {
		const src = readFileSync(HUB_SHELL, 'utf8');
		expect(src).toMatch(/canPersonaPostChannel\('emergency'/);
		expect(src).toMatch(/CommsEmergencyChannel/);
		expect(src).toMatch(/channel=emergency|id === 'emergency'/);
	});

	it('ParentLatestAnnouncements shows emergency badge', () => {
		const src = readFileSync(PARENT_ANN, 'utf8');
		expect(src).toMatch(/priority === 'emergency'/);
		expect(src).toMatch(/parent-ann-strip__emergency-badge/);
	});

	it('firestore.rules documents team_broadcasts priority field', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/team_broadcasts/);
		expect(rules).toMatch(/priority/);
	});
});
