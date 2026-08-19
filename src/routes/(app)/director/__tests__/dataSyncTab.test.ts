import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('Director OS Data Sync Tab Support', () => {
	it('director/+page.svelte includes sync in VALID_DIR_TABS and mounts VampireImporter', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/director/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/'sync'/);
		expect(page).toMatch(/VampireImporter/);
		expect(page).toMatch(/activeTab === 'sync'/);
	});

	it('director/dashboard/+page.svelte includes sync in VALID_DIR_TABS and mounts VampireImporter', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/director/dashboard/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/'sync'/);
		expect(page).toMatch(/VampireImporter/);
		expect(page).toMatch(/activeTab === 'sync'/);
	});
});
