/**
 * commsCostHotfix.test.ts — COMMS-COST-HOTFIX static guards (read amplification)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const ANNOUNCEMENTS_INBOX = join(ROOT, 'lib/components/comms/AnnouncementsInbox.svelte');
const PARENT_LATEST = join(ROOT, 'lib/components/parent/ParentLatestAnnouncements.svelte');
const SPONSOR_CHANNEL = join(ROOT, 'lib/components/comms/CommsSponsorPartnerChannel.svelte');
const PARENT_LOUNGE = join(ROOT, 'lib/components/comms/ParentLoungePanel.svelte');
const STAFF_INTERNAL = join(ROOT, 'lib/components/comms/CommsStaffInternalChannel.svelte');
const HOUSEHOLD = join(ROOT, 'lib/components/comms/HouseholdThreadPanel.svelte');

describe('COMMS-COST-HOTFIX — AnnouncementsInbox', () => {
	it('uses primary parentRecipientEmails query first', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf8');
		expect(src).toMatch(/parentRecipientEmails.*array-contains/);
	});

	it('defers legacy ccParentEmails listener until primary is insufficient', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf8');
		expect(src).toMatch(/attachLegacyListener/);
		expect(src).toMatch(/snap\.size\s*<\s*20/);
		expect(src).not.toMatch(/unsubLegacy\s*=\s*onSnapshot\(\s*\n\s*qLegacy,\s*\n\s*mergeRows/);
	});

	it('debounces refreshParentAcks getDoc loop', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf8');
		expect(src).toMatch(/scheduleAckRefresh/);
		expect(src).toMatch(/setTimeout/);
		expect(src).toMatch(/ann\.id in ackedById/);
	});
});

describe('COMMS-COST-HOTFIX — ParentLatestAnnouncements', () => {
	it('uses short TTL cache to avoid duplicate fetches', () => {
		const src = readFileSync(PARENT_LATEST, 'utf8');
		expect(src).toMatch(/CACHE_TTL_MS/);
		expect(src).toMatch(/annCache/);
	});

	it('queries legacy ccParentEmails only when primary is insufficient', () => {
		const src = readFileSync(PARENT_LATEST, 'utf8');
		expect(src).toMatch(/rows\.length\s*<\s*maxRows/);
		expect(src).toMatch(/ccParentEmails.*array-contains/);
	});
});

describe('COMMS-COST-HOTFIX — CommsSponsorPartnerChannel', () => {
	it('defers messages listener until templates are ready for directors', () => {
		const src = readFileSync(SPONSOR_CHANNEL, 'utf8');
		expect(src).toMatch(/templatesReady/);
		expect(src).toMatch(/!templatesReady/);
		expect(src).toMatch(/!isDirector/);
	});
});

describe('COMMS-COST-HOTFIX — channel message limits', () => {
	it('ParentLoungePanel caps listener at 50 until pagination', () => {
		const src = readFileSync(PARENT_LOUNGE, 'utf8');
		expect(src).toMatch(/limit\(50\)/);
		expect(src).not.toMatch(/limit\(200\)/);
	});

	it('CommsStaffInternalChannel caps listener at 50 until pagination', () => {
		const src = readFileSync(STAFF_INTERNAL, 'utf8');
		expect(src).toMatch(/limit\(50\)/);
		expect(src).not.toMatch(/limit\(200\)/);
	});

	it('HouseholdThreadPanel caps listener at 50 until pagination', () => {
		const src = readFileSync(HOUSEHOLD, 'utf8');
		expect(src).toMatch(/limit\(50\)/);
		expect(src).not.toMatch(/limit\(200\)/);
	});
});
