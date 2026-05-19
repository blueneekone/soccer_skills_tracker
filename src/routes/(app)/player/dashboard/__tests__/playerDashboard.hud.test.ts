/**
 * playerDashboard.hud.test.ts — Sprint 1.4: Gaming HUD regression guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const SHELL = join(__dirname, '../../../../../lib/components/shell/PlayerShell.svelte');
const src = readFileSync(PAGE, 'utf-8');
const shellSrc = readFileSync(SHELL, 'utf-8');

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
		expect(src).toMatch(/var\(--bento-gap-liquid\)/);
	});

	it('Self comparison section spans full bento width', () => {
		expect(src).toMatch(/lobby-capsules-section/);
		expect(src).toMatch(/bento-span-12[^"]*lobby-capsules-section|lobby-capsules-section[^"]*bento-span-12/);
	});

	it('removes inline quick-nav from combat card (Command Center owns secondary links)', () => {
		expect(src).not.toMatch(/lobby-quick-nav/);
	});
});

describe('PlayerShell — redundant HUD ring removed (Sprint 1.4)', () => {
	it('does not scale a duplicate LevelProgressRing in the top bar', () => {
		expect(shellSrc).not.toMatch(/transform:\s*scale\(0\.375\)/);
	});

	it('exposes Command Center drawer trigger', () => {
		expect(shellSrc).toMatch(/PlayerCommandCenter/);
	});
});
