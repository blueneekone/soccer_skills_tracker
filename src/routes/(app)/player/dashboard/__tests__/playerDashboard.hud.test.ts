/**
 * playerDashboard.hud.test.ts — Sprint 1.4: Gaming HUD regression guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const SHELL = join(__dirname, '../../../../../lib/components/shell/PlayerShell.svelte');
const PLAYER_PRIMARY_NAV = join(__dirname, '../../../../../lib/player/shell/playerPrimaryNav.ts');
const HUD_CONTAINER = join(__dirname, '../../../../../lib/components/hud/HUDContainer.svelte');
const HUD_CSS = join(__dirname, '../../../../../lib/styles/player-dashboard-hud.css');
const IDENTITY = join(__dirname, '../../../../../lib/components/player/dashboard/IdentityBentoModule.svelte');
const src = readFileSync(PAGE, 'utf-8');
const shellSrc = readFileSync(SHELL, 'utf-8');
const playerNavSrc = readFileSync(PLAYER_PRIMARY_NAV, 'utf-8');
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

	it('uses IdentityBentoModule inside OperativeHub (not legacy lobby-hud-bar)', () => {
		expect(src).toMatch(/IdentityBentoModule/);
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

	it('uses IdentityBentoModule for operative identity (not OperativeAvatarPreview circles on page)', () => {
		expect(src).toMatch(/IdentityBentoModule/);
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

	it('maps palette through dossier 60-30-10 CSS variables', () => {
		const vpp = readFileSync(
			join(__dirname, '../../../../../lib/components/player/dashboard/VanguardProtocolPanel.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/var\(--pd-bg/);
		expect(hudCssSrc).toMatch(/--color-structural:\s*#64748b/);
		expect(vpp).toMatch(/var\(--pd-accent/);
	});

	it('uses fluid bento gap token (clamp via --bento-gap-liquid)', () => {
		expect(containerSrc + hudCssSrc + src).toMatch(/var\(--bento-gap-liquid/);
	});

	it('memory capsules live inside player-analytics-void (Sprint 2.4)', () => {
		expect(src).toMatch(/player-analytics-void/);
		expect(src).toMatch(/player-capsules-strip/);
		expect(src).toMatch(/lobby-capsules-h|lobby-capsule-ghost|MemoryCapsuleArena/);
		const voidIdx = src.indexOf('player-analytics-void');
		const vppIdx = src.indexOf('<VanguardProtocolPanel');
		const capsulesIdx = src.indexOf('player-capsules-strip');
		expect(voidIdx).toBeGreaterThan(-1);
		expect(vppIdx).toBeGreaterThan(voidIdx);
		expect(capsulesIdx).toBeGreaterThan(vppIdx);
	});

	it('removes inline quick-nav from combat card (rail owns global navigation)', () => {
		expect(src).not.toMatch(/lobby-quick-nav/);
	});
});

describe('/player/dashboard — NAV-IMPL mobile glance band', () => {
	it('renders pd-hq-glance-band with LVL, Rank, Streak, bounty count', () => {
		expect(src).toMatch(/pd-hq-glance-band/);
		expect(src).toMatch(/LVL/);
		expect(src).toMatch(/Rank/);
		expect(src).toMatch(/Streak/);
		expect(src).toMatch(/coachBountyCount/);
		expect(hudCssSrc).toMatch(/\.pd-hq-glance-band/);
		expect(hudCssSrc).toMatch(/max-width:\s*1023\.98px/);
	});
});

describe('PlayerShell — Option A field nav + desk rail', () => {
	it('imports playerPrimaryNav and renders field bar + More sheet on mobile', () => {
		expect(shellSrc).toMatch(/playerPrimaryNav/);
		expect(shellSrc).toMatch(/ps-field-bar/);
		expect(shellSrc).toMatch(/ps-more-sheet/);
		expect(playerNavSrc).toMatch(/label: 'HQ'/);
		expect(playerNavSrc).toMatch(/label: 'Train'/);
		expect(playerNavSrc).toMatch(/label: 'Stats'/);
	});

	it('does not render duplicate global top bar (avatar, bell, disconnect on shell chrome)', () => {
		expect(shellSrc).not.toMatch(/ps-topbar/);
		expect(shellSrc).not.toMatch(/comm\.bell/);
	});

	it('marks HQ with hub-active state on dashboard routes', () => {
		expect(shellSrc).toMatch(/ps-field-bar__tab--hub-active|ps-rail__link--hub-active/);
		expect(shellSrc).toMatch(/isPlayerHubActive/);
	});
});

describe('IdentityBentoModule — identity badge layout', () => {
	it('uses avatar ring or holo face with streak/XP stat cells', () => {
		expect(identitySrc).toMatch(/HudAvatarRing/);
		expect(identitySrc).toMatch(/ibm-holo-face|ibm-metrics/);
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
		expect(hub).toMatch(/operative-hub__main[\s\S]*?bento-span-8/);
		expect(hub).toMatch(/operative-hub__missions[\s\S]*?bento-span-4/);
		expect(hub).not.toMatch(/operative-hub__quests/);
		expect(hub).toMatch(/min-width:\s*0/);
		expect(hub).toMatch(/bento-grid--12col/);
	});
});
