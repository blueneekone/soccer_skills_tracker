/**
 * commsNav20.test.ts — COMMS-NAV-2.0 hub navigation drift guards
 * Authority: docs/vision/COMMS_UX_NAV_SPEC.md · COMMS_PLATFORM_STANDARDS.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	COMMS_NAV_CATEGORIES,
	COMMS_NAV_CATEGORY_ORDER,
	COMMS_NAV_MAIN_TAB_IDS,
	groupChannelsByCategory,
	getChannelNavCategory,
	parseCommsSpaceParam,
	formatCommsSpaceParam,
	resolveActiveSpace,
} from '$lib/comms/commsNavCategories.js';

const ROOT = join(__dirname, '..', '..', '..');
const REPO = join(ROOT, '..');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const NAV = join(ROOT, 'lib/comms/commsNavCategories.ts');
const SKINS = join(ROOT, 'lib/styles/comms-hub-persona-skins.css');
const UX_NAV = join(REPO, 'docs/vision/COMMS_UX_NAV_SPEC.md');
const ROADMAP = join(REPO, 'ROADMAP.md');

const hubSrc = readFileSync(HUB, 'utf8');
const navSrc = readFileSync(NAV, 'utf8');
const skinsSrc = readFileSync(SKINS, 'utf8');
const uxNavDoc = readFileSync(UX_NAV, 'utf8');

describe('COMMS-NAV-2.0 — commsNavCategories module', () => {
	it('defines five hub categories in spec order', () => {
		expect(COMMS_NAV_CATEGORY_ORDER).toEqual([
			'families',
			'game_day',
			'logistics',
			'staff',
			'club_ops',
		]);
		for (const id of COMMS_NAV_CATEGORY_ORDER) {
			expect(COMMS_NAV_CATEGORIES[id].label).toBeTruthy();
		}
	});

	it('maps Families category channel types per COMMS_UX_NAV_SPEC §2', () => {
		expect(COMMS_NAV_CATEGORIES.families.channelTypeIds).toEqual(
			expect.arrayContaining([
				'announcements',
				'parent_lounge',
				'household',
				'parent_coach_dm',
				'parent_voice_session',
			]),
		);
	});

	it('maps Club ops category — sponsor_partner not under Families', () => {
		expect(getChannelNavCategory('sponsor_partner')).toBe('club_ops');
		expect(getChannelNavCategory('parent_lounge')).toBe('families');
		expect(getChannelNavCategory('parent_coach_dm')).toBe('families');
	});

	it('outbox is a main-pane tab id — not a sidebar category', () => {
		expect(COMMS_NAV_MAIN_TAB_IDS).toContain('outbox');
		expect(getChannelNavCategory('outbox')).toBeNull();
	});

	it('groupChannelsByCategory excludes outbox and sorts alphabetically', () => {
		const groups = groupChannelsByCategory([
			{ id: 'registration', label: 'Registration' },
			{ id: 'team_logistics', label: 'Team logistics' },
			{ id: 'outbox', label: 'Outbox' },
		]);
		expect(groups.some((g) => g.channels.some((c) => c.id === 'outbox'))).toBe(false);
		const logistics = groups.find((g) => g.category.id === 'logistics');
		expect(logistics?.channels.map((c) => c.id)).toEqual(['registration', 'team_logistics']);
	});

	it('parseCommsSpaceParam supports ?space=team:{teamId} deep links', () => {
		expect(parseCommsSpaceParam('team:alpha-u12')).toEqual({
			kind: 'team',
			id: 'alpha-u12',
			label: 'alpha-u12',
		});
		expect(formatCommsSpaceParam({ kind: 'club', id: 'club-1' })).toBe('club:club-1');
		expect(
			resolveActiveSpace(
				[
					{ kind: 'team', id: 't1', label: 'Team A' },
					{ kind: 'household', id: 'h1', label: 'Household' },
				],
				'household:h1',
			),
		).toEqual({ kind: 'household', id: 'h1', label: 'Household' });
	});
});

describe('COMMS-NAV-2.0 — CommsHubShell nav 2.0 structure', () => {
	it('imports commsNavCategories and renders pivot-derived space context + categorized sidebar', () => {
		expect(existsSync(NAV)).toBe(true);
		expect(hubSrc).toMatch(/commsNavCategories/);
		expect(hubSrc).toMatch(/groupChannelsByCategory/);
		expect(hubSrc).toMatch(/comms-hub-shell__space-context/);
		expect(hubSrc).toMatch(/comms-hub-shell__category/);
		expect(hubSrc).toMatch(/resolveActiveSpace/);
		expect(hubSrc).not.toMatch(/comms-space-select/);
		expect(hubSrc).not.toMatch(/iconChar/);
	});

	it('mounts outbox as main-pane tab — not sidebar category row', () => {
		expect(hubSrc).toMatch(/comms-hub-shell__main-tabs/);
		expect(hubSrc).toMatch(/CommsOutbox/);
		expect(navSrc).toMatch(/COMMS_NAV_MAIN_TAB_IDS/);
	});

	it('preserves lazy channel mount — one active panel branch', () => {
		expect(hubSrc).toMatch(/\{#if activeChannel === 'outbox'/);
		expect(hubSrc).toMatch(/\{:else if activeChannel === 'announcements'\}/);
		expect(hubSrc).toMatch(/\{:else if activeChannel === 'parent_coach_dm'/);
		expect(hubSrc).not.toMatch(/\{#each sidebarChannels/);
	});

	it('uses Parent Circle label from registry — not legacy Parent Lounge rail copy', () => {
		expect(hubSrc).toMatch(/COMMS_CHANNEL_TYPE_REGISTRY\.parent_lounge\.label/);
		expect(hubSrc).not.toMatch(/label: 'Parent Lounge'/);
	});

	it('typed channel panels remain wired for director/parent personas', () => {
		for (const id of [
			'club_wide',
			'emergency',
			'compliance',
			'staff_internal',
			'team_logistics',
			'parent_coach_dm',
			'parent_voice_session',
		]) {
			expect(hubSrc).toMatch(new RegExp(id));
		}
	});
});

describe('COMMS-NAV-2.0 — persona skins + canon sync', () => {
	it('comms-hub-persona-skins.css defines nav 2.0 rail tokens', () => {
		expect(skinsSrc).toMatch(/comms-hub-shell__category/);
		expect(skinsSrc).toMatch(/comms-hub-shell__main-tabs/);
	});

	it('COMMS_UX_NAV_SPEC documents five categories referenced by module labels', () => {
		for (const id of COMMS_NAV_CATEGORY_ORDER) {
			expect(uxNavDoc).toContain(COMMS_NAV_CATEGORIES[id].label);
		}
	});

	it('ROADMAP tracks COMMS-NAV-2.0 sprint row', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toContain('COMMS-NAV-2.0');
	});
});
