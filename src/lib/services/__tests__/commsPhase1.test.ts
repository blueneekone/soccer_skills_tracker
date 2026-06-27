/**
 * commsPhase1.test.ts — Epic 4.13a unified hub + delivery receipt guards
 * Authority: docs/vision/COMMS_CHANNEL_CANON.md §6–§9
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const COMMS_SERVICE = join(ROOT, 'lib/services/comms.svelte.ts');
const COMPOSE = join(ROOT, 'lib/components/coach/ParentAnnouncementCompose.svelte');
const HUB_SHELL = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const MESSAGES_PAGE = join(ROOT, 'routes/(app)/messages/+page.svelte');
const LOGISTICS_VIEW = join(ROOT, 'lib/coach/logistics/CoachLogisticsView.svelte');
const PARENT_DASH = join(ROOT, 'routes/(app)/parent/dashboard/+page.svelte');
const COMMS_JS = join(ROOT, '..', 'functions/comms.js');
const CANON = join(ROOT, '..', 'docs/vision/COMMS_CHANNEL_CANON.md');

describe('commsPhase1 — delivery contract on client', () => {
	it('comms.svelte.ts exports DeliveryReport per COMMS_CHANNEL_CANON §6', () => {
		const src = readFileSync(COMMS_SERVICE, 'utf8');
		expect(src).toMatch(/interface DeliveryReport/);
		expect(src).toMatch(/parentDelivered/);
		expect(src).toMatch(/parentSkipped/);
		expect(src).toMatch(/consent_comms_declined/);
	});

	it('ParentAnnouncementCompose uses DeliveryReceipt — not roster-member-only copy', () => {
		const src = readFileSync(COMPOSE, 'utf8');
		expect(src).toMatch(/DeliveryReceipt/);
		expect(src).not.toMatch(/roster member/);
		expect(src).toMatch(/Publish announcement/);
	});
});

describe('commsPhase1 — unified hub shell', () => {
	it('CommsHubShell component exists with channel rail', () => {
		expect(existsSync(HUB_SHELL)).toBe(true);
		const src = readFileSync(HUB_SHELL, 'utf8');
		expect(src).toMatch(/announcements/);
		expect(src).toMatch(/parent_lounge/);
		expect(src).toMatch(/outbox/i);
	});

	it('messages page mounts CommsHubShell', () => {
		const src = readFileSync(MESSAGES_PAGE, 'utf8');
		expect(src).toMatch(/CommsHubShell/);
	});

	it('CoachLogisticsView embeds native announcement compose on Team Ops comms tab', () => {
		const src = readFileSync(LOGISTICS_VIEW, 'utf8');
		expect(src).toMatch(/ParentAnnouncementCompose/);
		expect(src).toMatch(/Open team comms/);
	});

	it('parent dashboard includes latest announcements strip', () => {
		const src = readFileSync(PARENT_DASH, 'utf8');
		expect(src).toMatch(/ParentLatestAnnouncements/);
	});
});

describe('commsPhase1 — server delivery fields', () => {
	it('commitTeamBroadcast persists parentRecipientEmails and deliveryReport', () => {
		const src = readFileSync(COMMS_JS, 'utf8');
		expect(src).toMatch(/parentRecipientEmails/);
		expect(src).toMatch(/deliveryReport/);
		expect(src).toMatch(/buildTeamBroadcastAudience/);
	});

	it('COMMS_CHANNEL_CANON documents Phase 1 delivery contract', () => {
		const doc = readFileSync(CANON, 'utf8');
		expect(doc).toMatch(/deliveryReport|DeliveryReport/);
		expect(doc).toMatch(/4\.13a/);
	});
});
