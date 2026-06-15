/**
 * playerHudSprint312.test.ts — Sprint 3.1.2 Player OS hotfix guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const APP_CSS = join(ROOT, 'app.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const TELEMETRY_CSS = join(ROOT, 'lib/styles/hud-telemetry.css');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');

const appCssSrc = existsSync(APP_CSS) ? readFileSync(APP_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const telemetryCssSrc = existsSync(TELEMETRY_CSS) ? readFileSync(TELEMETRY_CSS, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';

describe('Sprint 3.1.2 — global bento mobile span collapse', () => {
	it('app.css collapses bento-span-4 to full width below 64rem', () => {
		expect(appCssSrc).toMatch(/@media \(max-width: 63\.99rem\)/);
		expect(appCssSrc).toMatch(
			/\.bento-grid\.bento-grid--12col\s*>\s*:where\([\s\S]*?\.bento-span-4[\s\S]*?\)\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/,
		);
	});
});

describe('Sprint 3.1.2 — mission Accept gold (no cyan hero setup class)', () => {
	it('hero CTA uses quest-hero__cta only — not ibm-cta--setup', () => {
		const heroBtn = bountiesSrc.match(
			/class="quest-hero__cta[\s\S]{0,80}"/,
		)?.[0];
		expect(heroBtn).toBeTruthy();
		expect(heroBtn).not.toMatch(/ibm-cta--setup/);
		expect(heroBtn).not.toMatch(/ibm-cta/);
	});

	it('embedded accept in ActiveBounties does not use #22d3ee', () => {
		const acceptBlock =
			hudCssSrc.match(/\.player-hud-root \.quest-row__cmd--embedded\.quest-row__cmd--accept[\s\S]*?\}/)?.[0] ?? '';
		expect(acceptBlock).not.toMatch(/#22d3ee/);
		expect(acceptBlock).toMatch(/#fbbf24|var\(--pd-accent-action/);
	});

	it('player-hud quest-hero__cta hover stays gold', () => {
		expect(hudCssSrc).toMatch(/\.player-hud-root \.quest-hero--gold \.quest-hero__cta:hover[\s\S]*?--pd-accent-action/);
	});

	it('telemetry embedded accept hover does not bleed cyan', () => {
		const acceptRule =
			telemetryCssSrc.match(
				/\.hud-telemetry-root \.quest-log-panel--embedded \.quest-row__cmd--accept[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(acceptRule).toMatch(/#fbbf24/);
		expect(acceptRule).not.toMatch(/#22d3ee/);
	});
});

describe('Sprint 3.1.2 — init modal primary CTA contrast', () => {
	it('primary CTA uses dark text on gold fill', () => {
		const primaryBlock =
			hudCssSrc.match(/\.init-modal__cta--primary[\s\S]*?\}/)?.[0] ?? '';
		expect(primaryBlock).toMatch(/background:\s*var\(--pd-accent-action|#fbbf24/);
		expect(primaryBlock).toMatch(/color:\s*#05050a|#0f172a/);
		expect(primaryBlock).not.toMatch(
			/color:\s*var\(--pd-accent-action,\s*#fbbf24\)/,
		);
	});
});

describe('Sprint 3.1.2 — Armory nav not billing-gated', () => {
	it('PRIMARY_LOCK_HREFS locks Train only — not Armory', () => {
		expect(shellSrc).toMatch(/PRIMARY_LOCK_HREFS\s*=\s*new Set\(\[['"]\/player\/workout['"]\]\)/);
		expect(shellSrc).not.toMatch(/\/player\/armory['"]\s*\]/);
	});
});
