import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('daily-intel', () => {
	it('uses strict Vanguard Trinity components', () => {
		expect(src).toMatch(/tw-bg-\[#000000\]/);
	});
});
