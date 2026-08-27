/**
 * coachMultiPersonaRosterTabsAndWarRoom.test.ts
 * Tests for multi-persona swarm enhancements:
 * 1. Guardian persona & household decoupling
 * 2. Team Ops multi-tab roster & assistant coach role derivation
 * 3. Mission Control readiness matrix & stats hub integration
 * 4. War Room roster unwrapping & right-click tactical context HUD
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { deriveRoleFlags, canAccess } from '$lib/stores/auth/roleDerivations.js';

const ROOT = join(process.cwd());
const ROSTER_PANEL = join(ROOT, 'src/lib/coach/logistics/CoachTeamRosterPanel.svelte');
const HOUSEHOLDS_TAB = join(ROOT, 'src/lib/coach/logistics/RosterHouseholdsTab.svelte');
const SEASON_FEES_TAB = join(ROOT, 'src/lib/coach/logistics/RosterSeasonFeesTab.svelte');
const TOURNEY_FEES_TAB = join(ROOT, 'src/lib/coach/logistics/RosterTournamentFeesTab.svelte');
const MAPPER_JS = join(ROOT, 'functions-integrations/src/utils/mapper.js');
const ADMIN_OPS_JS = join(ROOT, 'functions/src/domains/adminOps.js');
const DASHBOARD_PAGE = join(ROOT, 'src/routes/(app)/coach/dashboard/+page.svelte');
const STATS_HUB = join(ROOT, 'src/lib/components/coach/stats/CoachTeamStatsHub.svelte');
const SQUAD_TILE_MATRIX = join(ROOT, 'src/lib/coach/dashboard/CoachSquadTileMatrix.svelte');
const TACTICS_HUB_DRAWER = join(ROOT, 'src/lib/components/coach/tactical/hud/TacticsHubDrawer.svelte');
const TACTICAL_WAR_ROOM = join(ROOT, 'src/lib/states/war-room/tacticalWarRoom.svelte.ts');
const TACTICAL_ARENA = join(ROOT, 'src/lib/components/coach/TacticalArena.svelte');
const TACTICAL_PLAYER_HUD = join(ROOT, 'src/lib/components/coach/tactical/hud/TacticalPlayerContextHUD.svelte');

describe('Domain 1: Guardian Personas & Ingest Household Decoupling', () => {
	it('mapper.js creates households and separates parent emails from player lookup', () => {
		const src = readFileSync(MAPPER_JS, 'utf-8');
		expect(src).toMatch(/getHouseholdId/);
		expect(src).toMatch(/households\/\${householdId}/);
		expect(src).toMatch(/parentEmails:/);
		expect(src).toMatch(/role:\s*['"]parent['"]/);
	});

	it('adminOps.js writes to households and indexes parentEmails in player_lookup', () => {
		const src = readFileSync(ADMIN_OPS_JS, 'utf-8');
		expect(src).toMatch(/householdId/);
		expect(src).toMatch(/households/);
		expect(src).toMatch(/buildLookupPayload/);
	});
});

describe('Domain 2: Team Ops Multi-Tab Roster & Role Assignment', () => {
	it('deriveRoleFlags grants isCoach for assistant_coach and head_coach', () => {
		const asstFlags = deriveRoleFlags('assistant_coach');
		expect(asstFlags.isCoach).toBe(true);

		const headFlags = deriveRoleFlags('head_coach');
		expect(headFlags.isCoach).toBe(true);

		const standardFlags = deriveRoleFlags('coach');
		expect(standardFlags.isCoach).toBe(true);

		const parentFlags = deriveRoleFlags('parent');
		expect(parentFlags.isCoach).toBe(false);
	});

	it('canAccess allows assistant_coach into coach gate', () => {
		expect(canAccess('assistant_coach', 'coach')).toBe(true);
		expect(canAccess('head_coach', 'coach')).toBe(true);
	});

	it('CoachTeamRosterPanel contains the 4 required tabs', () => {
		const src = readFileSync(ROSTER_PANEL, 'utf-8');
		expect(src).toMatch(/PLAYERS/);
		expect(src).toMatch(/HOUSEHOLDS/);
		expect(src).toMatch(/SEASON FEES/);
		expect(src).toMatch(/TOURNAMENTS/);
		expect(src).toMatch(/RosterHouseholdsTab/);
		expect(src).toMatch(/RosterSeasonFeesTab/);
		expect(src).toMatch(/RosterTournamentFeesTab/);
	});

	it('RosterHouseholdsTab wires callableUpdateStaffRole to promote parent to assistant_coach', () => {
		const src = readFileSync(HOUSEHOLDS_TAB, 'utf-8');
		expect(src).toMatch(/callableUpdateStaffRole/);
		expect(src).toMatch(/assistant_coach/);
		expect(src).toMatch(/team_manager/);
	});
});

describe('Domain 3: Mission Control Readiness & Telemetry Integration', () => {
	it('coach dashboard +page binds selectedPlayerId across stats hub and squad tile matrix', () => {
		const src = readFileSync(DASHBOARD_PAGE, 'utf-8');
		expect(src).toMatch(/selectedPlayerId=\{engine\.selectedPlayerId\}/);
		expect(src).toMatch(/onSelectPlayer=\{/);
	});

	it('CoachSquadTileMatrix supports player selection and opens profile drawer', () => {
		const src = readFileSync(SQUAD_TILE_MATRIX, 'utf-8');
		expect(src).toMatch(/enterprisePlayerDrawer\.open/);
		expect(src).toMatch(/onSelectPlayer/);
		expect(src).toMatch(/editProfile/);
	});

	it('CoachTeamStatsHub synchronizes selectedPlayerId prop to focus individual radar', () => {
		const src = readFileSync(STATS_HUB, 'utf-8');
		expect(src).toMatch(/propPlayerId/);
		expect(src).toMatch(/onSelectPlayer/);
	});
});

describe('Domain 4: War Room Roster Loading & Right-Click Tactical Context HUD', () => {
	it('TacticsHubDrawer unwraps wrBucketXi getter and provides fallback lookup', () => {
		const src = readFileSync(TACTICS_HUB_DRAWER, 'utf-8');
		expect(src).toMatch(/engine\?\.host\?\.wrBucketXi\?\.get === 'function'/);
		expect(src).toMatch(/fallbackRoster/);
		expect(src).toMatch(/addPlayerToPitch/);
	});

	it('tacticalWarRoom provides token context menu state and tactical actions', () => {
		const src = readFileSync(TACTICAL_WAR_ROOM, 'utf-8');
		expect(src).toMatch(/tokenContextMenuOpen/);
		expect(src).toMatch(/tokenContextMenuPlayer/);
		expect(src).toMatch(/swapTokenPlayer/);
		expect(src).toMatch(/updateTokenPosition/);
		expect(src).toMatch(/toggleTokenSide/);
		expect(src).toMatch(/clearPlayerRoutes/);
		expect(src).toMatch(/benchPlayerToken/);
	});

	it('TacticalArena imports and mounts TacticalPlayerContextHUD', () => {
		const src = readFileSync(TACTICAL_ARENA, 'utf-8');
		expect(src).toMatch(/TacticalPlayerContextHUD/);
		expect(src).toMatch(/<TacticalPlayerContextHUD/);
	});

	it('TacticalPlayerContextHUD implements role picker, player swap, and side toggle', () => {
		const src = readFileSync(TACTICAL_PLAYER_HUD, 'utf-8');
		expect(src).toMatch(/ROLES/);
		expect(src).toMatch(/onSwap/);
		expect(src).toMatch(/onUpdatePosition/);
		expect(src).toMatch(/onToggleSide/);
		expect(src).toMatch(/onClearRoutes/);
		expect(src).toMatch(/onBench/);
	});
});
