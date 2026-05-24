/**
 * playerHudSprint222.test.ts — Sprint 2.22 slice 3 HQ Quick Ops deck (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 2.22 slice 3 — HQ Quick Ops deck', () => {
	it('OperativeQuickOps.svelte exists', () => {
		expect(existsSync(QUICK_OPS)).toBe(true);
	});

	it('+page.svelte imports OperativeQuickOps', () => {
		expect(pageSrc).toMatch(/import OperativeQuickOps from '\$lib\/components\/player\/dashboard\/OperativeQuickOps\.svelte'/);
	});

	it('+page.svelte order: OperativeQuickOps after OperativeHub and before player-analytics-deck', () => {
		const hubClose = pageSrc.indexOf('</OperativeHub>');
		const quickOps = pageSrc.indexOf('<OperativeQuickOps');
		const analytics = pageSrc.indexOf('player-analytics-deck');
		expect(hubClose).toBeGreaterThan(-1);
		expect(quickOps).toBeGreaterThan(-1);
		expect(analytics).toBeGreaterThan(-1);
		expect(quickOps).toBeGreaterThan(hubClose);
		expect(analytics).toBeGreaterThan(quickOps);
	});

	it('OperativeQuickOps contains required route hrefs', () => {
		expect(quickOpsSrc).toMatch(/\/player\/workout/);
		expect(quickOpsSrc).toMatch(/\/stats/);
		const armoryMatches = quickOpsSrc.match(/\/player\/armory/g) ?? [];
		expect(armoryMatches.length).toBe(1);
	});

	it('OperativeQuickOps does NOT contain label Pathway', () => {
		expect(quickOpsSrc).not.toMatch(/label:\s*'Pathway'/);
	});

	it('player-dashboard-hud.css .oqo-deck__grid uses repeat(3, 1fr) at 768px', () => {
		expect(hudCssSrc).toMatch(
			/@media \(min-width: 768px\)[\s\S]*?\.oqo-deck__grid[\s\S]*?repeat\(3,\s*1fr\)/,
		);
	});

	it('player-dashboard-hud.css contains .oqo-deck and .oqo-op', () => {
		expect(hudCssSrc).toMatch(/\.oqo-deck\b/);
		expect(hudCssSrc).toMatch(/\.oqo-op\b/);
	});

	it('OperativeQuickOps does NOT use gold as primary oqo-op border (hero mission owns gold)', () => {
		expect(quickOpsSrc).not.toMatch(/oqo-op[^"']*#fbbf24/);
		expect(quickOpsSrc).not.toMatch(/oqo-op[^"']*--pd-accent-action/);
	});
});
