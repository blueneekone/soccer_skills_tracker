/**
 * playerHudSprint220.test.ts — Sprint 2.20a Player OS scroll & physics contract
 *
 * PLAYER_OS_FOUNDATION.md §4: One native document scroll on all Player OS routes.
 * ps-root uses min-height: 100dvh + overflow: visible.
 * ps-scroll-shell is a layout wrapper only (no overflow-y: auto).
 * ps-ambient is position: fixed so atmosphere covers viewport as root grows.
 * Workout ingest/threat panel removes inner vertical scroll trap.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const FOUNDATION = join(ROOT, '..', 'docs/vision/PLAYER_OS_FOUNDATION.md');

const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const foundationSrc = existsSync(FOUNDATION) ? readFileSync(FOUNDATION, 'utf-8') : '';

describe('Sprint 2.20a — scroll & physics contract (PLAYER_OS_FOUNDATION.md §4)', () => {
	it('PLAYER_OS_FOUNDATION.md §4 defines the one-document-scroll contract', () => {
		expect(foundationSrc).toMatch(/One document scroll/);
		expect(foundationSrc).toMatch(/ps-root.*min-height.*overflow.*visible/s);
		expect(foundationSrc).toMatch(/ps-ambient.*fixed/);
	});

	it('player-shell.css .ps-root does NOT set overflow-y: hidden (scroll trap removed)', () => {
		// Foundation §4: root must use overflow: visible, not hidden
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*overflow-y:\s*hidden/s);
	});

	it('player-shell.css .ps-root uses min-height: 100dvh (not fixed height trap)', () => {
		// Native document scroll requires root to grow with content
		expect(shellCssSrc).toMatch(/\.ps-root\s*\{[^}]*min-height:\s*100dvh/s);
		// Bare 'height: 100dvh' (not min-height/max-height) would trap scroll — must be absent.
		// Negative lookbehind excludes 'min-height' and 'max-height' variants.
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*(?<![a-z-])height:\s*100dvh/s);
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*max-height:\s*100dvh/s);
	});

	it('player-shell.css .ps-root overflow-y is visible (document scroll owns vertical)', () => {
		expect(shellCssSrc).toMatch(/\.ps-root\s*\{[^}]*overflow-y:\s*visible/s);
	});

	it('player-shell.css .ps-scroll-shell does NOT own overflow-y: auto', () => {
		// ps-scroll-shell must be a layout wrapper only — not a scroll container
		expect(shellCssSrc).not.toMatch(/\.ps-scroll-shell\s*\{[^}]*overflow-y:\s*auto/s);
		expect(shellCssSrc).not.toMatch(/ps-scroll-shell[^}]*overflow-y:\s*auto/s);
	});

	it('player-shell.css .ps-canvas does NOT set overflow-y: auto', () => {
		// Canvas flows naturally; document scroll handles pagination
		expect(shellCssSrc).not.toMatch(/\.ps-canvas\s*\{[^}]*overflow-y:\s*auto/s);
	});

	it('player-shell.css .ps-ambient uses position: fixed (viewport backdrop after root height change)', () => {
		// Fixed so ambient covers viewport even when content exceeds 100dvh
		expect(shellCssSrc).toMatch(/\.ps-ambient\s*\{[^}]*position:\s*fixed/s);
	});

	it('PlayerShell.svelte ps-scroll-shell element does NOT use tw-overflow-y-auto or tw-flex-1', () => {
		// Checks are scoped to class attribute values (stops at quote boundary) to avoid
		// false positives from comments that mention both terms.
		// tw-overflow-y-auto created an inner scroll container — must be absent from class attr
		expect(shellSrc).not.toMatch(/class="[^"]*ps-scroll-shell[^"]*tw-overflow-y-auto/);
		expect(shellSrc).not.toMatch(/class="[^"]*tw-overflow-y-auto[^"]*ps-scroll-shell/);
		// tw-flex-1 sets flex-basis: 0% which locks the element's intrinsic height contribution
		// to zero, preventing the document from growing taller than 100dvh for native scroll
		expect(shellSrc).not.toMatch(/class="[^"]*ps-scroll-shell[^"]*tw-flex-1/);
		expect(shellSrc).not.toMatch(/class="[^"]*tw-flex-1[^"]*ps-scroll-shell/);
	});

	it('workout page .pw-panel--threat does NOT create inner vertical scroll trap', () => {
		// Foundation §4 Train route must-feel: equal-height columns, no inner panel scroll
		// The desktop media-query block must not combine sticky with overflow-y: auto
		expect(workoutSrc).not.toMatch(/\.pw-panel--threat\s*\{[^}]*overflow-y:\s*auto/s);
	});

	it('workout page .pw-panel--threat does NOT set max-height trap at desktop breakpoint', () => {
		// max-height + overflow-y was the sticky ingest scroll container
		expect(workoutSrc).not.toMatch(
			/@media[^{]*min-width:\s*768px[^{]*\{[\s\S]*?\.pw-panel--threat\s*\{[^}]*max-height:\s*calc\(100vh/
		);
	});
});
