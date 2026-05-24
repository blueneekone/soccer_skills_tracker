/**
 * playerHudSprint218.test.ts — Sprint 2.18 Material orchestration (Tier A → HQ)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const VFX = join(ROOT, 'components/VanguardVFX.svelte');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const OPERATIVE_HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const ACTIVE_BOUNTIES = join(ROOT, 'lib/components/player/dashboard/ActiveBounties.svelte');
const STATS_PAGE = join(ROOT, 'routes/(app)/stats/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const vfxSrc = existsSync(VFX) ? readFileSync(VFX, 'utf-8') : '';
const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const hubSrc = existsSync(OPERATIVE_HUB) ? readFileSync(OPERATIVE_HUB, 'utf-8') : '';
const bountiesSrc = existsSync(ACTIVE_BOUNTIES) ? readFileSync(ACTIVE_BOUNTIES, 'utf-8') : '';
const statsPageSrc = existsSync(STATS_PAGE) ? readFileSync(STATS_PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.18 — shared pdDataBloom filter', () => {
	it('VanguardVFX defines id="pdDataBloom"', () => {
		expect(vfxSrc).toMatch(/id="pdDataBloom"/);
		expect(vfxSrc).toMatch(/pdDataBloom/);
	});

	it('AttributeRadar references url(#pdDataBloom) on polygon and/or circles', () => {
		expect(radarSrc).toMatch(/url\(#pdDataBloom\)/);
		expect(radarSrc).toMatch(/filter="url\(#pdDataBloom\)"/);
	});
});

describe('Sprint 2.18 — spatial canvas restored in dossier mode', () => {
	it('dossier grid opacity increased above 0.30', () => {
		expect(shellCssSrc).toMatch(
			/ps-ambient__grid[\s\S]*opacity:\s*0\.(3[8-9]|[4-9])/,
		);
	});

	it('teal glow restored on ps-ambient__glow--a for dossier (not black wash)', () => {
		expect(shellCssSrc).toMatch(
			/ps-ambient__glow--a[\s\S]*rgba\(20,\s*184,\s*166/,
		);
		expect(shellCssSrc).not.toMatch(
			/ps-root[^\{]*dossier[^\}]*ps-ambient__glow--a[\s\S]*rgba\(0,\s*0,\s*0,\s*0\.4\)/,
		);
	});
});

describe('Sprint 2.18 — canvas scanlines atmosphere only', () => {
	it('player-shell or player-dossier contains scanline repeating-linear-gradient on canvas layer', () => {
		const combined = shellCssSrc + dossierCssSrc;
		expect(combined).toMatch(/repeating-linear-gradient/);
		expect(combined).toMatch(/ps-ambient::after|pd-chrome-root::before/);
	});

	it('OperativeHub and ActiveBounties do NOT add scanline classes', () => {
		expect(hubSrc).not.toMatch(/scanline/i);
		expect(bountiesSrc).not.toMatch(/scanline/i);
	});
});

describe('Sprint 2.18 — emissive edge tokens', () => {
	it('player-dossier.css defines emissive tokens', () => {
		expect(dossierCssSrc).toMatch(/--pd-emissive-teal:/);
		expect(dossierCssSrc).toMatch(/--pd-emissive-gold:/);
	});

	it('quest-hero--premium or pd-strap--premium uses emissive token or edge glow', () => {
		const combined = missionsCssSrc + dossierCssSrc + hudCssSrc;
		expect(combined).toMatch(/quest-hero--premium[\s\S]*(--pd-emissive-gold|emissive)/);
		expect(combined).toMatch(/pd-strap--premium[\s\S]*(--pd-emissive-teal|emissive)/);
	});
});

describe('Sprint 2.18 — glass scope guard', () => {
	it('operative-hub pd-surface-premium does NOT have backdrop-filter blur', () => {
		const hubBlock = hudCssSrc.match(/\.operative-hub\.pd-surface-premium[\s\S]*?\}/)?.[0] ?? '';
		expect(hubBlock).not.toMatch(/backdrop-filter:\s*blur/);
	});

	it('vpp-chart--premium MAY have backdrop-filter on radar well', () => {
		expect(hudCssSrc).toMatch(/\.vpp-chart--premium[\s\S]*backdrop-filter:\s*blur/);
	});
});

describe('Sprint 2.18 — Stats/HQ VPP parity', () => {
	it('stats player path uses VanguardProtocolPanel', () => {
		expect(statsPageSrc).toMatch(/import VanguardProtocolPanel/);
		expect(statsPageSrc).toMatch(/\{#if isPlayerRole\}[\s\S]*?VanguardProtocolPanel/);
	});

	it('AttributeRadar bloom is shared single component for both routes', () => {
		expect(radarSrc).toMatch(/url\(#pdDataBloom\)/);
	});
});

describe('Sprint 2.18 — ROADMAP sprint pointer', () => {
	it('marks 2.18 Done and premium track complete through 2.19', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.18\s*\|\s*Done\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*2\.19\s*\|\s*Done/i);
		expect(roadmapSrc).toMatch(/playerHudSprint218\.test\.ts/);
	});
});
