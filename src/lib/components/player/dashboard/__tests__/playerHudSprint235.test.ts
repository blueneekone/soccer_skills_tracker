/**
 * playerHudSprint235.test.ts — Sprint 2.22 slice 6f-c HQ identity telemetry bezel
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BEZEL = join(ROOT, 'lib/components/player/dashboard/IdentityTelemetryBezel.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HOLO_SHELL = join(ROOT, 'lib/components/player/HologramCardShell.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const WORKOUT_PAGE = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISUAL_README = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6f-c/README.md');
const E2E_SPEC = join(ROOT, '..', 'e2e/player-hq-slice-6f-c.visual.spec.ts');

const bezelSrc = existsSync(BEZEL) ? readFileSync(BEZEL, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const holoShellSrc = existsSync(HOLO_SHELL) ? readFileSync(HOLO_SHELL, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT_PAGE) ? readFileSync(WORKOUT_PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const visualReadmeSrc = existsSync(VISUAL_README) ? readFileSync(VISUAL_README, 'utf-8') : '';
const e2eSpecSrc = existsSync(E2E_SPEC) ? readFileSync(E2E_SPEC, 'utf-8') : '';

/** Embedded HQ body row inside IdentityBentoModule. */
const embeddedBodyBlock = (() => {
	const start = ibmSrc.indexOf('<div class="ibm-body--hub-span">');
	const endMatch = ibmSrc.slice(start).match(/\{:else\}\s*\n\s*<div class="ibm-avatar"/);
	const end = endMatch && start >= 0 ? start + endMatch.index! : -1;
	return start >= 0 && end > start ? ibmSrc.slice(start, end) : '';
})();

describe('Sprint 2.22 slice 6f-c — IdentityTelemetryBezel component', () => {
	it('IdentityTelemetryBezel.svelte exists with streak + XP controls', () => {
		expect(existsSync(BEZEL)).toBe(true);
		expect(bezelSrc).toMatch(/ibm-holo-bezel__streak/);
		expect(bezelSrc).toMatch(/ibm-holo-bezel__xp/);
		expect(bezelSrc).toMatch(/data-region="identity-telemetry-bezel"/);
	});

	it('streak control uses flame icon and links to workout route', () => {
		expect(bezelSrc).toMatch(/game\.flame/);
		expect(bezelSrc).toMatch(/resolve\('\/player\/workout'\)/);
		expect(bezelSrc).toMatch(/aria-label=\{streakAriaLabel\}/);
	});

	it('career XP readout links to stats (no rank progress bar on holo card)', () => {
		expect(bezelSrc).toMatch(/resolve\('\/stats'\)/);
		expect(bezelSrc).toMatch(/ibm-holo-bezel__xp-tag/);
		expect(bezelSrc).toMatch(/CAREER/);
		expect(bezelSrc).not.toMatch(/rankProgressPercent/);
		expect(bezelSrc).not.toMatch(/xp-conduit/);
	});
});

describe('Sprint 2.22 slice 6f-c — IdentityBentoModule embedded HQ wiring', () => {
	it('embedded branch does NOT render HudStatCell streak/xp in ibm-metrics', () => {
		expect(embeddedBodyBlock).not.toMatch(/ibm-metrics/);
		expect(embeddedBodyBlock).not.toMatch(/variant="streak"/);
		expect(embeddedBodyBlock).not.toMatch(/variant="xp"/);
	});

	it('embedded branch wires IdentityTelemetryBezel via HologramCardShell telemetry snippet', () => {
		expect(embeddedBodyBlock).toMatch(/IdentityTelemetryBezel/);
		expect(embeddedBodyBlock).toMatch(/\{#snippet telemetry\(\)\}/);
		expect(embeddedBodyBlock).toMatch(/streakAtRisk=\{currentStreak > 0\}/);
	});

	it('embedded branch keeps rank progress + last trained column', () => {
		expect(embeddedBodyBlock).toMatch(/ibm-rank-progress/);
		expect(embeddedBodyBlock).toMatch(/ibm-last-session/);
	});

	it('non-embedded branch still uses HudStatCell streak/xp chips', () => {
		const nonEmbedded = ibmSrc.slice(ibmSrc.indexOf('{:else}'));
		expect(nonEmbedded).toMatch(/ibm-metrics/);
		expect(nonEmbedded).toMatch(/variant="streak"/);
		expect(nonEmbedded).toMatch(/variant="xp"/);
	});
});

describe('Sprint 2.22 slice 6f-c — HologramCardShell telemetry slot', () => {
	it('HologramCardShell accepts optional telemetry snippet in foot rail', () => {
		expect(holoShellSrc).toMatch(/telemetry\?:\s*Snippet/);
		expect(holoShellSrc).toMatch(/hcs-telemetry-foot/);
	});
});

describe('Sprint 2.22 slice 6f-c — identity bezel CSS', () => {
	it('player-dashboard-hud.css contains Sprint 2.22 slice 6f-c block', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6f-c — HQ identity telemetry bezel/);
	});

	it('embedded branch does not pass rankProgressPercent to IdentityTelemetryBezel', () => {
		expect(embeddedBodyBlock).not.toMatch(/IdentityTelemetryBezel[\s\S]*rankProgressPercent/);
	});

	it('CSS styles instrument rail with career XP readout (no holo rank bar)', () => {
		expect(hudCssSrc).toMatch(
			/\.operative-hub__identity-stage \.ibm-body--hub-span \.ibm-metrics[\s\S]*?display:\s*none/,
		);
		expect(hudCssSrc).toMatch(/\.ibm-holo-bezel__rail/);
		expect(hudCssSrc).toMatch(/\.ibm-holo-bezel__streak--at-risk \.ibm-holo-bezel__streak-flame[\s\S]*?ibm-streak-cell-pulse/);
		expect(hudCssSrc).toMatch(/\.ibm-holo-bezel__xp--filled \.ibm-holo-bezel__xp-value[\s\S]*?--pd-accent-data/);
		expect(hudCssSrc).not.toMatch(/\.ibm-holo-bezel__xp-conduit/);
	});

	it('390px media query enforces touch targets on instrument rail', () => {
		expect(hudCssSrc).toMatch(
			/@media \(max-width: 480px\)[\s\S]*?\.ibm-holo-bezel__rail[\s\S]*?min-height:\s*44px/,
		);
	});
});

describe('Sprint 2.22 slice 6f-c — Train page regression', () => {
	it('workout logger does not duplicate streak HudStatCell (HQ hologram bezel owns streak)', () => {
		expect(workoutSrc).not.toMatch(/HudStatCell/);
		expect(workoutSrc).not.toMatch(/variant="streak"/);
	});
});

describe('Sprint 2.22 slice 6f-c — visual acceptance + docs', () => {
	it('visual acceptance README documents career XP vs rank column split', () => {
		expect(existsSync(VISUAL_README)).toBe(true);
		expect(visualReadmeSrc).toMatch(/career|CAREER/i);
		expect(visualReadmeSrc).toMatch(/hq-1280-identity-bezel\.png/);
	});

	it('e2e visual spec exists for slice 6f-c', () => {
		expect(existsSync(E2E_SPEC)).toBe(true);
		expect(e2eSpecSrc).toMatch(/slice 6f-c/);
		expect(e2eSpecSrc).toMatch(/identity-telemetry-bezel|ibm-holo-bezel__streak/);
	});
});

describe('Sprint 2.22 slice 6f-c — ROADMAP pointer', () => {
	it('ROADMAP.md documents slice 6f-c scope', () => {
		expect(roadmapSrc).toMatch(/slice 6f-c/);
		expect(roadmapSrc).toMatch(/IdentityTelemetryBezel|telemetry bezel/i);
	});
});
