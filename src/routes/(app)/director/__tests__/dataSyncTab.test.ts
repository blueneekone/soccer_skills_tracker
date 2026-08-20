import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('Director OS Data Sync Tab Support', () => {
	it('director/club-management includes sync tab and mounts VampireImporter', () => {
		const arena = readFileSync(
			join(ROOT, 'src/routes/(app)/director/club-management/ClubManagementArena.svelte'),
			'utf-8',
		);
		const engine = readFileSync(
			join(ROOT, 'src/routes/(app)/director/club-management/ClubManagementEngine.svelte.ts'),
			'utf-8',
		);
		expect(engine).toMatch(/'sync'/);
		expect(arena).toMatch(/VampireImporter/);
		expect(arena).toMatch(/engine\.activeTab === 'sync'/);
	});
});
