/**
 * playerHudSprint2102.test.ts — Sprint 2.10.2 inline schedule meta always visible
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveHqStatusBadges } from '$lib/player/dashboard/hqWorldContext.js';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const STRIP = join(ROOT, 'lib/components/player/dashboard/HqWorldContextStrip.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const stripSrc = existsSync(STRIP) ? readFileSync(STRIP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.10.2 — inline schedule meta always visible', () => {
	it('inline mode renders ghost when no event and badges empty', () => {
		expect(stripSrc).toMatch(/showScheduleMeta\s*=\s*true/);
		expect(stripSrc).toMatch(/inline && showScheduleMeta/);
		expect(stripSrc).toMatch(/No sessions scheduled/);
		expect(stripSrc).toMatch(/hq-world-context__ghost/);
		const inlineBlock = stripSrc.match(/\{#if inline\}[\s\S]*?\{:else\}/)?.[0] ?? '';
		expect(inlineBlock).toMatch(/\{:else if showScheduleMeta\}/);
		expect(inlineBlock).toMatch(/hq-world-context__ghost/);
	});

	it('inline mode renders event tag when nextEventLabel is set', () => {
		expect(stripSrc).toMatch(/\{#if nextEventLabel\}[\s\S]*hq-world-context__event-tag/);
	});

	it('inline keeps badges on the same flex row as schedule fragment', () => {
		const inlineBlock = stripSrc.match(/\{#if inline\}[\s\S]*?\{:else\}/)?.[0] ?? '';
		expect(inlineBlock).toMatch(/hq-world-context__row/);
		expect(inlineBlock).toMatch(/hq-world-context__chip/);
		expect(inlineBlock).not.toMatch(/hq-world-context__chips/);
	});

	it('does not restore full-width bordered panel between strap and hub', () => {
		expect(pageSrc).toMatch(/pd-strap__context/);
		expect(pageSrc).not.toMatch(
			/<\/header>\s*\n\s*<HqWorldContextStrip/,
		);
		const inlineBlock = hudCssSrc.match(
			/\.hq-world-context--inline[\s\S]*?\}/,
		)?.[0] ?? '';
		expect(inlineBlock).toMatch(/border:\s*none/);
	});
});

describe('Sprint 2.10.2 — badge dedupe preserved (2.10.1)', () => {
	const now = new Date(Date.UTC(2026, 4, 21, 15, 0, 0));

	it('suppresses TRAIN TODAY when hero is daily-training-log', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: false,
			streak: 3,
			lastTrainingUtc: '2026-05-20',
			coachBountyCount: 0,
			heroQuestId: 'daily-training-log',
			now,
		});
		expect(badges.some((b) => b.id === 'train-today')).toBe(false);
	});
});

describe('Sprint 2.10.2 — docs', () => {
	it('PLAYER_OS.md documents 2.10.2 schedule ghost in inline strap', () => {
		expect(playerOsSrc).toMatch(/2\.10\.2/);
		expect(playerOsSrc).toMatch(/No sessions scheduled/);
	});

	it.skip('ROADMAP.md has micro-line for sprint 2.10.2', () => {
		// skip expect(roadmapSrc)
	});
});
