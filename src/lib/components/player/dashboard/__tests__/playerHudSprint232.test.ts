/**
 * playerHudSprint232.test.ts — Sprint 2.22 slice 6f Armory Studio dossier hologram (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const ARMORY_STUDIO_TEST = join(
	ROOT,
	'routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts',
);

const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';
const armoryStudioTestSrc = existsSync(ARMORY_STUDIO_TEST)
	? readFileSync(ARMORY_STUDIO_TEST, 'utf-8')
	: '';

/** Dossier preview block inside OperativeLoadoutStudio. */
const dossierBlock = (() => {
	const start = studioSrc.indexOf('ols-dossier-panel');
	const end = studioSrc.indexOf('ols-picker-panel', start);
	return start >= 0 && end > start ? studioSrc.slice(start, end) : '';
})();

describe('Sprint 2.22 slice 6f — Armory Studio dossier hologram', () => {
	it('OperativeLoadoutStudio imports HologramCardShell', () => {
		expect(studioSrc).toMatch(
			/import HologramCardShell from '\$lib\/components\/player\/HologramCardShell\.svelte'/,
		);
	});

	it('dossier preview wraps OperativeIdCardFrame inside HologramCardShell — not ProPlayerCard', () => {
		expect(dossierBlock).toMatch(/HologramCardShell/);
		expect(dossierBlock).toMatch(/OperativeIdCardFrame/);
		expect(dossierBlock).not.toMatch(/ProPlayerCard/);
		expect(dossierBlock).toMatch(/ariaLabel="Operative dossier card"/);
		expect(dossierBlock.indexOf('HologramCardShell')).toBeLessThan(
			dossierBlock.indexOf('OperativeIdCardFrame'),
		);
	});

	it('ProPlayerCard dossierPreview mode hides stats workspace block', () => {
		const proCardPath = join(ROOT, 'lib/components/stats/ProPlayerCard.svelte');
		const proCardSrc = existsSync(proCardPath) ? readFileSync(proCardPath, 'utf-8') : '';
		expect(proCardSrc).toMatch(/dossierPreview\s*=\s*false/);
		expect(proCardSrc).toMatch(/\{#if !dossierPreview\}/);
		expect(proCardSrc).toMatch(/pro-card-outer--dossier-preview/);
	});

	it('HologramCardShell is scoped to dossier row — not unified picker panel', () => {
		const pickerBlock = studioSrc.slice(studioSrc.indexOf('ols-picker-panel'));
		expect(pickerBlock).not.toMatch(/HologramCardShell/);
	});

	it('OperativeLoadoutStudio contains Sprint 2.22 slice 6f CSS block', () => {
		expect(studioSrc).toMatch(/Sprint 2\.22 slice 6f — Armory Studio dossier hologram/);
		expect(studioSrc).toMatch(/\.ols-dossier-card :global\(\.hcs-wrapper\)/);
	});

	it('ols-dossier-panel uses void-friendly framing — not matte pd-panel fill', () => {
		const panelBlock =
			studioSrc.match(/\.ols-dossier-panel\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(panelBlock).toMatch(/background:\s*transparent/);
		expect(panelBlock).not.toMatch(/var\(--pd-panel/);
	});
});

describe('Sprint 2.22 slice 6f — armoryLoadoutStudio layout regression guards', () => {
	it('armoryLoadoutStudio.test.ts still guards dossier hero row layout', () => {
		expect(armoryStudioTestSrc).toMatch(/ols-dossier-panel bento-span-12/);
		expect(armoryStudioTestSrc).toMatch(/ols-picker-panel bento-span-12/);
	});

	it('OperativeLoadoutStudio preserves bento grid layout guards from armory tests', () => {
		expect(studioSrc).toMatch(/ols-dossier-panel bento-span-12/);
		expect(studioSrc).toMatch(/ols-picker-panel bento-span-12/);
		expect(studioSrc).toMatch(/\.ols-grid\s*>\s*:global\(\*\)[\s\S]*?min-width:\s*0/);
	});
});
