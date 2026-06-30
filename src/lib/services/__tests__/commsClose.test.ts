/**
 * commsClose.test.ts — Epic 4 COMMS-CLOSE finish-line checklist (4.13a–4.16d)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const REPO = join(ROOT, '..');
const ROADMAP = join(REPO, 'ROADMAP.md');
const CANON = join(REPO, 'docs/vision/COMMS_CHANNEL_CANON.md');
const CHANNEL_TYPES = join(ROOT, 'lib/comms/channelTypes.ts');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const DIRECTOR = join(ROOT, 'routes/(app)/director/+page.svelte');
const COMMS_JS = join(REPO, 'functions/comms.js');
const INDEX = join(REPO, 'functions/index.js');

const PHASE_CLIENT = [
	'commsPhase1.test.ts',
	'commsPhase2.test.ts',
	'commsPhase3a.test.ts',
	'commsPhase3b.test.ts',
	'commsPhase3c.test.ts',
	'commsPhase3d.test.ts',
	'commsPhase4a.test.ts',
	'commsPhase4b.test.ts',
	'commsPhase4c.test.ts',
	'commsPhase4d.test.ts',
];

const PHASE_FUNCTIONS = [
	'commsPhase1.test.js',
	'commsPhase2.test.js',
	'commsPhase3b.test.js',
	'commsPhase3c.test.js',
	'commsPhase3d.test.js',
	'commsPhase4a.test.js',
	'commsPhase4b.test.js',
	'commsPhase4c.test.js',
];

const ROADMAP_DONE_ROWS = [
	'4.13a',
	'4.15a',
	'4.15b',
	'4.15c',
	'4.15d',
	'4.16a',
	'4.16b',
	'4.16c',
	'4.16d',
];

const TYPED_CHANNEL_IDS = [
	'club_wide',
	'emergency',
	'compliance',
	'staff_internal',
	'sponsor_partner',
];

describe.skip('COMMS-CLOSE — checklist', () => {
	it.skip('1. ROADMAP rows 4.13a + 4.15a–4.16d are Done', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		for (const id of ROADMAP_DONE_ROWS) {
			expect(roadmap).toMatch(new RegExp(`\\| ${id.replace('.', '\\.')} \\| \\*\\*Done\\*\\*`));
		}
		expect(roadmap).toMatch(/COMMS-CLOSE|4\.1–4\.16d Done/);
	});

	it('2. commsPhase guard test files exist (client + functions mirrors)', () => {
		for (const f of PHASE_CLIENT) {
			expect(existsSync(join(ROOT, 'lib/services/__tests__', f))).toBe(true);
		}
		for (const f of PHASE_FUNCTIONS) {
			expect(existsSync(join(REPO, 'functions/__tests__', f))).toBe(true);
		}
	});

	it('3. channelTypes includes Phase 3–4 typed channel ids', () => {
		const src = readFileSync(CHANNEL_TYPES, 'utf8');
		for (const id of TYPED_CHANNEL_IDS) {
			expect(src).toMatch(new RegExp(`['"]?${id}['"]?:`));
		}
	});

	it('4. CommsHubShell renders typed channels for director/parent personas', () => {
		const src = readFileSync(HUB, 'utf8');
		for (const id of TYPED_CHANNEL_IDS) {
			expect(src).toMatch(new RegExp(id));
		}
		expect(src).toMatch(/CommsClubWideChannel/);
		expect(src).toMatch(/CommsEmergencyChannel/);
		expect(src).toMatch(/CommsComplianceChannel/);
		expect(src).toMatch(/CommsStaffInternalChannel/);
		expect(src).toMatch(/CommsSponsorPartnerChannel/);
	});

	it('5. /director?tab=comms has hub CTA only — no embedded DirectorClubBroadcastComposer', () => {
		const src = readFileSync(DIRECTOR, 'utf8');
		expect(src).not.toMatch(/DirectorClubBroadcastComposer/);
		expect(src).toMatch(/channel=club_wide/);
		expect(src).toMatch(/DirectorCommsCompliancePanel/);
	});

	it('6. announcement-family callables return deliveryReport', () => {
		const src = readFileSync(COMMS_JS, 'utf8');
		expect(src).toMatch(/commitTeamBroadcast[\s\S]*deliveryReport/);
		expect(src).toMatch(/safeSportBroadcast[\s\S]*deliveryReport/);
		expect(src).toMatch(/clubSportBroadcast[\s\S]*deliveryReport/);
		expect(src).toMatch(/emergencyClubBroadcast[\s\S]*deliveryReport/);
	});

	it('7. COMMS_CHANNEL_CANON shipped types not marked planned in registry rows', () => {
		const canon = readFileSync(CANON, 'utf8');
		const registry = canon.slice(
			canon.indexOf('## 3. Channel Type Registry'),
			canon.indexOf('## 4. Space hierarchy'),
		);
		for (const id of TYPED_CHANNEL_IDS) {
			expect(registry).toMatch(new RegExp(`\\| \`${id}\`[\\s\\S]*?\\*\\*shipped\\*\\*`));
			expect(registry).not.toMatch(
				new RegExp(`\\| \`${id}\`[\\s\\S]*?\\| \\*\\*planned\\*\\* \\|`),
			);
		}
		expect(canon).toMatch(/12 shipped/);
		expect(canon).not.toMatch(/1 planned.*sponsor_partner/);
	});

	it('Epic 4.15–4.16 callables exported from default codebase', () => {
		const index = readFileSync(INDEX, 'utf8');
		const names = [
			'emergencyClubBroadcast',
			'acknowledgeBroadcast',
			'getBroadcastAckStatus',
			'createSponsorTemplate',
			'approveSponsorTemplate',
			'sendSponsorPartnerDigest',
			'coachProvisionStaffInternal',
		];
		for (const name of names) {
			expect(index).toMatch(new RegExp(`exports\\.${name}\\s*=`));
		}
	});
});
