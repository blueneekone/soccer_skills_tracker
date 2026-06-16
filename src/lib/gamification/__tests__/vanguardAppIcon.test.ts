/**
 * vanguardAppIcon.test.ts — Gold Command PWA icon, favicon, splash, push icon guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const STATIC = join(ROOT, '..', 'static');

describe('Vanguard app icon — static assets', () => {
	const icon192 = join(STATIC, 'icons', 'icon-192.png');
	const icon512 = join(STATIC, 'icons', 'icon-512.png');

	it('icon-192.png and icon-512.png exist and are >1KB', () => {
		for (const path of [icon192, icon512]) {
			expect(existsSync(path)).toBe(true);
			expect(statSync(path).size).toBeGreaterThan(1024);
		}
	});

	it('favicon.svg and favicon.ico exist', () => {
		expect(existsSync(join(STATIC, 'icons', 'favicon.svg'))).toBe(true);
		expect(existsSync(join(STATIC, 'icons', 'favicon.ico'))).toBe(true);
	});

	it('manifest.json references Vanguard icon paths and void theme tokens', () => {
		const manifest = readFileSync(join(STATIC, 'manifest.json'), 'utf-8');
		expect(manifest).toMatch(/icons\/icon-192\.png/);
		expect(manifest).toMatch(/icons\/icon-512\.png/);
		expect(manifest).toMatch(/"background_color":\s*"#020202"/);
		expect(manifest).toMatch(/"theme_color":\s*"#020202"/);
		expect(manifest).toMatch(/"short_name":\s*"VANGUARD"/);
	});
});

describe('Vanguard app icon — HTML wiring', () => {
	it('app.html references favicon.svg and theme-color #020202', () => {
		const html = readFileSync(join(ROOT, 'app.html'), 'utf-8');
		expect(html).toMatch(/rel="icon"[^>]*favicon\.svg/);
		expect(html).toMatch(/theme-color" content="#020202"/);
	});
});

describe('Vanguard app icon — auth splash rebrand', () => {
	it('+layout.svelte auth splash CSS rejects legacy teal/purple cyber palette', () => {
		const layout = readFileSync(join(ROOT, 'routes', '(app)', '+layout.svelte'), 'utf-8');
		const styleStart = layout.indexOf('<style>');
		const styleEnd = layout.indexOf('</style>', styleStart);
		expect(styleStart).toBeGreaterThan(-1);
		expect(styleEnd).toBeGreaterThan(styleStart);
		const splashCss = layout.slice(styleStart, styleEnd);
		expect(splashCss).not.toMatch(/#14b8a6/i);
		expect(splashCss).not.toMatch(/#a855f7/i);
		expect(layout).toMatch(/VanguardAppMark/);
		expect(layout).toMatch(/auth-splash__label">VANGUARD/);
		expect(splashCss).toMatch(/#fbbf24/);
	});
});

describe('Vanguard app icon — push notification unification', () => {
	it('firebase-messaging-sw.js uses platform icon not Phoenix logo', () => {
		const sw = readFileSync(join(STATIC, 'firebase-messaging-sw.js'), 'utf-8');
		expect(sw).toMatch(/\/icons\/icon-192\.png/);
		expect(sw).not.toMatch(/Phoenixes_Logo_2026\.png/);
	});

	it('functions/dispatcher.js uses platform icon not Phoenix logo', () => {
		const dispatcher = readFileSync(join(ROOT, '..', 'functions', 'dispatcher.js'), 'utf-8');
		expect(dispatcher).toMatch(/APP_ICON\s*=\s*'\/icons\/icon-192\.png'/);
		expect(dispatcher).not.toMatch(/Phoenixes_Logo_2026\.png/);
	});
});
