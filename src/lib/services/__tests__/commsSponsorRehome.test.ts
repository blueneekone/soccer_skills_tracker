/**
 * commsSponsorRehome.test.ts — COMMS-SPONSOR-REHOME static guards
 * Partner offers: director ops compose + parent dashboard strip — not hub rail.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const SPONSOR_CH = join(ROOT, 'lib/components/comms/CommsSponsorPartnerChannel.svelte');
const PARENT_OFFERS = join(ROOT, 'lib/components/parent/ParentPartnerOffers.svelte');
const PARENT_DASH = join(ROOT, 'routes/(app)/parent/dashboard/+page.svelte');
const DIRECTOR = join(ROOT, 'routes/(app)/director/+page.svelte');
const STANDARDS = join(ROOT, '..', 'docs/vision/COMMS_PLATFORM_STANDARDS.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

describe('COMMS-SPONSOR-REHOME — hub rail removed', () => {
	it('CommsHubShell does not wire sponsor_partner rail or channel mount', () => {
		const src = readFileSync(HUB, 'utf8');
		expect(src).not.toMatch(/CommsSponsorPartnerChannel/);
		expect(src).not.toMatch(/showSponsorPartner/);
		expect(src).not.toMatch(/sponsor_partner/);
	});
});

describe('COMMS-SPONSOR-REHOME — director ops compose', () => {
	it('CommsSponsorPartnerChannel is director-only with delivery receipt', () => {
		expect(existsSync(SPONSOR_CH)).toBe(true);
		const src = readFileSync(SPONSOR_CH, 'utf8');
		expect(src).toMatch(/isDirector/);
		expect(src).toMatch(/Director ops only/);
		expect(src).not.toMatch(/Your partner updates/);
		expect(src).toMatch(/createSponsorTemplate/);
		expect(src).toMatch(/sendSponsorPartnerDigest/);
		expect(src).toMatch(/DeliveryReceipt/);
		expect(src).toMatch(/consentSponsor/);
	});

	it('/director?tab=comms mounts CommsSponsorPartnerChannel', () => {
		const src = readFileSync(DIRECTOR, 'utf8');
		expect(src).toMatch(/CommsSponsorPartnerChannel/);
		expect(src).toMatch(/activeTab === 'comms'/);
		expect(src).toMatch(/Partner offers/);
	});
});

describe('COMMS-SPONSOR-REHOME — parent dashboard strip', () => {
	it('ParentPartnerOffers queries guardian-scoped sponsor messages with cache', () => {
		expect(existsSync(PARENT_OFFERS)).toBe(true);
		const src = readFileSync(PARENT_OFFERS, 'utf8');
		expect(src).toMatch(/parentEmail.*==/);
		expect(src).toMatch(/CACHE_TTL_MS/);
		expect(src).toMatch(/sponsor-partner-/);
		expect(src).toMatch(/\/parent\/vpc/);
	});

	it('parent dashboard mounts ParentPartnerOffers after announcements', () => {
		const src = readFileSync(PARENT_DASH, 'utf8');
		expect(src).toMatch(/ParentPartnerOffers/);
		expect(src).toMatch(/ParentLatestAnnouncements/);
		const annIdx = src.indexOf('ParentLatestAnnouncements');
		const offersIdx = src.indexOf('ParentPartnerOffers');
		expect(offersIdx).toBeGreaterThan(annIdx);
	});
});

describe('COMMS-SPONSOR-REHOME — standards alignment', () => {
	it('COMMS_PLATFORM_STANDARDS §4.4 — not a hub chat rail', () => {
		const src = readFileSync(STANDARDS, 'utf8');
		expect(src).toMatch(/Not a hub chat rail/);
		expect(src).toMatch(/director ops \+ parent dashboard strip/);
	});

	it('ROADMAP COMMS-SPONSOR-REHOME marked Done', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toMatch(/\| COMMS-SPONSOR-REHOME \| \*\*Done\*\*/);
	});
});
