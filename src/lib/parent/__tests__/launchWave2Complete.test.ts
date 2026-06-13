/**
 * launchWave2Complete.test.ts — Wave 2 parent adoption parity guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());

describe('Launch Wave 2 — parent adoption complete', () => {
	it('ROADMAP marks all Wave 2 parent slices Done', () => {
		const roadmap = readFileSync(join(ROOT, 'ROADMAP.md'), 'utf8');
		for (const slice of [
			'LAUNCH-parent-ical',
			'LAUNCH-parent-push',
			'LAUNCH-parent-week',
			'LAUNCH-parent-pwa',
		]) {
			expect(roadmap).toMatch(new RegExp(`\\*\\*${slice}\\*\\* \\| \\*\\*Done\\*\\*`));
		}
	});

	it('competitive assessment marks Wave 2 Done and gate partial', () => {
		const doc = readFileSync(
			join(ROOT, 'docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md'),
			'utf8',
		);
		expect(doc).toMatch(/Wave 2 — Parent adoption parity — \*\*Done\*\*/);
		expect(doc).toMatch(/Launch functional gate.*Partial/s);
	});
});
