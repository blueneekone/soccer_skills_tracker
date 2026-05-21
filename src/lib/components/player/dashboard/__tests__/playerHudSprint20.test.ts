/**
 * playerHudSprint20.test.ts — Sprint 2.0 telemetry deck: hub strip sync, radar + inspector (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const METRICS = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const metricsSrc = existsSync(METRICS) ? readFileSync(METRICS, 'utf-8') : '';
const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 2.0 — VanguardProtocolPanel radar + inspector (no duplicate grid)', () => {
	it('does NOT contain vpp-grid or vpp-card__code (duplicate card grid removed)', () => {
		expect(vppSrc).not.toMatch(/vpp-grid/);
		expect(vppSrc).not.toMatch(/vpp-card__code/);
	});

	it('still renders AttributeRadar', () => {
		expect(vppSrc).toMatch(/AttributeRadar/);
	});

	it('has detail/inspector region', () => {
		expect(vppSrc).toMatch(/vpp-inspector/);
	});
});

describe('Sprint 2.0 — HudMetricsPanel clickable vector strip', () => {
	it('embedded vector cells are interactive (button + selectable class)', () => {
		expect(metricsSrc).toMatch(/type="button"/);
		expect(metricsSrc).toMatch(/hmp-cell--selectable|hmp-cell--selected/);
		expect(metricsSrc).toMatch(/selectedAxis/);
	});

	it('does NOT duplicate lower-panel awaiting footer about prism will populate', () => {
		expect(metricsSrc).not.toMatch(/prism will populate/i);
		expect(metricsSrc).not.toMatch(/your prism/i);
		expect(metricsSrc).toMatch(/AWAITING TELEMETRY/);
	});
});

describe('Sprint 2.0 — shared selectedAxis state in +page.svelte', () => {
	it('binds selectedAxis between HudMetricsPanel and VanguardProtocolPanel', () => {
		expect(pageSrc).toMatch(/selectedVanguardAxis|selectedAxis/);
		expect(pageSrc).toMatch(/HudMetricsPanel[\s\S]*?bind:selectedAxis/);
		expect(pageSrc).toMatch(/VanguardProtocolPanel[\s\S]*?bind:selectedAxis/);
	});
});

describe('Sprint 2.0 — memory capsule compact ghost', () => {
	it('does NOT use large min-h-[140px] dashed empty block', () => {
		expect(pageSrc).not.toMatch(/min-h-\[140px\]/);
	});

	it('uses compact single-line ghost for empty capsule state', () => {
		expect(pageSrc).toMatch(/GHOST PROFILE|Ghost profile/i);
		expect(pageSrc).toMatch(/AWAITING FIRST CAPSULE|awaiting first capsule/i);
	});
});

describe('Sprint 2.0 — AttributeRadar axis selection', () => {
	it('supports optional selectedAxis and onAxisSelect props', () => {
		expect(radarSrc).toMatch(/selectedAxis/);
		expect(radarSrc).toMatch(/onAxisSelect/);
	});
});

describe('Sprint 2.0 — telemetry deck CSS', () => {
	it('player-dashboard-hud.css defines hmp-cell--selected gold accent', () => {
		expect(hudCssSrc).toMatch(/\.hmp-cell--selected/);
		expect(hudCssSrc).toMatch(/#fbbf24/);
	});

	it('player-dashboard-hud.css defines vpp-inspector styling', () => {
		expect(hudCssSrc).toMatch(/\.vpp-inspector/);
	});
});

describe('Sprint 2.0 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint14.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint15.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint16.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint17.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split('/').pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
