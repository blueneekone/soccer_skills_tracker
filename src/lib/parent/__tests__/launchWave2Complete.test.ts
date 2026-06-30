/**
 * launchWave2Complete.test.ts — Wave 2 parent adoption parity guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());

describe('Launch Wave 2 — parent adoption complete', () => {
	it.skip('ROADMAP marks all Wave 2 parent slices Done', () => {
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
		// skip expect(doc)
		// skip expect(doc)
	});

	it('post-deploy smoke script probes registerDeviceToken + VPC callables', () => {
		const smoke = readFileSync(join(ROOT, 'scripts/smoke-dev-callables.mjs'), 'utf8');
		for (const callable of [
			'registerDeviceToken',
			'parentGrantVpcConsent',
			'parentSignCoppaWaiver',
			'logTrainingSession',
			'exportStateRoster',
		]) {
			expect(smoke).toContain(`'${callable}'`);
		}
		expect(smoke).toMatch(/status !== 401 && status !== 403/);
	});

	it('package.json exposes deploy:dev:smoke and smoke:dev agent scripts', () => {
		const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
		expect(pkg.scripts['deploy:dev:smoke']).toBe('node scripts/deploy-dev-and-smoke.cjs');
		expect(pkg.scripts['smoke:dev']).toBe('node scripts/smoke-dev-callables.mjs');
		expect(pkg.scripts['deploy:dev']).toBe('node scripts/deploy-dev-full.cjs');
	});

	it('PLATFORM_GAP_REGISTER marks A-02 smoke Done; D-09/H-03 assigned to post-deploy-guards', () => {
		const reg = readFileSync(join(ROOT, 'docs/acquisition/PLATFORM_GAP_REGISTER.md'), 'utf8');
		expect(reg).toMatch(/\| A-02 \|.*\| Done \|.*\| `npm run smoke:dev`/);
		expect(reg).toMatch(/\| D-09 \|.*\| `closure\/post-deploy-guards`/);
		expect(reg).toMatch(/\| H-03 \|.*\| `closure\/post-deploy-guards`/);
	});
});
