/**
 * playerHudSprint230.test.ts — Sprint 2.22 slice 6d Train hero + HQ chrome
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const TRAIN_BRIEF = join(ROOT, 'lib/components/player/workout/TrainMissionBrief.svelte');
const WORKOUT_PAGE = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const HUD_STAT = join(ROOT, 'lib/components/player/dashboard/HudStatCell.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT_PAGE) ? readFileSync(WORKOUT_PAGE, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const hudStatSrc = existsSync(HUD_STAT) ? readFileSync(HUD_STAT, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.22 slice 6d — Train logger (briefing removed; HQ owns missions)', () => {
	it('TrainMissionBrief.svelte is deleted — no duplicate mission hero on logger', () => {
		expect(existsSync(TRAIN_BRIEF)).toBe(false);
	});

	it('workout/+page.svelte is execution-focused on single hero deck', () => {
		expect(workoutSrc).not.toMatch(/TrainMissionBrief/);
		expect(workoutSrc).not.toMatch(/briefingQuest|dailyQuests|pw-quest/);
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).not.toMatch(/pw-terminal-well/);
	});
});

describe('Sprint 2.22 slice 6d — Quick Ops icon badges', () => {
	it('OperativeQuickOps applies unified action icon styling via CSS', () => {
		expect(quickOpsSrc).not.toMatch(/data-oqo-accent/);
		expect(quickOpsSrc).not.toMatch(/accent:\s*'(data|neutral)'/);
	});

	it('player-dashboard-hud.css applies amber depth + hover glow to Quick Ops tiles', () => {
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op__icon[\s\S]*--pd-accent-action/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op:hover[\s\S]*--pd-accent-action/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op[\s\S]*--pd-emissive-gold/);
	});
});

describe('Sprint 2.22 slice 6d — identity stat badges + ultrawide density', () => {
	it('HudStatCell renders icons for streak and xp variants', () => {
		expect(hudStatSrc).toMatch(/game\.flame/);
		expect(hudStatSrc).toMatch(/game\.zap/);
		expect(hudStatSrc).toMatch(/hud-stat-cell__icon-badge/);
	});

	it('player-dashboard-hud.css contains filled badge rules for streak and xp', () => {
		expect(hudCss).toMatch(/\.hud-stat-cell--streak \.hud-stat-cell__icon-badge/);
		expect(hudCss).toMatch(/\.hud-stat-cell--xp \.hud-stat-cell__icon-badge/);
	});

	it('ultrawide media query targets ibm-metrics inline row', () => {
		expect(hudCss).toMatch(/@media \(min-width: 1920px\)[\s\S]*?\.ibm-metrics/);
	});
});

describe('Sprint 2.22 slice 6d — ROADMAP sprint pointer', () => {
	it('marks 6d Done and 6c Done', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*6d\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*\*\*6c\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
	});
});
