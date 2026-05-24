/**
 * playerHudSprint223.test.ts — Sprint 2.22 slice 4 HQ pathway preview (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const PREVIEW = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/OperativePathway.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const previewSrc = existsSync(PREVIEW) ? readFileSync(PREVIEW, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 2.22 slice 4 — HQ pathway preview', () => {
	it('OperativePathwayPreview.svelte exists', () => {
		expect(existsSync(PREVIEW)).toBe(true);
	});

	it('OperativePathway.svelte contains compact prop and compactTierWindow', () => {
		expect(pathwaySrc).toMatch(/compact\s*=\s*false/);
		expect(pathwaySrc).toMatch(/function compactTierWindow/);
	});

	it('OperativePathway.svelte has opp-root--compact class when compact', () => {
		expect(pathwaySrc).toMatch(/opp-root--compact/);
		expect(pathwaySrc).toMatch(/class:opp-root--compact=\{compact\}/);
	});

	it('+page.svelte imports OperativePathwayPreview and passes level={osLevel}', () => {
		expect(pageSrc).toMatch(
			/import OperativePathwayPreview from '\$lib\/components\/player\/dashboard\/OperativePathwayPreview\.svelte'/,
		);
		expect(pageSrc).toMatch(/<OperativePathwayPreview[^>]*level=\{osLevel\}/);
	});

	it('+page.svelte order: OperativePathwayPreview AFTER OperativeQuickOps and BEFORE analytics void', () => {
		const quickOps = pageSrc.indexOf('<OperativeQuickOps');
		const preview = pageSrc.indexOf('<OperativePathwayPreview');
		const analytics = pageSrc.indexOf('player-analytics-void');
		expect(quickOps).toBeGreaterThan(-1);
		expect(preview).toBeGreaterThan(-1);
		expect(analytics).toBeGreaterThan(-1);
		expect(preview).toBeGreaterThan(quickOps);
		expect(analytics).toBeGreaterThan(preview);
	});

	it('player-dashboard-hud.css contains .opp-preview and .opp-root--compact', () => {
		expect(hudCssSrc).toMatch(/\.opp-preview\b/);
		expect(hudCssSrc).toMatch(/\.opp-root--compact\b/);
	});

	it('compact current label uses teal only — not gold accent', () => {
		expect(pathwaySrc).toMatch(/opp-active-label/);
		expect(pathwaySrc).toMatch(/tealCurrent \? 'ACTIVE' : 'NOW'/);
		expect(pathwaySrc).toMatch(/const tealCurrent = \$derived\(compact \|\| hqTealCurrent\)/);
		expect(hudCssSrc).toMatch(
			/\.opp-root--compact\s+\.opp-node--current-dossier[\s\S]*--pd-accent-data/,
		);
		expect(hudCssSrc).toMatch(/\.opp-root--compact\s+\.opp-active-label[\s\S]*?--pd-accent-data/);
		expect(hudCssSrc).toMatch(
			/\.opp-root--compact\s+\.opp-node--current-dossier\s*\{[\s\S]*?--pd-accent-data/,
		);
		expect(hudCssSrc).not.toMatch(
			/\.opp-root--compact\s+\.opp-node--current-dossier\s*\{[^}]*--pd-accent-action/,
		);
	});

	it('Armory +page.svelte does NOT import OperativePathway (HQ owns pathway — Sprint 2.22 slice 4b)', () => {
		expect(armorySrc).not.toMatch(/import OperativePathway from/);
	});

	it('Armory +page.svelte does NOT contain qa-pathway-shell', () => {
		expect(armorySrc).not.toMatch(/qa-pathway-shell/);
	});

	it('OperativePathwayPreview does NOT use expand/collapse toggle — not Armory link', () => {
		expect(previewSrc).not.toMatch(/expanded\s*=\s*\$state/);
		expect(previewSrc).not.toMatch(/opp-preview__toggle/);
		expect(previewSrc).not.toMatch(/Expand pathway/);
		expect(previewSrc).not.toMatch(/Collapse pathway/);
		expect(previewSrc).not.toMatch(/aria-expanded/);
		expect(previewSrc).not.toMatch(/compact=\{true\}/);
		expect(previewSrc).not.toMatch(/resolve\('\/player\/armory'\)/);
	});
});

describe('Sprint 2.22 slice 4c — HQ native pathway scroll', () => {
	it('OperativePathwayPreview does NOT contain expand/collapse UX', () => {
		expect(previewSrc).not.toMatch(/expanded\s*=\s*\$state/);
		expect(previewSrc).not.toMatch(/opp-preview__toggle/);
		expect(previewSrc).not.toMatch(/Expand pathway/);
		expect(previewSrc).not.toMatch(/Collapse pathway/);
	});

	it('OperativePathwayPreview passes HQ native scroll props', () => {
		expect(previewSrc).toMatch(/hideScrollHud=\{true\}/);
		expect(previewSrc).toMatch(/scrollToCurrent=\{true\}/);
		expect(previewSrc).toMatch(/hqTealCurrent=\{true\}/);
	});

	it('OperativePathwayPreview renders compact={false} only', () => {
		expect(previewSrc).toMatch(/compact=\{false\}/);
		expect(previewSrc).not.toMatch(/compact=\{true\}/);
	});

	it('OperativePathway.svelte contains hideScrollHud and scrollToCurrent props', () => {
		expect(pathwaySrc).toMatch(/hideScrollHud\s*=\s*false/);
		expect(pathwaySrc).toMatch(/scrollToCurrent\s*=\s*false/);
		expect(pathwaySrc).toMatch(/hqTealCurrent\s*=\s*false/);
	});

	it('OperativePathway.svelte auto-centers current tier via data-opp-current', () => {
		expect(pathwaySrc).toMatch(/data-opp-current/);
		expect(pathwaySrc).toMatch(/scrollLeft \+= delta/);
	});

	it('OperativePathway.svelte hideScrollHud guards opp-hud render', () => {
		expect(pathwaySrc).toMatch(/!compact && !hideScrollHud/);
	});

	it('OperativePathwayPreview section title shows Mission rewards pathway once', () => {
		expect(previewSrc).toMatch(/Mission rewards pathway/);
		expect(previewSrc).toMatch(/opp-preview__meta/);
		expect(previewSrc).toMatch(/aria-label="Mission rewards pathway"/);
	});

	it('player-dashboard-hud.css contains HQ native scroll styles', () => {
		expect(hudCssSrc).toMatch(/opp-root--hq-current/);
		expect(hudCssSrc).not.toMatch(/\.opp-preview__toggle\b/);
	});
});

describe('Sprint 2.22 slice 6e — pathway void shell', () => {
	it('OperativePathwayPreview uses opp-preview--void', () => {
		expect(previewSrc).toMatch(/opp-preview--void/);
	});

	it('OperativePathwayPreview does NOT use pd-page-panel matte slab', () => {
		expect(previewSrc).not.toMatch(/pd-page-panel/);
	});

	it('HQ order unchanged: Quick Ops → Pathway → analytics void', () => {
		const quickOps = pageSrc.indexOf('<OperativeQuickOps');
		const preview = pageSrc.indexOf('<OperativePathwayPreview');
		const analytics = pageSrc.indexOf('player-analytics-void');
		expect(quickOps).toBeGreaterThan(-1);
		expect(preview).toBeGreaterThan(-1);
		expect(analytics).toBeGreaterThan(-1);
		expect(preview).toBeGreaterThan(quickOps);
		expect(analytics).toBeGreaterThan(preview);
	});
});
