/**
 * commsPhase2.test.ts — Epic 4.14 typed channels + logistics migration guards
 * Authority: docs/vision/COMMS_CHANNEL_CANON.md §9 Phase 2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	PHASE2_CHANNEL_TYPE_IDS,
	COMMS_CHANNEL_TYPE_REGISTRY,
} from '$lib/comms/channelTypes.js';

const ROOT = join(__dirname, '..', '..', '..');
const HUB_SHELL = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const LOGISTICS_VIEW = join(ROOT, 'lib/coach/logistics/CoachLogisticsView.svelte');
const LOGISTICS_CHANNEL = join(ROOT, 'lib/components/comms/CommsLogisticsChannel.svelte');
const CHANNEL_TYPES = join(ROOT, 'lib/comms/channelTypes.ts');
const COMMS_CHANNEL_OPS = join(ROOT, '..', 'functions/src/domains/commsChannelOps.js');

describe('commsPhase2 — channelTypes registry', () => {
	it('exports all Phase 2 type_ids', () => {
		expect(PHASE2_CHANNEL_TYPE_IDS).toEqual([
			'team_logistics',
			'registration',
			'tryouts_events',
			'match_day',
		]);
		for (const id of PHASE2_CHANNEL_TYPE_IDS) {
			expect(COMMS_CHANNEL_TYPE_REGISTRY[id as keyof typeof COMMS_CHANNEL_TYPE_REGISTRY]).toBeDefined();
		}
	});

	it('channelTypes.ts mirrors canon type_ids', () => {
		const src = readFileSync(CHANNEL_TYPES, 'utf8');
		for (const id of PHASE2_CHANNEL_TYPE_IDS) {
			expect(src).toContain(`'${id}'`);
		}
	});
});

describe('commsPhase2 — hub shell expansion', () => {
	it('CommsHubShell includes team_logistics + registration rails', () => {
		const src = readFileSync(HUB_SHELL, 'utf8');
		expect(src).toMatch(/team_logistics/);
		expect(src).toMatch(/registration/);
		expect(src).toMatch(/tryouts_events/);
		expect(src).toMatch(/match_day/);
		expect(src).toMatch(/CommsLogisticsChannel/);
		expect(src).toMatch(/CommsRegistrationChannel/);
	});
});

describe('commsPhase2 — logistics migration', () => {
	it('CoachLogisticsView embeds ParentAnnouncementCompose — not a link farm', () => {
		const src = readFileSync(LOGISTICS_VIEW, 'utf8');
		expect(src).toMatch(/ParentAnnouncementCompose/);
		expect(src).not.toMatch(/MessagesTab/);
		expect(src).toMatch(/Open team comms/);
		expect(src).not.toMatch(/Game day logistics/);
		expect(src).not.toMatch(/Practice logistics/);
	});

	it('CommsLogisticsChannel uses CommsLogisticsThread — not MessagesTab', () => {
		expect(existsSync(LOGISTICS_CHANNEL)).toBe(true);
		const src = readFileSync(LOGISTICS_CHANNEL, 'utf8');
		expect(src).toMatch(/CommsLogisticsThread/);
		expect(src).not.toMatch(/MessagesTab/);
	});
});

describe('commsPhase2 — server system message bus', () => {
	it('commsChannelOps exports postChannelSystemMessage', () => {
		const src = readFileSync(COMMS_CHANNEL_OPS, 'utf8');
		expect(src).toMatch(/exports\.postChannelSystemMessage/);
		expect(src).toMatch(/channelType/);
		expect(src).toMatch(/deliveryReport/);
	});
});
