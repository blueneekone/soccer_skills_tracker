import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const TABS = join(__dirname, '../../../../../lib/components/admin/GlobalUsersRbacTabs.svelte');
const src = readFileSync(TABS, 'utf-8');

describe('GlobalUsersRbacTabs — Component Standardization (Sprint 0.2)', () => {
	it('uses .tab-nav component for sub-navigation', () => {
		expect(src).toMatch(/class="[^"]*tab-nav[^"]*"/);
	});

	it('legacy .gu-pills class is completely purged', () => {
		expect(src).not.toMatch(/gu-pills/);
	});
});
