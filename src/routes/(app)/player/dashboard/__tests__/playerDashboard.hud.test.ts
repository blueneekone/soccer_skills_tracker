/**
 * playerDashboard.hud.test.ts — Sprint 1.4: Gaming HUD regression guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const SHELL = join(__dirname, '../../../../../lib/components/shell/PlayerShell.svelte');
const HUD_CONTAINER = join(__dirname, '../../../../../lib/components/hud/HUDContainer.svelte');
const HUD_CSS = join(__dirname, '../../../../../lib/styles/player-dashboard-hud.css');
const IDENTITY = join(__dirname, '../../../../../lib/components/player/dashboard/IdentityBentoModule.svelte');
const src = readFileSync(PAGE, 'utf-8');
const shellSrc = readFileSync(SHELL, 'utf-8');
const containerSrc = readFileSync(HUD_CONTAINER, 'utf-8');
const hudCssSrc = readFileSync(HUD_CSS, 'utf-8');
const identitySrc = readFileSync(IDENTITY, 'utf-8');

describe('/player/dashboard — Sprint 1.4 HUD overhaul', () => {
	it('does not render vestigial Tactical Ops / mission log', () => {
		expect(src).not.toMatch(/Tactical ops/i);
		expect(src).not.toMatch(/MISSION LOG/i);
		expect(src).not.toMatch(/tactical_deployments/);
		expect(src).not.toMatch(/MOCK_CARTRIDGES/);
	});

	it('uses the unified PlayerHudHeader instead of lobby-hud-bar tiles', () => {
		expect(src).toMatch(/PlayerHudHeader/);
		expect(src).not.toMatch(/lobby-hud-bar/);
	});

	it('wraps profile and quest log in OperativeHub above Vanguard Protocol', () => {
		const hubIdx = src.indexOf('<OperativeHub');
		const vppIdx = src.indexOf('<VanguardProtocolPanel');
		expect(hubIdx).toBeGreaterThan(-1);
		expect(src).toMatch(/embedded/);
		expect(vppIdx).toBeGreaterThan(hubIdx);
	});

	it('uses terminal bracket commands in quest log (not rounded CTAs)', () => {
		const bounties = readFileSync(
			join(__dirname, '../../../../../lib/components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		expect(bounties).toMatch(/questTerminalCmd/);
		expect(bounties).toMatch(/quest-row__cmd/);
		expect(bounties).toMatch(/ACTIVE DIRECTIVES/);
		expect(bounties).toMatch(/quest-row__status/);
		expect(bounties).not.toMatch(/quest-row__cta/);
	});

	it('uses UID-seeded UidAvatar via PlayerHudHeader (not OperativeAvatarPreview circles)', () => {
		expect(src).toMatch(/PlayerHudHeader/);
		expect(src).not.toMatch(/OperativeAvatarPreview/);
		expect(src).not.toMatch(/Quick profile/i);
		expect(src).not.toMatch(/player-hud-casefile/);
	});

	it('uses VanguardProtocolPanel with six-axis prism (not FIFA sport-attribute schema)', () => {
		expect(src).toMatch(/VanguardProtocolPanel/);
		expect(src).not.toMatch(/combatHudRows/);
		expect(src).not.toMatch(/getAttributeSchemaForSport/);
		expect(src).not.toMatch(/Pace', 'Shooting', 'Passing/);
	});

	it('maps palette through dynamic 60-30-10 CSS variables', () => {
		const vpp = readFileSync(
			join(__dirname, '../../../../../lib/components/player/dashboard/VanguardProtocolPanel.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/var\(--color-dominant/);
		expect(src).toMatch(/var\(--color-structural/);
		expect(vpp).toMatch(/var\(--color-accent/);
	});

	it('uses fluid bento gap token (clamp via --bento-gap-liquid)', () => {
		expect(containerSrc + hudCssSrc + src).toMatch(/var\(--bento-gap-liquid/);
	});

	it('Self comparison section spans full bento width', () => {
		expect(src).toMatch(/lobby-capsules-section/);
		expect(src).toMatch(/bento-span-12[^"]*lobby-capsules-section|lobby-capsules-section[^"]*bento-span-12/);
	});

	it('removes inline quick-nav from combat card (rail owns global navigation)', () => {
		expect(src).not.toMatch(/lobby-quick-nav/);
	});
});

describe('PlayerShell — rail-only navigation', () => {
	it('renders icon-only 80px rail as single nav source', () => {
		expect(shellSrc).toMatch(/<nav class="ps-rail"/);
		expect(shellSrc).toMatch(/label: 'HQ'/);
		expect(shellSrc).not.toMatch(/ps-bottom-nav__label/);
	});

	it('does not render duplicate global top bar (avatar, bell, disconnect)', () => {
		expect(shellSrc).not.toMatch(/ps-topbar/);
		expect(shellSrc).not.toMatch(/DISCONNECT/);
		expect(shellSrc).not.toMatch(/comm\.bell/);
	});

	it('marks HQ with hub-active state on dashboard routes', () => {
		expect(shellSrc).toMatch(/ps-rail__link--hub-active/);
		expect(shellSrc).toMatch(/isHubActive/);
	});
});

describe('IdentityBentoModule — identity badge layout', () => {
	it('uses avatar ring with streak/XP stat cells instead of three mini rings', () => {
		expect(identitySrc).toMatch(/HudAvatarRing/);
		expect(identitySrc).toMatch(/HudStatCell|HudMetricChip|ibm-metrics/);
		expect(identitySrc).not.toMatch(/HudMiniRing/);
	});

	it('flattens embedded profile chrome for OperativeHub (Rule 2)', () => {
		expect(identitySrc).toMatch(/ibm-root--embedded/);
		expect(identitySrc).toMatch(/background:\s*transparent/);
		const hub = readFileSync(
			join(__dirname, '../../../../../lib/components/player/dashboard/OperativeHub.svelte'),
			'utf-8',
		);
		expect(hub).toMatch(/bento-span-4/);
		expect(hub).toMatch(/bento-span-8/);
		expect(hub).toMatch(/min-width:\s*0/);
		expect(hub).toMatch(/bento-grid--12col/);
	});
});
