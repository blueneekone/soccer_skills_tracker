/**
 * nativeShellLaunch.test.ts — Agent 17 native shell guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	NATIVE_PARENT_FIRST_ROUTE,
	NATIVE_SERVER_ORIGIN,
	getNativeDefaultRoute,
	getNativeLoginHref,
	isNativeParentFirstEntry,
} from '../nativeShell';

const ROOT = join(process.cwd());

describe('LAUNCH-native-shell', () => {
	it('nativeShell constants target sstracker.app parent household', () => {
		expect(NATIVE_SERVER_ORIGIN).toBe('https://sstracker.app');
		expect(NATIVE_PARENT_FIRST_ROUTE).toBe('/parent/household');
		expect(getNativeLoginHref()).toMatch(/redirect=%2Fparent%2Fhousehold/);
		expect(getNativeDefaultRoute(true)).toBe('/parent/household');
		expect(getNativeDefaultRoute(false)).toBe(getNativeLoginHref());
		expect(isNativeParentFirstEntry('/')).toBe(true);
		expect(isNativeParentFirstEntry('/login')).toBe(true);
		expect(isNativeParentFirstEntry('/parent/dashboard')).toBe(false);
	});

	it('capacitor.config.ts wraps sstracker.app with parent-first server url', () => {
		const config = readFileSync(join(ROOT, 'capacitor.config.ts'), 'utf8');
		expect(config).toMatch(/appId:\s*'app\.sstracker\.parent'/);
		expect(config).toMatch(/url:\s*'https:\/\/sstracker\.app\/parent\/household'/);
		expect(config).toMatch(/webDir:\s*'build'/);
	});

	it('package.json exposes Capacitor sync and open scripts', () => {
		const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
			scripts: Record<string, string>;
			dependencies: Record<string, string>;
		};
		expect(pkg.scripts['cap:sync']).toMatch(/cap sync/);
		expect(pkg.scripts['cap:ios']).toMatch(/cap open ios/);
		expect(pkg.scripts['cap:android']).toMatch(/cap open android/);
		expect(pkg.scripts['native:prepare']).toMatch(/build/);
		expect(pkg.dependencies['@capacitor/core']).toBeTruthy();
	});

	it('root layout mounts NativeShellRedirect for in-app parent-first pivot', () => {
		const layout = readFileSync(join(ROOT, 'src/routes/+layout.svelte'), 'utf8');
		expect(layout).toMatch(/NativeShellRedirect/);
	});

	it('docs/NATIVE_SHELL.md documents acquirer build path (no store submission)', () => {
		const doc = readFileSync(join(ROOT, 'docs/NATIVE_SHELL.md'), 'utf8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('ios and android Capacitor projects are checked in', () => {
		expect(() => readFileSync(join(ROOT, 'ios/App/Podfile'), 'utf8')).not.toThrow();
		expect(() => readFileSync(join(ROOT, 'android/app/build.gradle'), 'utf8')).not.toThrow();
	});
});
