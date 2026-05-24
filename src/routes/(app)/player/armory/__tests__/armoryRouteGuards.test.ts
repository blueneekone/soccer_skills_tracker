/**
 * armoryRouteGuards.test.ts — Sprint 3.1.4 Armory 500 root-cause guards
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PAGE = join(ROOT, '+page.svelte');
const ARMORY = join(ROOT, '..', '..', '..', '..', 'lib', 'gamification', 'armory.js');
const TRAJECTORY = join(
	ROOT,
	'..',
	'..',
	'..',
	'..',
	'lib',
	'states',
	'TrajectoryEngine.svelte.ts',
);

const pageSrc = readFileSync(PAGE, 'utf-8');
const armorySrc = readFileSync(ARMORY, 'utf-8');
const trajectorySrc = readFileSync(TRAJECTORY, 'utf-8');

describe('/player/armory — Sprint 3.1.4 route guards', () => {
	it('lazy-loads OperativeLoadoutStudio via dynamic import (not static import)', () => {
		expect(pageSrc).not.toMatch(/import OperativeLoadoutStudio from/);
		expect(pageSrc).toMatch(
			/import\s*\(\s*['"]\$lib\/components\/player\/OperativeLoadoutStudio\.svelte['"]\s*\)/,
		);
		expect(pageSrc).toMatch(/armoryWorkspace === 'studio'/);
	});

	it('wraps TrajectoryEngine.connect in try/catch and gates capsule UI on engine.error', () => {
		expect(pageSrc).toMatch(/trajectoryEngine\.connect\(emailKey\)/);
		expect(pageSrc).toMatch(/catch \(err\)/);
		expect(pageSrc).toMatch(/!trajectoryEngine\.error/);
	});

	it('armory.js does not top-level import loadoutSchema (breaks circular init)', () => {
		expect(armorySrc).not.toMatch(/^import .*loadoutSchema/m);
		expect(armorySrc).toMatch(/await import\('\.\/loadoutSchema\.js'\)/);
	});

	it('TrajectoryEngine.connect no-ops when !browser || !userKey', () => {
		expect(trajectorySrc).toMatch(/if \(!browser \|\| !userKey\) return;/);
	});
});
