/**
 * playerHudSprint214.test.ts — Sprint 2.14 Component premium (panel interiors)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const CAPSULE = join(ROOT, 'lib/components/player/trajectory/MemoryCapsuleArena.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const SKILL_TREE = join(ROOT, 'routes/(app)/player/skill-tree/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const capsuleSrc = existsSync(CAPSULE) ? readFileSync(CAPSULE, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const skillTreeSrc = existsSync(SKILL_TREE) ? readFileSync(SKILL_TREE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.14 — VPP premium CSS + empty state', () => {
	it('player-dashboard-hud.css defines vpp-chart--premium glow and inspector premium', () => {
		expect(hudCssSrc).toMatch(/\.vpp-chart--premium[\s\S]*?--pd-accent-data/);
		expect(hudCssSrc).toMatch(/\.vpp-inspector--premium/);
		expect(hudCssSrc).toMatch(/\.vpp-inspector__empty--dossier/);
		expect(hudCssSrc).toMatch(/\.vpp-empty-state/);
	});

	it('VPP wires premium root, selected inspector, dossier empty block', () => {
		expect(vppSrc).toMatch(/vpp-root--premium/);
		expect(vppSrc).toMatch(/vpp-inspector--selected=\{!!selectedRow\}/);
		expect(vppSrc).toMatch(/vpp-inspector__empty--dossier/);
	});

	it('player-analytics-deck nests premium capsules strip', () => {
		expect(hudCssSrc).toMatch(/\.player-capsules-strip--premium/);
		expect(pageSrc).toMatch(/player-capsules-strip--premium/);
		expect(pageSrc).toMatch(/pd-empty-state/);
	});
});

describe('Sprint 2.14 — ActiveBounties mission rail premium', () => {
	it('quest-log-panel--premium class + CSS deck chrome', () => {
		expect(bountiesSrc).toMatch(/quest-log-panel--premium=\{embedded\}/);
		expect(missionsCssSrc).toMatch(/\.quest-log-panel--premium/);
	});

	it('compact rows use bounty/habit accent bars', () => {
		expect(bountiesSrc).toMatch(/quest-row--bounty=\{quest\.tier === 'bounty'\}/);
		expect(missionsCssSrc).toMatch(/\.quest-row--premium\.quest-row--habit/);
		expect(missionsCssSrc).toMatch(/\.quest-row--premium\.quest-row--bounty/);
	});
});

describe('Sprint 2.14 — shared pd-panel utilities + secondary routes', () => {
	it('player-dossier.css exports pd-panel-section, pd-panel-eyebrow, pd-empty-state', () => {
		expect(dossierCssSrc).toMatch(/\.pd-panel-section/);
		expect(dossierCssSrc).toMatch(/\.pd-panel-eyebrow/);
		expect(dossierCssSrc).toMatch(/\.pd-empty-state/);
	});

	it('Armory, Workout, Skill Tree reference internal premium classes', () => {
		expect(armorySrc).toMatch(/qa-workspace--premium/);
		expect(workoutSrc).toMatch(/pd-panel-section/);
		expect(skillTreeSrc).toMatch(/pd-panel-section/);
	});
});

describe('Sprint 2.14 — Identity rank shimmer + memory capsule dossier frame', () => {
	it('rank bar shimmer when XP > 0', () => {
		expect(ibmSrc).toMatch(/ibm-rank-bar--has-xp=\{embedded && totalXp > 0\}/);
		expect(hudCssSrc).toMatch(/\.ibm-rank-bar--has-xp[\s\S]*?ibm-rank-fill-shimmer/);
	});

	it('MemoryCapsuleArena dossier premium frame', () => {
		expect(capsuleSrc).toMatch(/mc-arena--dossier-premium/);
		expect(dossierCssSrc).toMatch(/\.mc-arena--dossier-premium/);
	});
});

describe('Sprint 2.14 — Sprint 2.12.1 regression (incomplete profile hero intact)', () => {
	it('IBM incomplete profile hero + setup card preserved', () => {
		expect(ibmSrc).toMatch(/ibm-root--incomplete=\{profileIncomplete\}/);
		expect(ibmSrc).toMatch(/ibm-silhouette-ring/);
		expect(ibmSrc).toMatch(/ibm-profile-setup-card/);
		expect(hudCssSrc).toMatch(/\.ibm-root--premium\.ibm-root--incomplete/);
	});
});

describe('Sprint 2.14 — docs + ROADMAP', () => {
	it('ROADMAP marks 2.14 Done and current sprint 2.16', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.14\s*\|\s*Done/i);
		expect(roadmapSrc).toMatch(/\*\*Current sprint:\*\*\s*\*\*2\.16\*\*/);
	});

	it('PLAYER_OS.md marks 2.14 shipped', () => {
		expect(playerOsSrc).toMatch(/2\.14[\s\S]*?(shipped|Component premium)/i);
	});
});
