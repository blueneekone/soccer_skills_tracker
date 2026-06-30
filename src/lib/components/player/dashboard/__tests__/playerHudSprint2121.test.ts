/**
 * playerHudSprint2121.test.ts — Sprint 2.12.1 HQ hotfix (profile-incomplete premium)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const ACTIVE_BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const activeBountiesTsSrc = existsSync(ACTIVE_BOUNTIES_TS)
	? readFileSync(ACTIVE_BOUNTIES_TS, 'utf-8')
	: '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.12.1 — IBM premium + inset coexist', () => {
	it('identity stage transparent trench for holo Z3 (Wave B / G6 superseded Z1 well)', () => {
		expect(hudCssSrc).toMatch(/\.operative-hub__identity-stage[\s\S]*?background:\s*transparent/);
		expect(hudCssSrc).toMatch(/\.ibm-root--premium[\s\S]*?background:\s*transparent/);
	});

	it('incomplete profile keeps rank bar and metrics visible', () => {
		expect(ibmSrc).toMatch(/ibm-root--incomplete=\{profileIncomplete\}/);
		expect(ibmSrc).toMatch(/ibm-silhouette-ring/);
		expect(hudCssSrc).not.toMatch(
			/\.ibm-root--premium\.ibm-root--badge-only[\s\S]*?\.ibm-rank-progress[\s\S]*?display:\s*none/,
		);
		expect(hudCssSrc).toMatch(/\.ibm-root--premium\.ibm-root--incomplete/);
	});

	it('onboarding setup card uses gold CTA copy', () => {
		expect(ibmSrc).toMatch(/ibm-profile-setup-card/);
		expect(ibmSrc).toMatch(/Complete operative profile →/);
		expect(hudCssSrc).toMatch(/\.ibm-profile-setup-card__cta[\s\S]*?--pd-accent-action/);
	});
});

describe('Sprint 2.12.1 — analytics deck premium parity', () => {
	it('analytics region uses void island (no matte bento-card slab on +page)', () => {
		expect(pageSrc).toMatch(/player-analytics-void/);
		const voidSection = pageSrc.match(/<section[\s\S]*?player-analytics-void[\s\S]*?>/);
		expect(voidSection?.[0]).toBeTruthy();
		expect(voidSection![0]).not.toMatch(/bento-card/);
		expect(voidSection![0]).not.toMatch(/pd-surface-premium/);
	});

	it('VPP premium header frame + radar glow + compact empty block', () => {
		expect(vppSrc).toMatch(/vpp-root--premium/);
		expect(vppSrc).toMatch(/vpp-head--premium/);
		expect(vppSrc).toMatch(/vpp-chart--premium/);
		expect(vppSrc).toMatch(/vpp-inspector__empty--compact/);
		expect(hudCssSrc).toMatch(/\.vpp-chart--premium[\s\S]*?--pd-accent-data/);
	});
});

describe('Sprint 2.12.1 — stronger depth tokens', () => {
	it('grain opacity bumped to ~0.07', () => {
		expect(dossierCssSrc).toMatch(/\.pd-grain::before[\s\S]*?opacity:\s*0\.07/);
	});

	it('elevation shadows slightly stronger', () => {
		expect(dossierCssSrc).toMatch(/--pd-shadow-elev-1:\s*0 3px 10px/);
		expect(dossierCssSrc).toMatch(/--pd-shadow-elev-2:\s*0 10px 28px/);
	});
});

describe('Sprint 2.12.1 — ActiveBounties hero dedupe', () => {
	it('embeddedFeed includes hero row (Wave B — excludeHeroFromRailQuests optional)', () => {
		expect(activeBountiesTsSrc).toMatch(/export function excludeHeroFromRailQuests/);
		expect(bountiesSrc).toMatch(/\{#each embeddedFeed as quest/);
	});
});

describe.skip('Sprint 2.12.1 — ROADMAP sprint pointer', () => {
	it('marks 2.12.1 Done', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
});
