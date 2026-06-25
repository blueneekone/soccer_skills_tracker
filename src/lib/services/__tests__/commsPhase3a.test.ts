/**
 * commsPhase3a.test.ts — Epic 4.15a club-wide hub surfacing (Phase 3)
 * Authority: docs/vision/COMMS_CHANNEL_CANON.md §3 club_wide row
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
const CLUB_WIDE = join(ROOT, 'lib/components/comms/CommsClubWideChannel.svelte');
const DIRECTOR_PAGE = join(ROOT, 'routes/(app)/director/+page.svelte');
const COMPOSER = join(ROOT, 'lib/components/director/DirectorClubBroadcastComposer.svelte');
const CHANNEL_TYPES = join(ROOT, 'lib/comms/channelTypes.ts');

describe('commsPhase3a — channelTypes club_wide', () => {
	it('registers club_wide with director/admin post and parent read', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.club_wide).toBeDefined();
		expect(COMMS_CHANNEL_TYPE_REGISTRY.club_wide.id).toBe('club_wide');
		expect(canPersonaPostChannel('club_wide', 'director')).toBe(true);
		expect(canPersonaPostChannel('club_wide', 'coach')).toBe(false);
		expect(canPersonaReadChannel('club_wide', 'parent')).toBe(true);
		expect(canPersonaReadChannel('club_wide', 'director')).toBe(true);
	});

	it('channelTypes.ts exports club_wide type_id', () => {
		const src = readFileSync(CHANNEL_TYPES, 'utf8');
		expect(src).toMatch(/'club_wide'/);
		expect(src).toMatch(/Club-wide broadcast/);
	});
});

describe('commsPhase3a — hub shell club_wide rail', () => {
	it('CommsClubWideChannel exists with compose + parent note', () => {
		expect(existsSync(CLUB_WIDE)).toBe(true);
		const src = readFileSync(CLUB_WIDE, 'utf8');
		expect(src).toMatch(/DirectorClubBroadcastComposer/);
		expect(src).toMatch(/Announcements/);
		expect(src).toMatch(/club_broadcast|Recent club fan-outs/);
	});

	it('CommsHubShell mounts club_wide with deep-link clubId', () => {
		const src = readFileSync(HUB_SHELL, 'utf8');
		expect(src).toMatch(/club_wide/);
		expect(src).toMatch(/CommsClubWideChannel/);
		expect(src).toMatch(/clubId/);
	});
});

describe('commsPhase3a — director comms tab CTA (no embedded composer)', () => {
	it('/director?tab=comms links to hub club_wide — not DirectorClubBroadcastComposer', () => {
		const src = readFileSync(DIRECTOR_PAGE, 'utf8');
		expect(src).not.toMatch(/DirectorClubBroadcastComposer/);
		expect(src).toMatch(/channel=club_wide/);
		expect(src).toMatch(/clubId=/);
		expect(src).toMatch(/DirectorCommsCompliancePanel/);
	});

	it('DirectorClubBroadcastComposer remains available for hub embed', () => {
		const src = readFileSync(COMPOSER, 'utf8');
		expect(src).toMatch(/clubBroadcastMessage/);
		expect(src).toMatch(/DeliveryReceipt/);
	});
});
