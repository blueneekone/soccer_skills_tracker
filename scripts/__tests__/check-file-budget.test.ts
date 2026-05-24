/**
 * check-file-budget.test.ts — Sprint 3.1.3 CI guard smoke tests
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'check-file-budget.mjs');

const scriptSrc = existsSync(SCRIPT) ? readFileSync(SCRIPT, 'utf-8') : '';

describe('Sprint 3.1.3 — check-file-budget script', () => {
	it('script file exists', () => {
		expect(existsSync(SCRIPT)).toBe(true);
	});

	it('OperativeLoadoutStudio grandfather ceiling is 700', () => {
		expect(scriptSrc).toMatch(
			/OperativeLoadoutStudio\.svelte['"],\s*700/,
		);
	});

	it('documents blankLineRatio check in script', () => {
		expect(scriptSrc).toMatch(/blankLineRatio/);
		expect(scriptSrc).toMatch(/BLANK_RATIO_MAX/);
		expect(scriptSrc).toMatch(/0\.40/);
	});
});
