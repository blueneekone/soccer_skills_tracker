/**
 * commsPhase4c.test.ts — Epic 4.16c sponsor & partner templates guards
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const SPONSOR_OPS = join(ROOT, '..', 'functions/src/domains/sponsorPartnerOps.js');
const POLICY = join(ROOT, '..', 'functions/src/domains/commsPolicy.js');
const INDEX = join(ROOT, '..', 'functions/index.js');
const VPC = join(ROOT, 'routes/(app)/parent/vpc/+page.svelte');
const COMMS_TS = join(ROOT, 'lib/services/comms.svelte.ts');
const CHANNEL_TYPES = join(ROOT, 'lib/comms/channelTypes.ts');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const SPONSOR_CH = join(ROOT, 'lib/components/comms/CommsSponsorPartnerChannel.svelte');
const RECEIPT = join(ROOT, 'lib/components/comms/DeliveryReceipt.svelte');
const RULES = join(ROOT, '..', 'firestore.rules');
const PKG = join(ROOT, '..', 'package.json');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const CANON = join(ROOT, '..', 'docs/vision/COMMS_CHANNEL_CANON.md');

describe('commsPhase4c — server ops', () => {
	it('sponsorPartnerOps exists with lifecycle callables', () => {
		expect(existsSync(SPONSOR_OPS)).toBe(true);
		const src = readFileSync(SPONSOR_OPS, 'utf8');
		expect(src).toMatch(/createSponsorTemplate/);
		expect(src).toMatch(/approveSponsorTemplate/);
		expect(src).toMatch(/sendSponsorPartnerDigest/);
		expect(src).toMatch(/status: 'draft'/);
		expect(src).toMatch(/status: 'approved'/);
		expect(src).toMatch(/status: 'sent'/);
	});

	it('commsPolicy filterParentsWithSponsorConsent dual-gates VPC', () => {
		const src = readFileSync(POLICY, 'utf8');
		expect(src).toMatch(/filterParentsWithSponsorConsent/);
		expect(src).toMatch(/parentHasSponsorConsent/);
		expect(src).toMatch(/items\.sponsor === true && items\.comms === true/);
	});
});

describe('commsPhase4c — VPC consentSponsor', () => {
	it('parent vpc page exposes consentSponsor checkbox separate from comms', () => {
		const src = readFileSync(VPC, 'utf8');
		expect(src).toMatch(/consentSponsor/);
		expect(src).toMatch(/sponsor: consentSponsor/);
		expect(src).toMatch(/Sponsor &amp; partner updates/);
	});
});

describe('commsPhase4c — client surfaces', () => {
	it('channelTypes registry includes sponsor_partner', () => {
		const src = readFileSync(CHANNEL_TYPES, 'utf8');
		expect(src).toMatch(/sponsor_partner/);
		expect(src).toMatch(/whoCanRead: \['parent', 'director', 'admin'\]/);
	});

	it('CommsHubShell wires sponsor_partner rail', () => {
		const src = readFileSync(HUB, 'utf8');
		expect(src).toMatch(/CommsSponsorPartnerChannel/);
		expect(src).toMatch(/showSponsorPartner/);
		expect(src).toMatch(/sponsor_partner/);
	});

	it('CommsSponsorPartnerChannel director editor + parent read-only', () => {
		expect(existsSync(SPONSOR_CH)).toBe(true);
		const src = readFileSync(SPONSOR_CH, 'utf8');
		expect(src).toMatch(/createSponsorTemplate/);
		expect(src).toMatch(/approveSponsorTemplate/);
		expect(src).toMatch(/sendSponsorPartnerDigest/);
		expect(src).toMatch(/DeliveryReceipt/);
		expect(src).toMatch(/consentSponsor/);
	});

	it('CommsEngine exposes sponsor callables', () => {
		const src = readFileSync(COMMS_TS, 'utf8');
		expect(src).toMatch(/createSponsorTemplate/);
		expect(src).toMatch(/approveSponsorTemplate/);
		expect(src).toMatch(/sendSponsorPartnerDigest/);
	});

	it('DeliveryReceipt labels consent_sponsor_declined skip reason', () => {
		const src = readFileSync(RECEIPT, 'utf8');
		expect(src).toMatch(/consent_sponsor_declined/);
	});
});

describe('commsPhase4c — deploy + roadmap', () => {
	it('index and deploy:comms wire sponsor callables', () => {
		expect(readFileSync(INDEX, 'utf8')).toMatch(/sendSponsorPartnerDigest/);
		const pkg = readFileSync(PKG, 'utf8');
		expect(pkg).toMatch(/createSponsorTemplate/);
		expect(pkg).toMatch(/sendSponsorPartnerDigest/);
	});

	it('firestore rules cover sponsor_templates and sponsor_partner channel', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/sponsor_templates/);
		expect(rules).toMatch(/sponsor_partner/);
	});

	it('ROADMAP 4.16c marked Done', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toMatch(/\| 4\.16c \| \*\*Done\*\*/);
	});

	it('COMMS_CHANNEL_CANON sponsor_partner shipped', () => {
		const canon = readFileSync(CANON, 'utf8');
		expect(canon).toMatch(/sponsor_partner/);
		expect(canon).toMatch(/\*\*shipped\*\* — 4\.16c/);
	});
});
