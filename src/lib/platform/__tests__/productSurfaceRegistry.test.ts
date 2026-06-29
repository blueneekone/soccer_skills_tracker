import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const REGISTRY = join(ROOT, '..', 'docs/vision/PRODUCT_SURFACE_REGISTRY.md');
const WORKSPACE_NAV = join(ROOT, 'lib/shell/workspaceNav.js');

type RegistryRow = {
	id: string;
	persona: string;
	route: string;
	label: string;
	tier: number;
	navVisible: boolean;
	workflowId: string;
	layoutPattern: string;
	foundationDoc: string;
	vaDoc: string;
};

/** Strip optional backticks from registry cell values */
function cell(value: string): string {
	return value.replace(/^`|`$/g, '');
}

/** Parse §1 master table rows from PRODUCT_SURFACE_REGISTRY.md */
function parseRegistryTable(src: string): RegistryRow[] {
	const section = src.split('## §1 Master table')[1]?.split('## §2')[0] ?? '';
	const lines = section.split('\n').filter((line) => line.startsWith('| PS-'));
	return lines.map((line) => {
		const cols = line
			.split('|')
			.map((c) => c.trim())
			.filter(Boolean);
		expect(cols.length).toBeGreaterThanOrEqual(14);
		return {
			id: cols[0],
			persona: cols[1],
			route: cell(cols[2]),
			label: cols[3],
			tier: Number(cols[4]),
			navVisible: cols[5] === 'true',
			workflowId: cell(cols[8]),
			layoutPattern: cell(cols[9]),
			foundationDoc: cols[10],
			vaDoc: cols[11],
		};
	});
}

/** Extract coach hrefs from workspaceNav coachLinks array */
function parseCoachNavHrefs(navSrc: string): string[] {
	const block = navSrc.match(/const coachLinks = \[([\s\S]*?)\];/);
	expect(block).toBeTruthy();
	const hrefs = [...(block![1].matchAll(/href:\s*'([^']+)'/g))].map((m) => m[1]);
	return hrefs;
}

describe('PRODUCT_SURFACE_REGISTRY gospel guards', () => {
	const registrySrc = readFileSync(REGISTRY, 'utf-8');
	const rows = parseRegistryTable(registrySrc);

	it('registry file exists with §1 master table and canon columns', () => {
		expect(registrySrc).toContain('## §1 Master table');
		expect(registrySrc).toContain('workflow_id');
		expect(registrySrc).toContain('layout_pattern');
		expect(registrySrc).toContain('foundation_doc');
		expect(registrySrc).toContain('va_doc');
		expect(rows.length).toBeGreaterThanOrEqual(30);
	});

	it('Tier 1 includes exec-cut + QA gate routes', () => {
		const tier1Routes = rows.filter((r) => r.tier === 1).map((r) => r.route);
		for (const route of [
			'/coach/forge',
			'/parent/household',
			'/player/dashboard',
			'/player/workout',
			'/messages',
		]) {
			expect(tier1Routes, `missing Tier 1 ${route}`).toContain(route);
		}
	});

	it('Tier 1 persona surfaces have workflow_id and layout_pattern', () => {
		const tier1 = rows.filter((r) => r.tier === 1);
		for (const row of tier1) {
			expect(row.workflowId, `${row.id} workflow_id`).not.toBe('—');
			expect(row.workflowId, `${row.id} workflow_id`).toMatch(/^WF-/);
			expect(row.layoutPattern, `${row.id} layout_pattern`).not.toBe('—');
		}
	});

	it('Forge is coach-forge-workbench with foundation + VA docs', () => {
		const forge = rows.find((r) => r.route === '/coach/forge');
		expect(forge).toBeDefined();
		expect(forge!.workflowId).toBe('WF-COACH-FORGE');
		expect(forge!.layoutPattern).toBe('coach-forge-workbench');
		expect(forge!.foundationDoc).toContain('COACH_OS_FOUNDATION.md');
		expect(forge!.vaDoc).toContain('COACH_OS_VISUAL_ACCEPTANCE.md');
		expect(forge!.tier).toBe(1);
	});

	it('Parent Tier 1 rows link PARENT_OS foundation and VA', () => {
		for (const route of ['/parent/household', '/parent/vpc', '/parent/dashboard']) {
			const row = rows.find((r) => r.route === route);
			expect(row, route).toBeDefined();
			expect(row!.foundationDoc).toContain('PARENT_OS_FOUNDATION.md');
			expect(row!.vaDoc).toContain('PARENT_OS_VISUAL_ACCEPTANCE.md');
		}
	});

	it('Player Tier 1 rows link PLAYER_OS foundation and VA', () => {
		for (const route of ['/player/dashboard', '/player/workout', '/stats']) {
			const row = rows.find((r) => r.route === route);
			expect(row, route).toBeDefined();
			expect(row!.foundationDoc).toContain('PLAYER_OS_FOUNDATION.md');
			expect(row!.vaDoc).toContain('PLAYER_OS_VISUAL_ACCEPTANCE.md');
		}
	});

	it('platform canon docs exist on disk', () => {
		const vision = join(ROOT, '..', 'docs/vision');
		for (const file of [
			'PLATFORM_WORKFLOW_CANON.md',
			'PLATFORM_NAVIGATION_CANON.md',
			'PLATFORM_DESIGN_SYSTEM.md',
			'COACH_OS_FOUNDATION.md',
			'PARENT_OS_FOUNDATION.md',
			'COACH_OS_VISUAL_ACCEPTANCE.md',
			'PARENT_OS_VISUAL_ACCEPTANCE.md',
			'AGENT_COACH_UX_SPRINT_TEMPLATE.md',
			'AGENT_PARENT_UX_SPRINT_TEMPLATE.md',
		]) {
			expect(readFileSync(join(vision, file), 'utf-8').length).toBeGreaterThan(100);
		}
	});

	it('War Room is Tier 2 with nav_visible=true', () => {
		const warRoom = rows.find((r) => r.route === '/coach/tactical');
		expect(warRoom).toBeDefined();
		expect(warRoom!.tier).toBe(2);
		expect(warRoom!.navVisible).toBe(true);
	});

	it('workspaceNav coachLinks hrefs ⊆ registry nav_visible=true coach routes', () => {
		const navSrc = readFileSync(WORKSPACE_NAV, 'utf-8');
		const coachHrefs = parseCoachNavHrefs(navSrc);
		const allowedCoachNav = new Set(
			rows.filter((r) => r.persona === 'coach' && r.navVisible).map((r) => r.route),
		);

		for (const href of coachHrefs) {
			expect(allowedCoachNav.has(href), `${href} not in registry nav_visible coach set`).toBe(
				true,
			);
		}
	});

	it('War Room in coach sidebar when registry nav_visible=true', () => {
		const navSrc = readFileSync(WORKSPACE_NAV, 'utf-8');
		const coachHrefs = parseCoachNavHrefs(navSrc);
		expect(coachHrefs).toContain('/coach/tactical');
		expect(coachHrefs).not.toContain('/coach/tactics-board');
	});

	it('WARROOM-SINGLE-SURFACE — PS-C05 removed; tactics-board merged into War Room', () => {
		const tacticsBoard = rows.find((r) => r.route === '/coach/tactics-board');
		expect(tacticsBoard).toBeDefined();
		expect(tacticsBoard!.id).toBe('PS-C05');
		expect(registrySrc).toMatch(/WARROOM-SINGLE-SURFACE/);
		expect(registrySrc).toMatch(/redirect → `\/coach\/tactical`/);
	});

	it('COACH-NAV-DEMOTE — Trial Builder excluded; Scouting label on /coach/scouting', () => {
		const nav = readFileSync(WORKSPACE_NAV, 'utf-8');
		expect(nav).not.toMatch(/href:\s*'\/coach\/trial-builder'/);
		expect(nav).toMatch(/label:\s*'Scouting'[\s\S]*href:\s*'\/coach\/scouting'/);
		expect(nav).not.toMatch(/label:\s*'Proving Grounds'[\s\S]*href:\s*'\/coach\/scouting'/);
	});

	it('SURFACE-MERGE-TRIAL-EVAL — PS-C09 removed; roster eval merged into Scouting', () => {
		const trialBuilder = rows.find((r) => r.route === '/coach/trial-builder');
		expect(trialBuilder).toBeDefined();
		expect(trialBuilder!.id).toBe('PS-C09');
		expect(registrySrc).toMatch(/\*\*removed\*\*/);
		expect(registrySrc).toMatch(/SURFACE-MERGE-TRIAL-EVAL/);
		const scouting = rows.find((r) => r.route === '/coach/scouting');
		expect(scouting?.label).toBe('Scouting');
		expect(registrySrc).toMatch(/roster quick log/);
	});

	it('PLATFORM_BUILD_MANDATES rejects Trinity HUD on Coach Tier 1', () => {
		const mandates = readFileSync(
			join(ROOT, '..', 'docs/vision/PLATFORM_BUILD_MANDATES.md'),
			'utf-8',
		);
		expect(mandates).toMatch(/Trinity HUD overlay.*Coach Tier 1/);
		expect(mandates).toMatch(/COACH_OS_FOUNDATION/);
	});

	it('PLATFORM_WORKFLOW_CANON defines four gold paths', () => {
		const canon = readFileSync(
			join(ROOT, '..', 'docs/vision/PLATFORM_WORKFLOW_CANON.md'),
			'utf-8',
		);
		for (const gp of ['GP-ACQ', 'GP-COACH', 'GP-PARENT', 'GP-GATE']) {
			expect(canon, `missing gold path ${gp}`).toContain(gp);
		}
		expect(canon).toContain('§4 QA resume gate');
	});

	it('COACH_OS_FOUNDATION rejects IntentHUD overlay on Tier 1 Forge', () => {
		const foundation = readFileSync(
			join(ROOT, '..', 'docs/vision/COACH_OS_FOUNDATION.md'),
			'utf-8',
		);
		expect(foundation).toMatch(/IntentHUD/);
		expect(foundation).toMatch(/Trinity HUD overlay on Tier 1/);
	});
});
