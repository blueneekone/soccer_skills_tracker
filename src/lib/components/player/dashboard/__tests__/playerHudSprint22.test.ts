/**
 * playerHudSprint22.test.ts — Sprint 2.2 motion polish, gold avatar palette, mono typography (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HAR = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const harSrc = existsSync(HAR) ? readFileSync(HAR, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 2.2 — gold-forward player HUD avatar', () => {
	it('HudAvatarRing or IdentityBentoModule uses gold stroke (#fbbf24 or --color-accent)', () => {
		const combined = `${harSrc}\n${ibmSrc}`;
		expect(combined).toMatch(/#fbbf24|var\(--color-accent/);
	});

	it('player-dashboard-hud.css scopes gold avatar border under .player-hud-root', () => {
		expect(hudCssSrc).toMatch(/\.player-hud-root[\s\S]*?hud-avatar-ring__avatar-wrap[\s\S]*?#fbbf24|var\(--color-accent/);
	});
});

describe('Sprint 2.2 — VanguardProtocolPanel mono typography', () => {
	it('.vpp-lede uses Geist Mono', () => {
		expect(vppSrc).toMatch(/\.vpp-lede[\s\S]*?Geist Mono/);
	});
});

describe('Sprint 2.2 — reduced-motion guards', () => {
	it('player-dashboard-hud.css disables ibm-streak-ring-pulse and quest-status-pulse under prefers-reduced-motion', () => {
		expect(hudCssSrc).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
		expect(hudCssSrc).toMatch(/ibm-streak-at-risk[\s\S]*?animation:\s*none\s*!important/);
		expect(hudCssSrc).toMatch(/quest-row__status[\s\S]*?animation:\s*none\s*!important/);
	});
});

describe('Sprint 2.2 — subtle motion micro-interactions', () => {
	it('hud-stat-cell or ibm-metric-chip has border-color transition on hover', () => {
		const hasStatCellHover =
			/\.hud-stat-cell[\s\S]*?transition:\s*border-color\s+0\.15s/.test(hudCssSrc) &&
			/\.hud-stat-cell:hover/.test(hudCssSrc);
		const hasChipHover =
			/\.ibm-metric-chip[\s\S]*?transition:\s*border-color\s+0\.15s/.test(hudCssSrc) &&
			/\.ibm-metric-chip:hover/.test(hudCssSrc);
		expect(hasStatCellHover || hasChipHover).toBe(true);
	});

	it('hmp-cell--selectable has hover/selection transition', () => {
		expect(hudCssSrc).toMatch(/\.hmp-cell--selectable[\s\S]*?transition:/);
	});

	it('quest-row--embedded has gold-tint hover background', () => {
		expect(hudCssSrc).toMatch(/\.quest-row--embedded:hover[\s\S]*?#fbbf24/);
	});
});

describe('Sprint 2.2 — Sprint 2.1.1 guard (no PlayerCommandCenter on page)', () => {
	it('+page.svelte does NOT import PlayerCommandCenter', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
	});
});

describe('Sprint 2.2 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint14.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint15.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint16.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint17.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint21.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
