import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('commitGritAward', () => {
	const source = readFileSync(resolve('src/lib/services/writes.svelte.ts'), 'utf8');

	it('calls triggerGritAwardUpdate Cloud Function instead of client batch', () => {
		expect(source).toContain('triggerGritAwardUpdate');
		expect(source).toContain('httpsCallable');
		expect(source).not.toMatch(/getDocs\s*\(/);
		expect(source).not.toMatch(/PATHS\.gritAwards/);
	});

	it('maps GRIT_DAILY_CAP from callable errors', () => {
		expect(source).toContain("throw new Error('GRIT_DAILY_CAP')");
	});
});
