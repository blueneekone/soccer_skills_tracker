import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { clientToSvg } from '../../../../../lib/utils/canvasPhysics';

describe('Tron War Room SVG Tactical Canvas: Coordinate Mapping', () => {
	it('clientToSvg should correctly map coordinates using native SVG matrix translations if CTM exists', () => {
		// Mock SVGSVGElement
		const mockPoint = { x: 0, y: 0, matrixTransform: (matrix: any) => ({ x: 123, y: 456 }) };
		const mockSVG = {
			createSVGPoint: () => mockPoint,
			getScreenCTM: () => ({
				a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
				inverse: () => ({})
			}),
			getBoundingClientRect: () => ({ left: 10, top: 20, width: 800, height: 450 })
		} as unknown as SVGSVGElement;

		const ev = { clientX: 100, clientY: 200 } as MouseEvent;
		const res = clientToSvg(ev, mockSVG);

		expect(res).toEqual({ x: 123, y: 456 });
	});

	it('clientToSvg should fallback gracefully using bounding rect ratio if CTM fails', () => {
		// Mock SVGSVGElement with failing CTM
		const mockSVG = {
			createSVGPoint: () => { throw new Error('Not supported'); },
			getScreenCTM: () => null,
			getBoundingClientRect: () => ({ left: 100, top: 100, width: 800, height: 450 })
		} as unknown as SVGSVGElement;

		const ev = { clientX: 500, clientY: 325 } as MouseEvent;
		const res = clientToSvg(ev, mockSVG);

		// clientX - left = 500 - 100 = 400. Ratio = 400 / 800 = 0.5. 0.5 * 1600 (VIEW_W) = 800
		// clientY - top = 325 - 100 = 225. Ratio = 225 / 450 = 0.5. 0.5 * 900 (VIEW_H) = 450
		expect(res.x).toBeCloseTo(800);
		expect(res.y).toBeCloseTo(450);
	});
});

describe('Tron War Room SVG Tactical Canvas: Microscopic Aesthetic and Static Structural Audits', () => {
	const components = [
		join(process.cwd(), 'src/lib/components/coach/grid/GridEntity.svelte'),
		join(process.cwd(), 'src/lib/components/coach/grid/GridRadialHub.svelte'),
		join(process.cwd(), 'src/lib/components/coach/grid/GridRoute.svelte')
	];

	it('all player, ball, and control elements inside <text> use native SVG font-size and stroke attributes, forbidding Tailwind/Svelte font-sizing/font-weight classes', () => {
		for (const filepath of components) {
			if (!existsSync(filepath)) continue;
			const code = readFileSync(filepath, 'utf-8');

			// Find all <text ...> tags
			const textTags = code.match(/<text[^>]*>/g) || [];
			for (const tag of textTags) {
				// Must specify native font-size
				expect(tag).toMatch(/font-size=/);

				// Must not contain Tailwind text size or font style/weight utility classes
				expect(tag).not.toMatch(/class=["'][^"']*(?:tw-)?text-(?:xs|sm|base|lg|xl|2xl|\d+px)/);
				expect(tag).not.toMatch(/class=["'][^"']*(?:tw-)?font-(?:normal|medium|semibold|bold|extrabold|mono|sans)/);
			}
		}
	});

	it('enforces flat 90-degree corners (tw-rounded-none / border-radius: 0) on tactical panels and HUD wrappers', () => {
		const cssPath = join(process.cwd(), 'src/lib/styles/coach-tactics-stratagem.css');
		expect(existsSync(cssPath)).toBe(true);
		const cssCode = readFileSync(cssPath, 'utf-8');

		// Check that panel elements enforce zero border radius or flat look
		expect(cssCode).toMatch(/\.coach-tac-z3-pitch\s*\{[^}]*border-radius:\s*0/);
		expect(cssCode).toMatch(/\.coach-tac-z1-well\s*\{[^}]*border-radius:\s*0/);
		expect(cssCode).toMatch(/\.coach-tac-z2-drawer\s*\{[^}]*border-radius:\s*0/);
	});
});
