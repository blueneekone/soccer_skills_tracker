/**
 * liquidBento.css.test.ts — Slice 0: Failing-first guard rail
 *
 * Reads src/app.css as raw text and asserts that every token, primitive,
 * and carve-out comment required by Sprint 1.1 is present before any route
 * refactor begins. Tests here turn red; Slice 1 turns them green.
 *
 * Pattern mirrors noPhosphor.test.ts — zero additional deps, runs in the
 * existing `vitest run` (environment: node) pipeline.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const APP_CSS = join(__dirname, '..', '..', '..', 'app.css');
const css = readFileSync(APP_CSS, 'utf-8');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns the raw text of the first CSS rule block that matches selector. */
function extractBlock(source: string, selector: string): string | null {
	// Escape dots and dashes for use in a RegExp
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// Match selector followed by { ... } — handles multi-line blocks
	const re = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 's');
	const m = source.match(re);
	return m ? m[1] : null;
}

/** True if a CSS block for selector exists anywhere in source. */
function hasBlock(source: string, selector: string): boolean {
	return extractBlock(source, selector) !== null;
}

// ─── Token assertions ────────────────────────────────────────────────────────

describe('Sprint 1.1 — :root token declarations', () => {
	it('declares --shadow-liquid with both an outer drop and an inner inset layer', () => {
		expect(css).toMatch(/--shadow-liquid:/);
		// Must contain an inset shadow (inner highlight) and a non-inset drop
		const tokenStart = css.indexOf('--shadow-liquid:');
		const tokenEnd = css.indexOf(';', tokenStart);
		const tokenValue = css.slice(tokenStart, tokenEnd);
		expect(tokenValue).toMatch(/inset/);
		expect(tokenValue.indexOf('inset')).toBeGreaterThan(-1);
		// Also needs a non-inset outer drop (starts with a number, e.g. "0 ")
		expect(tokenValue).toMatch(/0\s+\d/);
	});

	it('declares --bento-gap-liquid with the exact clamp(20px, 4vw, 32px) value', () => {
		expect(css).toMatch(/--bento-gap-liquid\s*:\s*clamp\(20px,\s*4vw,\s*32px\)/);
	});

	it('declares --bento-pad-liquid with a clamp() value', () => {
		expect(css).toMatch(/--bento-pad-liquid\s*:\s*clamp\(/);
	});
});

// ─── .bento-grid--liquid primitive ──────────────────────────────────────────

describe('Sprint 1.1 — .bento-grid--liquid primitive', () => {
	it('has a .bento-grid--liquid rule block', () => {
		expect(hasBlock(css, '.bento-grid--liquid')).toBe(true);
	});

	it('sets grid-auto-flow: dense inside .bento-grid--liquid', () => {
		const block = extractBlock(css, '.bento-grid--liquid');
		expect(block).not.toBeNull();
		expect(block).toMatch(/grid-auto-flow\s*:\s*dense/);
	});

	it('uses var(--bento-gap-liquid) for gap inside .bento-grid--liquid', () => {
		const block = extractBlock(css, '.bento-grid--liquid');
		expect(block).not.toBeNull();
		expect(block).toMatch(/gap\s*:\s*var\(--bento-gap-liquid\)/);
	});

	it('declares bento interior spacing utilities tied to gap tokens', () => {
		expect(css).toMatch(/\.bento-mb-md\s*\{[^}]*margin-bottom:\s*var\(--bento-gap-md\)/s);
		expect(css).toMatch(/\.bento-gap-md\s*\{[^}]*gap:\s*var\(--bento-gap-md\)/s);
		expect(css).toMatch(/\.bento-stack-md\s*\{[^}]*gap:\s*var\(--bento-gap-md\)/s);
	});
});

// ─── .vanguard-surface--liquid primitive ────────────────────────────────────

describe('Sprint 1.1 — .vanguard-surface--liquid (opaque card modifier)', () => {
	it('has a .vanguard-surface--liquid rule block', () => {
		expect(hasBlock(css, '.vanguard-surface--liquid')).toBe(true);
	});

	it('applies var(--shadow-liquid) as box-shadow', () => {
		const block = extractBlock(css, '.vanguard-surface--liquid');
		expect(block).not.toBeNull();
		expect(block).toMatch(/box-shadow\s*:\s*var\(--shadow-liquid\)/);
	});

	it('MUST NOT apply backdrop-filter — carve-out regression guard', () => {
		const block = extractBlock(css, '.vanguard-surface--liquid');
		expect(block).not.toBeNull();
		// backdrop-filter must not appear inside this specific rule block
		expect(block).not.toMatch(/backdrop-filter/);
	});
});

// ─── .vanguard-surface--hero-liquid primitive ────────────────────────────────

describe('Sprint 1.1 — .vanguard-surface--hero-liquid (glass hero layer)', () => {
	it('has a .vanguard-surface--hero-liquid rule block', () => {
		expect(hasBlock(css, '.vanguard-surface--hero-liquid')).toBe(true);
	});

	it('applies backdrop-filter with blur and saturate()', () => {
		const block = extractBlock(css, '.vanguard-surface--hero-liquid');
		expect(block).not.toBeNull();
		expect(block).toMatch(/backdrop-filter\s*:/);
		expect(block).toMatch(/saturate\(/);
	});

	it('applies -webkit-backdrop-filter for Safari support', () => {
		const block = extractBlock(css, '.vanguard-surface--hero-liquid');
		expect(block).not.toBeNull();
		expect(block).toMatch(/-webkit-backdrop-filter\s*:/);
	});
});

// ─── Carve-out comment update ────────────────────────────────────────────────

describe('Sprint 1.1 — GLASSMORPHISM CARVE-OUT comment is updated', () => {
	it('lists --hero-liquid (or hero-liquid) as an allowed glass surface', () => {
		expect(css).toMatch(/hero-liquid/);
	});

	it('retains the GLASSMORPHISM CARVE-OUT heading so existing rules remain documented', () => {
		expect(css).toMatch(/GLASSMORPHISM CARVE-OUT/);
	});
});
