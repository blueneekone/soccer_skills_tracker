/**
 * commsParentCircle.test.ts — COMMS-PARENT-CIRCLE-POLICY drift guards
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.1
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	COMMS_CHANNEL_TYPE_REGISTRY,
	canPersonaPostChannel,
	canPersonaReadChannel,
} from '$lib/comms/channelTypes.js';

const ROOT = join(__dirname, '..', '..', '..');
const CHANNEL_OPS = join(ROOT, '..', 'functions/src/domains/commsChannelOps.js');
const OPERATIVE_OPS = join(ROOT, '..', 'functions/src/domains/operativeOps.js');
const PARENT_PANEL = join(ROOT, 'lib/components/comms/ParentLoungePanel.svelte');
const CANON = join(ROOT, '..', 'docs/vision/COMMS_CHANNEL_CANON.md');

const channelOpsSrc = readFileSync(CHANNEL_OPS, 'utf8');
const operativeOpsSrc = readFileSync(OPERATIVE_OPS, 'utf8');
const panelSrc = readFileSync(PARENT_PANEL, 'utf8');
const provisionBlock =
	channelOpsSrc.split('exports.provisionParentLoungeChannel')[1]?.split('exports.')[0] ?? '';

describe('COMMS-PARENT-CIRCLE-POLICY — channelTypes parent_lounge', () => {
	it('registers parent_lounge with parent-only post', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_lounge).toBeDefined();
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_lounge.whoCanPost).toEqual(['parent']);
		expect(canPersonaPostChannel('parent_lounge', 'parent')).toBe(true);
		expect(canPersonaPostChannel('parent_lounge', 'coach')).toBe(false);
		expect(canPersonaPostChannel('parent_lounge', 'director')).toBe(false);
		expect(canPersonaReadChannel('parent_lounge', 'parent')).toBe(true);
	});
});

describe('COMMS-PARENT-CIRCLE-POLICY — provisionParentLoungeChannel', () => {
	it('sets channelType parent_lounge on create', () => {
		expect(provisionBlock).toMatch(/channelType:\s*'parent_lounge'/);
	});

	it('does not merge coach emails into memberIds on create', () => {
		expect(provisionBlock).toMatch(/memberIds:\s*parentMemberEmails/);
		expect(provisionBlock).not.toMatch(
			/\[\.\.\.normCoachEmails,\s*\.\.\.normParentEmails\]/,
		);
	});

	it('strips coach emails from memberIds on upsert', () => {
		expect(provisionBlock).toMatch(/coachStripSet/);
		expect(provisionBlock).toMatch(/filter\(\(email\)\s*=>\s*!coachStripSet\.has\(email\)\)/);
	});
});

describe('COMMS-PARENT-CIRCLE-POLICY — sendChannelMessage server guard', () => {
	it('blocks non-parent posts on parent_lounge', () => {
		expect(operativeOpsSrc).toMatch(/channelType === 'parent_lounge'/);
		expect(operativeOpsSrc).toMatch(/callerRole !== 'parent'/);
		expect(operativeOpsSrc).toMatch(/Parent Circle is parent-peer only/);
	});

	it('infers parent_lounge from parent-lounge- channel id prefix', () => {
		expect(operativeOpsSrc).toMatch(/parent-lounge-/);
	});
});

describe('COMMS-PARENT-CIRCLE-POLICY — ParentLoungePanel copy', () => {
	it('describes peer lounge with staff redirect to Announcements / Message coach', () => {
		expect(panelSrc).toMatch(/Peer parent lounge/i);
		expect(panelSrc).toMatch(/monitored per SafeSport/i);
		expect(panelSrc).toMatch(/Announcements/);
		expect(panelSrc).toMatch(/Message coach/i);
		expect(panelSrc).not.toMatch(/Coaches and parents only/i);
	});
});

describe('COMMS-PARENT-CIRCLE-POLICY — canon sync', () => {
	it('parent_lounge row documents parents-only memberIds and post guard', () => {
		const doc = readFileSync(CANON, 'utf8');
		expect(doc).toMatch(/COMMS-PARENT-CIRCLE-POLICY/);
		expect(doc).toMatch(/parents post only|parents-only/i);
	});
});
