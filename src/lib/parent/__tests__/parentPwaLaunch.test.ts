/**
 * parentPwaLaunch.test.ts — LAUNCH-parent-pwa guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());

describe('LAUNCH-parent-pwa', () => {
	it('InstallPrompt uses SSTracker branding', () => {
		const src = readFileSync(
			join(ROOT, 'src/lib/components/pwa/InstallPrompt.svelte'),
			'utf8',
		);
		expect(src).toMatch(/INSTALL SSTRACKER/);
		expect(src).not.toMatch(/INSTALL VANGUARD/);
	});

	it('app layout mounts InstallPrompt for PWA install path', () => {
		const layout = readFileSync(
			join(ROOT, 'src/routes/(app)/+layout.svelte'),
			'utf8',
		);
		expect(layout).toMatch(/InstallPrompt/);
		expect(layout).toMatch(/ParentFcmPrompt/);
	});

	it('parent shell nav links Settings and Messages', () => {
		const layout = readFileSync(
			join(ROOT, 'src/routes/(app)/parent/+layout.svelte'),
			'utf8',
		);
		expect(layout).toMatch(/href: '\/settings'/);
		expect(layout).toMatch(/href: '\/messages'/);
	});
});
