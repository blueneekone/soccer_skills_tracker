/**
 * playerHudSprint227.test.ts — Sprint 2.22 slice 6a HQ identity hologram (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HOLO_SHELL = join(ROOT, 'lib/components/player/HologramCardShell.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const FOUNDATION = join(ROOT, '..', 'docs/vision/PLAYER_OS_FOUNDATION.md');

const holoShellSrc = existsSync(HOLO_SHELL) ? readFileSync(HOLO_SHELL, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const foundationSrc = existsSync(FOUNDATION) ? readFileSync(FOUNDATION, 'utf-8') : '';

/** Embedded HQ body row inside IdentityBentoModule. */
const embeddedBodyBlock = (() => {
	const start = ibmSrc.indexOf('<div class="ibm-body--hub-span">');
	const endMatch = ibmSrc.slice(start).match(/\{:else\}\s*\n\s*<div class="ibm-avatar"/);
	const end = endMatch && start >= 0 ? start + endMatch.index! : -1;
	return start >= 0 && end > start ? ibmSrc.slice(start, end) : '';
})();

describe('Sprint 2.22 slice 6a — HologramCardShell primitive', () => {
	it('HologramCardShell.svelte exists', () => {
		expect(existsSync(HOLO_SHELL)).toBe(true);
	});

	it('HologramCardShell contains foil overlay and edge-glow inset shadow pattern', () => {
		expect(holoShellSrc).toMatch(/mix-blend-mode:\s*overlay/);
		expect(holoShellSrc).toMatch(/inset 0 0 0 1px color-mix/);
		expect(holoShellSrc).toMatch(/hcs-edge::before/);
		expect(holoShellSrc).toMatch(/hcs-scanlines/);
	});
});

describe('Sprint 2.22 slice 6a — IdentityBentoModule HQ wiring', () => {
	it('IdentityBentoModule imports HologramCardShell', () => {
		expect(ibmSrc).toMatch(/import HologramCardShell from '\$lib\/components\/player\/HologramCardShell\.svelte'/);
	});

	it('IdentityBentoModule does NOT import VanguardCard', () => {
		expect(ibmSrc).not.toMatch(/VanguardCard/);
	});

	it('embedded branch uses OperativeIdCardFrame inside HologramCardShell', () => {
		expect(embeddedBodyBlock).toMatch(/HologramCardShell/);
		expect(embeddedBodyBlock).toMatch(/OperativeIdCardFrame/);
		expect(embeddedBodyBlock).toMatch(/ibm-holo-face/);
		expect(hudCssSrc).toMatch(/ibm-holo-face__name/);
	});

	it('embedded branch keeps ibm-rings identity beside hologram card with telemetry bezel', () => {
		expect(embeddedBodyBlock).toMatch(/ibm-rings/);
		expect(embeddedBodyBlock).toMatch(/ibm-rank-progress/);
		expect(embeddedBodyBlock).toMatch(/IdentityTelemetryBezel/);
		expect(embeddedBodyBlock).not.toMatch(/ibm-metrics[\s\S]*?variant="streak"/);
	});
});

describe('Sprint 2.22 slice 6a — identity stage CSS', () => {
	it('player-dashboard-hud.css contains Sprint 2.22 slice 6a block', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6a — HQ identity hologram artifact/);
	});

	it('identity-stage rules do NOT use --pd-z1-well-bg as stage background', () => {
		const stageBlock =
			hudCssSrc.match(/\.operative-hub__identity-stage\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(stageBlock).toMatch(/background:\s*transparent/);
		expect(stageBlock).not.toMatch(/--pd-z1-well-bg/);
	});

	it('ibm-holo-face typography uses display font for callsign', () => {
		expect(hudCssSrc).toMatch(/ibm-holo-face__name[\s\S]*?--pd-font-display/);
		expect(hudCssSrc).toMatch(/ibm-holo-face__rank[\s\S]*?Geist Mono/);
	});
});

describe('Sprint 2.22 slice 6a — docs sync', () => {
	it('ROADMAP.md mentions Phase 6 / slice 6a', () => {
		expect(roadmapSrc).toMatch(/Phase 6/);
		expect(roadmapSrc).toMatch(/slice 6a/);
		expect(roadmapSrc).toMatch(/HologramCardShell/);
	});

	it('PLAYER_OS_FOUNDATION.md mentions HologramCardShell', () => {
		expect(foundationSrc).toMatch(/HologramCardShell/);
		expect(foundationSrc).toMatch(/Hologram card shell/);
	});
});
