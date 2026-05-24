/**
 * playerHudSprint233.test.ts — Sprint 2.22 slice 6f-b HQ header ladder + VPP inspector whisper
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISUAL_README = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6f-b/README.md');
const E2E_SPEC = join(ROOT, '..', 'e2e/player-hq-slice-6f-b.visual.spec.ts');

const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const visualReadmeSrc = existsSync(VISUAL_README) ? readFileSync(VISUAL_README, 'utf-8') : '';
const e2eSpecSrc = existsSync(E2E_SPEC) ? readFileSync(E2E_SPEC, 'utf-8') : '';

describe('Sprint 2.22 slice 6f-b — HQ header ladder tokens', () => {
	it('player-dashboard-hud.css contains Sprint 2.22 slice 6f-b block', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6f-b — HQ header ladder \+ VPP inspector whisper/);
	});

	it('.player-hud-root defines L1/L2/L3 typography tokens', () => {
		const rootBlock = hudCssSrc.match(/\.player-hud-root,\s*\n\.player-dossier-root\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(rootBlock).toMatch(/--pd-hud-title-l1:\s*clamp\(1\.15rem,\s*2\.4vw,\s*1\.25rem\)/);
		expect(rootBlock).toMatch(/--pd-hud-title-l2:\s*clamp\(0\.82rem,\s*1\.5vw,\s*0\.92rem\)/);
		expect(rootBlock).toMatch(/--pd-hud-eyebrow-l3:\s*clamp\(0\.55rem,\s*1\.1vw,\s*0\.62rem\)/);
	});

	it('.player-hud-root .vpp-title uses L2 token in 4d-fix-b hierarchy block', () => {
		const typoBlock =
			hudCssSrc.match(
				/Sprint 2\.22 slice 4d-fix-b — HUD eyebrow\/title hierarchy[\s\S]*?\.player-hud-root \.vpp-root--premium \.vpp-title[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(typoBlock).toMatch(
			/\.player-hud-root \.vpp-root--premium \.vpp-title[\s\S]*?font-size:\s*var\(--pd-hud-title-l2\)/,
		);
	});

	it('.pd-strap__title uses L1 route hero token', () => {
		const block6fb =
			hudCssSrc.match(/Sprint 2\.22 slice 6f-b[\s\S]*?\.player-hud-root \.pd-strap__title[\s\S]*?\}/)?.[0] ??
			'';
		expect(block6fb).toMatch(/font-size:\s*var\(--pd-hud-title-l1\)/);
	});

	it('deduplicated .oqo-deck__title — no conflicting larger player-hud-root rule after 4d-fix-b', () => {
		const afterFixB = hudCssSrc.split('Sprint 2.22 slice 4d-fix-b — HUD eyebrow/title hierarchy')[1] ?? '';
		expect(afterFixB).not.toMatch(
			/\.player-hud-root \.oqo-deck__title[\s\S]*?clamp\(0\.95rem[\s\S]*?1\.1rem\)/,
		);
		const fixBBlock =
			hudCssSrc.match(
				/Sprint 2\.22 slice 4d-fix-b — HUD eyebrow\/title hierarchy[\s\S]*?\.player-hud-root \.vpp-root--premium \.vpp-title[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(fixBBlock).toMatch(/\.player-hud-root \.oqo-deck__title[\s\S]*?var\(--pd-hud-title-l2\)/);
	});
});

describe('Sprint 2.22 slice 6f-b — VPP idle inspector whisper', () => {
	it('.vpp-inspector__empty--dossier max-height capped at 64px or less', () => {
		const emptyBlock =
			hudCssSrc.match(/\.player-hud-root \.vpp-inspector__empty--dossier\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(emptyBlock).toMatch(/max-height:\s*64px/);
	});

	it('analytics void idle inspector uses whisper grid + transparent shell', () => {
		const block6fb = hudCssSrc.match(/Sprint 2\.22 slice 6f-b[\s\S]*$/)?.[0] ?? '';
		expect(block6fb).toMatch(/\.player-analytics-void \.vpp-body:has\(\.vpp-inspector--idle\)/);
		expect(block6fb).toMatch(/minmax\(120px,\s*200px\)/);
		expect(block6fb).toMatch(
			/\.player-analytics-void \.vpp-inspector--premium:not\(\.vpp-inspector--selected\)[\s\S]*?background:\s*transparent/,
		);
	});

	it('VanguardProtocolPanel adds vpp-inspector--idle when no selection', () => {
		expect(vppSrc).toMatch(/vpp-inspector--idle=\{!selectedRow\}/);
		expect(vppSrc).toMatch(/Log a session to unlock vector detail\./);
	});
});

describe('Sprint 2.22 slice 6f-b — visual acceptance + ROADMAP', () => {
	it('visual acceptance README documents header ladder + inspector whisper PNGs', () => {
		expect(existsSync(VISUAL_README)).toBe(true);
		expect(visualReadmeSrc).toMatch(/hq-1280-header-ladder\.png/);
		expect(visualReadmeSrc).toMatch(/hq-1280-vpp-inspector-whisper\.png/);
		expect(visualReadmeSrc).toMatch(/hq-1280-vpp-vector-selected\.png/);
	});

	it('e2e visual spec clips player-analytics-void + identity stage', () => {
		expect(existsSync(E2E_SPEC)).toBe(true);
		expect(e2eSpecSrc).toMatch(/slice 6f-b/);
		expect(e2eSpecSrc).toMatch(/player-analytics-void/);
		expect(e2eSpecSrc).toMatch(/Operative identity card|identity-telemetry-bezel/);
	});

	it('ROADMAP marks 6f-c Done and 6f-b Done', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*6f-c\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*\*\*6f-b\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(
			/slice 6f-b scope — HQ header ladder \+ VPP inspector whisper — \*\*Done\*\*/,
		);
	});
});
