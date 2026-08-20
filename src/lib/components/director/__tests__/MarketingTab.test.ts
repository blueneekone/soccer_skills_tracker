import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const TAB = join(ROOT, 'lib/components/director/MarketingTab.svelte');

describe('MarketingTab', () => {
	it('should render the marketing tab headers', () => {
		const src = readFileSync(TAB, 'utf8');
		expect(src).toMatch(/Public storefront/);
		expect(src).toMatch(/Conversion tracking \(pixels\)/);
	});
});
