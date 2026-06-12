/**
 * parentDashboard.layout.test.ts — Slice 4: Parent dashboard liquid regression
 *
 * Guards that the parent dashboard content wrapper uses the Sprint 1.1
 * liquid padding token. The arena is a specialized full-screen component;
 * we assert the token reference rather than requiring a full bento grid.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/parent/dashboard — Liquid Bento (Sprint 1.1)', () => {
	it('parent lounge shell provides --bento-pad-liquid via layout CSS', () => {
		const layout = readFileSync(join(__dirname, '..', '..', '+layout.svelte'), 'utf-8');
		const shellCss = readFileSync(
			join(process.cwd(), 'src/lib/styles/parent-lounge-shell.css'),
			'utf-8',
		);
		expect(layout).toMatch(/parent-lounge-shell/);
		expect(shellCss).toMatch(/--bento-pad-liquid:\s*var\(--parent-lounge-gutter\)/);
	});

	it('uses 12-column liquid bento grid', () => {
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('CoOp arena spans 8 columns and ops panel spans 4', () => {
		expect(src).toMatch(/bento-span-8/);
		expect(src).toMatch(/bento-span-4/);
	});

	it('bounty deploy modal uses Z3 scrim without backdrop blur', () => {
		expect(src).toMatch(/parent-bounty-z3-modal-scrim/);
		expect(src).not.toMatch(/backdrop-filter:\s*blur/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// B4b — ProofReviewQueue mounted on parent dashboard
// ─────────────────────────────────────────────────────────────────────────────
describe('B4b — ProofReviewQueue mounted on parent dashboard', () => {
	it('imports ProofReviewQueue from $lib/components/parent/ProofReviewQueue.svelte', () => {
		expect(src).toMatch(/import ProofReviewQueue from.*ProofReviewQueue\.svelte/);
	});

	it('mounts <ProofReviewQueue> in the template', () => {
		expect(src).toMatch(/<ProofReviewQueue/);
	});

	it('passes householdId to ProofReviewQueue (reuses dashboard resolver, no duplicate)', () => {
		expect(src).toMatch(/householdId={resolvedHouseholdId}/);
	});

	it('passes childNames to ProofReviewQueue', () => {
		expect(src).toMatch(/\{childNames\}|childNames={childNames}/);
	});

	it('resolvedHouseholdId is guarded before mounting ProofReviewQueue (no empty householdId render)', () => {
		// The template must wrap the queue in an {#if resolvedHouseholdId} guard.
		expect(src).toMatch(/#if\s+resolvedHouseholdId/);
	});

	it('does NOT add a second household getDoc call (reuses the existing onMount resolver)', () => {
		// There should be exactly one getDoc call in the page script (the original resolver).
		const getDocMatches = [...src.matchAll(/getDoc\s*\(/g)];
		expect(getDocMatches.length).toBeLessThanOrEqual(1);
	});
});
