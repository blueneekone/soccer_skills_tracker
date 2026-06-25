/**
 * DEMO-ENV-PACK — guards for dev-tenant-reset --reset-demo-stats mode.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const RESET_SCRIPT = join(ROOT, 'scripts/dev-tenant-reset.mjs');
const SEED_LIB = join(ROOT, 'scripts/lib/seed-demo-operative-avatar.mjs');

const resetSrc = readFileSync(RESET_SCRIPT, 'utf8');
const seedSrc = readFileSync(SEED_LIB, 'utf8');

function statsModeBlock() {
	const start = resetSrc.indexOf('const DEMO_STATS_SCOPED_ROOT');
	const end = resetSrc.indexOf('async function provision(');
	expect(start).toBeGreaterThan(-1);
	expect(end).toBeGreaterThan(start);
	return resetSrc.slice(start, end);
}

describe('dev-tenant-reset — --reset-demo-stats', () => {
	it('script exposes --reset-demo-stats flag', () => {
		expect(resetSrc).toMatch(/--reset-demo-stats/);
		expect(resetSrc).toMatch(/RESET_DEMO_STATS/);
	});

	it('stats mode does not call purgeOperatives', () => {
		const block = statsModeBlock();
		expect(block).not.toMatch(/purgeOperatives\(/);
	});

	it('stats mode does not use FULL_WIPE_ROOT', () => {
		const block = statsModeBlock();
		expect(block).not.toMatch(/FULL_WIPE_ROOT/);
	});

	it('stats mode does not empty household playerEmails', () => {
		const block = statsModeBlock();
		expect(block).not.toMatch(/playerEmails:\s*\[\]/);
	});

	it('stats mode preserves PROTECTED_COLLECTIONS', () => {
		const block = statsModeBlock();
		expect(block).toMatch(/PROTECTED_COLLECTIONS/);
		expect(block).toMatch(/consent_records/);
	});

	it('stats mode writes DEMO_STATS_RESET.md artifact', () => {
		expect(resetSrc).toMatch(/DEMO_STATS_RESET\.md/);
	});

	it('seed lib defines demo precomposed bust id', () => {
		expect(seedSrc).toMatch(/precomposed_bust_demo_teen_home/);
		expect(seedSrc).toMatch(/portrait_kit_home/);
	});
});
