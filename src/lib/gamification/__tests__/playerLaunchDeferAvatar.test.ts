/**
 * playerLaunchDeferAvatar.test.ts — Sprint LAUNCH-defer-avatar (doc + gate guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const REF_DIR = join(ROOT, '..', 'docs/vision/references');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const DEFERRED_RULE = join(ROOT, '..', '.cursor/rules/avatar-builder-deferred.mdc');

describe('Sprint LAUNCH-defer-avatar — reference hierarchy', () => {
	it('docs/vision/references/README.md exists', () => {
		expect(existsSync(join(REF_DIR, 'README.md'))).toBe(true);
	});

	it('docs/vision/references/ui/README.md exists', () => {
		expect(existsSync(join(REF_DIR, 'ui/README.md'))).toBe(true);
	});

	it('character/README.md exists with DEFERRED banner', () => {
		const readme = readFileSync(join(REF_DIR, 'character/README.md'), 'utf-8');
		expect(readme).toMatch(/DEFERRED/i);
		expect(readme).toMatch(/post-launch/i);
	});

	it('.cursor/rules/avatar-builder-deferred.mdc exists', () => {
		expect(existsSync(DEFERRED_RULE)).toBe(true);
		const rule = readFileSync(DEFERRED_RULE, 'utf-8');
		expect(rule).toMatch(/references\/ui/);
		expect(rule).toMatch(/references\/character/);
	});
});

describe('Sprint LAUNCH-defer-avatar — ROADMAP gates', () => {
	const roadmap = readFileSync(ROADMAP, 'utf-8');

	it('ROADMAP marks LAUNCH-defer-avatar Done', () => {
		expect(roadmap).toMatch(/\|\s*\*\*LAUNCH-defer-avatar\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/LAUNCH-defer-avatar Done/);
	});

	it('Epic 4.1 not blocked by 3.5m-gate prerequisite', () => {
		expect(roadmap).toMatch(/Epic\s*4\.1\+?\s*unblocked/i);
		expect(roadmap).not.toMatch(/Epic\s*4\.1\+\s*blocked\s+until\s+3\.5m-gate/i);
		expect(roadmap).toMatch(/3\.5m-gate.*Deferred\s*\(post-launch/i);
	});

	it('ROADMAP documents playerLaunchDeferAvatar test', () => {
		expect(roadmap).toMatch(/playerLaunchDeferAvatar\.test\.ts/);
	});
});
