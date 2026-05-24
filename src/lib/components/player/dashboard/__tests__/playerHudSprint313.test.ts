/**
 * playerHudSprint313.test.ts — Sprint 3.1.3 recovery + CSS existence guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const APP_CSS = join(ROOT, 'app.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');

const appCssSrc = existsSync(APP_CSS) ? readFileSync(APP_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';

describe('Sprint 3.1.3 — bento-span-5 in app.css', () => {
	it('defines .bento-span-5 { grid-column: span 5; }', () => {
		expect(appCssSrc).toMatch(/\.bento-span-5\s*\{\s*grid-column:\s*span\s+5;\s*\}/);
	});

	it('mobile collapse includes bento-span-5', () => {
		expect(appCssSrc).toMatch(
			/@media \(max-width: 63\.99rem\)[\s\S]*?\.bento-span-5[\s\S]*?grid-column:\s*1\s*\/\s*-1/,
		);
	});
});

describe('Sprint 3.1.3 — quest-hero__cta self-contained gold styles', () => {
	it('hero CTA block has border, padding, chamfer — not .ibm-cta scoped', () => {
		const block =
			hudCssSrc.match(/\.player-hud-root \.quest-hero__cta\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(block).toMatch(/border:\s*1px|border:/);
		expect(block).toMatch(/padding:/);
		expect(block).toMatch(/clip-path:\s*polygon/);
		expect(block).not.toMatch(/\.ibm-cta/);
	});
});

describe('Sprint 3.1.3 — init modal primary CTA (global overlay)', () => {
	it('uses .init-modal__cta--primary without .player-dossier-root ancestor', () => {
		const hasGlobalPrimary = /\.init-modal__cta--primary\s*\{/.test(hudCssSrc);
		const pageHasDossierOnModal =
			/init-modal[\s\S]{0,200}player-dossier-root|player-dossier-root[\s\S]{0,200}init-modal/.test(
				pageSrc,
			);
		expect(hasGlobalPrimary || pageHasDossierOnModal).toBe(true);
		expect(hudCssSrc).not.toMatch(
			/\.player-dossier-root\s+\.init-modal__cta--primary\s*\{/,
		);
	});

	it('primary rule has gold background and dark text', () => {
		const primaryBlock =
			hudCssSrc.match(/\.init-modal__cta--primary\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(primaryBlock).toMatch(/background:\s*var\(--pd-accent-action|#fbbf24/);
		expect(primaryBlock).toMatch(/color:\s*#05050a/);
	});
});

describe('Sprint 3.1.3 — cross-file bento span guard', () => {
	const spansUsed = [...studioSrc.matchAll(/bento-span-(\d+)/g)].map((m) => Number(m[1]));
	const required = [3, 4, 5].filter((n) => spansUsed.includes(n));

	for (const n of required) {
		it(`app.css defines .bento-span-${n} { grid-column: span ${n}`, () => {
			expect(appCssSrc).toMatch(
				new RegExp(`\\.bento-span-${n}\\s*\\{\\s*grid-column:\\s*span\\s+${n};\\s*\\}`),
			);
		});
	}
});
