/**
 * playerHudSprint21.test.ts — Sprint 2.1 identity metric chips, chamfer CTAs, palette pass (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const CHIP = join(ROOT, 'lib/components/player/dashboard/HudMetricChip.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const RING = join(ROOT, 'lib/components/hud/HudSeededRingCanvas.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const chipSrc = existsSync(CHIP) ? readFileSync(CHIP, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const ringSrc = existsSync(RING) ? readFileSync(RING, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 2.1 — HudMetricChip component', () => {
	it('HudMetricChip.svelte exists in player/dashboard/', () => {
		expect(existsSync(CHIP)).toBe(true);
	});

	it('delegates to HudStatCell (Sprint 2.3 — ringless compat wrapper)', () => {
		expect(chipSrc).toMatch(/HudStatCell/);
		expect(chipSrc).not.toMatch(/HudSeededRingCanvas/);
	});

	it('HudStatCell uses hud-stat-cell class and chamfer clip-path', () => {
		const statCell = join(ROOT, 'lib/components/player/dashboard/HudStatCell.svelte');
		const statCellSrc = existsSync(statCell) ? readFileSync(statCell, 'utf-8') : '';
		expect(statCellSrc).toMatch(/hud-stat-cell/);
		expect(statCellSrc).toMatch(/clip-path:\s*polygon/);
	});
});

describe('Sprint 2.1 — IdentityBentoModule metric chips', () => {
	it('imports HudStatCell for streak/XP metrics (Sprint 2.3 supersedes direct HudMetricChip)', () => {
		expect(ibmSrc).toMatch(/import HudStatCell/);
		expect(ibmSrc).toMatch(/<HudStatCell/);
	});

	it('does NOT pass showCenter={true} to HudSeededRingCanvas for streak/XP pills', () => {
		expect(ibmSrc).not.toMatch(/showCenter=\{true\}/);
		const pillRingBlocks = ibmSrc.match(/ibm-pill[\s\S]*?HudSeededRingCanvas/g);
		expect(pillRingBlocks).toBeNull();
	});

	it('uses ibm-metrics row instead of ibm-pills for metric chips', () => {
		expect(ibmSrc).toMatch(/ibm-metrics/);
		expect(ibmSrc).toMatch(/variant="streak"/);
		expect(ibmSrc).toMatch(/variant="xp"/);
	});

	it('has chamfer CTA for profile setup (ibm-cta, not underline-only link)', () => {
		expect(ibmSrc).toMatch(/ibm-cta/);
		expect(ibmSrc).toMatch(/ibm-cta--setup/);
		expect(ibmSrc).not.toMatch(/class="ibm-setup"/);
	});

	it('embedded identity must NOT contain cmd-center-trigger (shell nav only)', () => {
		expect(ibmSrc).not.toMatch(/cmd-center-trigger/);
		expect(ibmSrc).not.toMatch(/onOpenCommandCenter/);
	});
});

describe('Sprint 2.1 — HudSeededRingCanvas small-ring guard', () => {
	it('suppresses center text when size < 40', () => {
		expect(ringSrc).toMatch(/size\s*<\s*40|effectiveShowCenter/);
	});
});

describe('Sprint 2.1 — player-dashboard-hud.css palette', () => {
	it('defines ibm-metric-chip styles with structural border and gold accent', () => {
		expect(hudCssSrc).toMatch(/\.ibm-metric-chip/);
		expect(hudCssSrc).toMatch(/#334155/);
		expect(hudCssSrc).toMatch(/#fbbf24/);
	});

	it('defines ibm-cta chamfer button styles', () => {
		expect(hudCssSrc).toMatch(/\.ibm-cta/);
	});
});

describe('Sprint 2.1 — capsule section header mono pass', () => {
	it('lobby-eyebrow and/or lobby-capsules-h use tw-font-mono pattern', () => {
		expect(pageSrc).toMatch(/lobby-eyebrow[\s\S]*?tw-font-mono|tw-font-mono[\s\S]*?lobby-eyebrow/);
		expect(pageSrc).toMatch(
			/lobby-capsules-h|id="lobby-capsules-h"[\s\S]*?tw-font-mono|tw-font-mono[\s\S]*?lobby-capsules-h/,
		);
	});
});

describe('Sprint 2.1 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint14.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint15.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint16.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint17.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split('/').pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
