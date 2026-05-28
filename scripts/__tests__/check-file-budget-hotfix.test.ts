/**
 * Hotfix guards — ActiveBounties extract + blank-line normalization (prebuild unblock).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

function blankLineRatio(content: string): number {
	const lines = content.split('\n');
	const total = lines.length;
	if (total === 0) return 0;
	const blank = lines.filter((l) => l.trim() === '').length;
	return blank / total;
}

describe('check-file-budget hotfix — ActiveBounties', () => {
	const bountiesPath = join(ROOT, 'src/lib/components/hud/ActiveBounties.svelte');
	const cssPath = join(ROOT, 'src/lib/styles/active-bounties.css');

	it('active-bounties.css exists', () => {
		expect(existsSync(cssPath)).toBe(true);
	});

	it('ActiveBounties.svelte line count ≤ 850', () => {
		const lines = readFileSync(bountiesPath, 'utf-8').split('\n').length;
		expect(lines).toBeLessThanOrEqual(850);
	});

	it('ActiveBounties references extracted stylesheet', () => {
		const src = readFileSync(bountiesPath, 'utf-8');
		expect(src).toMatch(/active-bounties\.css/);
		expect(src).not.toMatch(/<style>/);
	});

	it('active-bounties.css retains quest-log panel rules', () => {
		const css = readFileSync(cssPath, 'utf-8');
		expect(css).toMatch(/\.quest-log-panel\b/);
		expect(css).toMatch(/\.quest-row__cmd--claim/);
	});
});

describe('check-file-budget hotfix — blankLineRatio', () => {
	it('OperativeCeremoniesPanel.svelte blankLineRatio ≤ 0.40', () => {
		const path = join(ROOT, 'src/lib/components/player/OperativeCeremoniesPanel.svelte');
		const ratio = blankLineRatio(readFileSync(path, 'utf-8'));
		expect(ratio).toBeLessThanOrEqual(0.4);
	});

	it('loadoutSchema.ts blankLineRatio ≤ 0.40', () => {
		const path = join(ROOT, 'src/lib/gamification/loadoutSchema.ts');
		const ratio = blankLineRatio(readFileSync(path, 'utf-8'));
		expect(ratio).toBeLessThanOrEqual(0.4);
	});
});
