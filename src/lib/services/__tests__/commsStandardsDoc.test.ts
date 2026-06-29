/**
 * commsStandardsDoc.test.ts — COMMS-STANDARDS-DOC drift prevention guards
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..', '..');
const STANDARDS = join(REPO, 'docs/vision/COMMS_PLATFORM_STANDARDS.md');
const UX_NAV = join(REPO, 'docs/vision/COMMS_UX_NAV_SPEC.md');
const CALENDAR = join(REPO, 'docs/vision/COMMS_CALENDAR_INTEGRATION.md');
const CANON = join(REPO, 'docs/vision/COMMS_CHANNEL_CANON.md');
const HUB = join(REPO, 'docs/vision/COMMS_HUB.md');
const ROADMAP = join(REPO, 'ROADMAP.md');

const STANDARDS_POLICY_STRINGS = [
	'SafeSport-native club workspace',
	'not Discord for minors',
	'Space → Category → Modality',
	'Parent Circle',
	'parents post only',
	'parent_coach_dm',
	'bilateral',
	'includeAdOnParentDms',
	'disclosure banner',
	'parent_voice_session',
	'NO minors',
	'not a hub chat rail',
	'deliveryReport',
	'Drift prevention checklist',
	'No coach→minor 1:1 DM',
	'No user-created channels',
];

describe('COMMS-STANDARDS-DOC — authority files exist', () => {
	it('COMMS_PLATFORM_STANDARDS.md exists', () => {
		expect(existsSync(STANDARDS)).toBe(true);
	});

	it('COMMS_UX_NAV_SPEC.md exists', () => {
		expect(existsSync(UX_NAV)).toBe(true);
	});

	it('COMMS_CALENDAR_INTEGRATION.md exists', () => {
		expect(existsSync(CALENDAR)).toBe(true);
	});
});

describe('COMMS-STANDARDS-DOC — locked policy strings', () => {
	it('COMMS_PLATFORM_STANDARDS.md contains key policy strings', () => {
		const doc = readFileSync(STANDARDS, 'utf8');
		const lower = doc.toLowerCase();
		for (const phrase of STANDARDS_POLICY_STRINGS) {
			expect(lower, `missing: ${phrase}`).toContain(phrase.toLowerCase());
		}
	});

	it('COMMS_UX_NAV_SPEC.md defines five hub categories', () => {
		const doc = readFileSync(UX_NAV, 'utf8');
		expect(doc).toContain('Families');
		expect(doc).toContain('Game day');
		expect(doc).toContain('Logistics');
		expect(doc).toContain('Staff');
		expect(doc).toContain('Club ops');
	});

	it('COMMS_CALENDAR_INTEGRATION.md documents event fan-out', () => {
		const doc = readFileSync(CALENDAR, 'utf8');
		expect(doc).toContain('deliveryReport');
		expect(doc).toMatch(/\.ics|ics/i);
	});
});

describe('COMMS-STANDARDS-DOC — canon sync', () => {
	it('COMMS_CHANNEL_CANON includes parent_coach_dm and parent_voice_session', () => {
		const doc = readFileSync(CANON, 'utf8');
		expect(doc).toContain('parent_coach_dm');
		expect(doc).toContain('parent_voice_session');
		expect(doc).toContain('Parent Circle');
	});

	it('parent_lounge row is parents-post-only per standards', () => {
		const doc = readFileSync(CANON, 'utf8');
		expect(doc).toMatch(/parent_lounge.*Parent Circle/s);
		expect(doc).toMatch(/parents post only|parents-post-only|\*\*parent\*\*/i);
	});
});

describe('COMMS-STANDARDS-DOC — ROADMAP row', () => {
	it('ROADMAP tracks COMMS-STANDARDS-DOC sprint', () => {
		const doc = readFileSync(ROADMAP, 'utf8');
		expect(doc).toContain('COMMS-STANDARDS-DOC');
	});
});

describe('COMMS-DOCS-SYNC — coach Team Ops comms embed', () => {
	it('COMMS_HUB documents CoachTeamCommsPanel or CommsWorkspaceShell for coach team comms', () => {
		const doc = readFileSync(HUB, 'utf8');
		expect(
			doc.includes('CoachTeamCommsPanel') || doc.includes('CommsWorkspaceShell'),
			'COMMS_HUB must name CoachTeamCommsPanel or CommsWorkspaceShell'
		).toBe(true);
		expect(doc).toMatch(/\/coach\/logistics\?tab=comms/);
	});

	it('COMMS_HUB does not require MessagesTab on /coach/logistics', () => {
		const doc = readFileSync(HUB, 'utf8');
		expect(doc).not.toMatch(/\/coach\/logistics.*MessagesTab|MessagesTab.*\/coach\/logistics/s);
	});
});
