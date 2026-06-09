import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ENGINE = join(__dirname, '..', '..', '..', 'components', 'coach', 'TacticalEngine.svelte.ts');
const BRAIN = join(__dirname, '..', 'tacticalWarRoom.svelte.ts');
// __dirname = src/lib/states/war-room/__tests__
// 4 levels up => src/, then routes/...
const PAGE = join(__dirname, '..', '..', '..', '..', 'routes', '(app)', 'coach', 'tactical', '+page.svelte');
// 5 levels up => repo root
const RULES = join(__dirname, '..', '..', '..', '..', '..', 'firestore.rules');

describe('TacticalEngine factory (Phase C)', () => {
	it('war-room brain module owns createTacticalWarRoom implementation', () => {
		const brain = readFileSync(BRAIN, 'utf-8');
		expect(brain).toMatch(/export function createTacticalWarRoom/);
		expect(brain).toMatch(/wireTacticalPlayback/);
		expect(brain.length).toBeGreaterThan(5000);
	});

	it('TacticalEngine.svelte.ts is a thin factory re-export', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/from '\$lib\/states\/war-room\/tacticalWarRoom\.svelte\.js'/);
		expect(src).not.toMatch(/export function createTacticalWarRoom\(/);
		expect(src.split('\n').length).toBeLessThan(40);
	});
});

// T1-1 — tactical board persistence guards
describe('T1-1: tactical board Firestore persistence', () => {
	it('page writes board state to teams/{teamId}/tactics/wr_{uid} via setDoc', () => {
		const src = readFileSync(PAGE, 'utf-8');
		// Verifies collection path uses existing tactics sub-collection
		expect(src).toMatch(/['"]teams['"]\s*,\s*tid\s*,\s*['"]tactics['"]\s*,\s*`wr_\$\{uid\}`/);
		expect(src).toMatch(/setDoc/);
		expect(src).toMatch(/serverTimestamp/);
	});

	it('page saves teamId and clubId tenant fields in tactical doc', () => {
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/teamId\s*:\s*tid/);
		expect(src).toMatch(/clubId\s*:\s*teamScope\.teamClubId/);
		expect(src).toMatch(/createdBy\s*:\s*uid/);
	});

	it('page saves cartridge (entities + routes) to Firestore doc', () => {
		const src = readFileSync(PAGE, 'utf-8');
		// cartridge may appear as shorthand property or explicit key: value
		expect(src).toMatch(/cartridge[\s,:]|cartridge:/);
		expect(src).toMatch(/canvasState\s*:/);
		// cartridge must be serialized via the engine method
		expect(src).toMatch(/engine\.serializeToCartridge\(\)/);
	});

	it('page loads board state on mount and hydrates pitch + routes', () => {
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/getDoc/);
		// Hydrates friendly tokens
		expect(src).toMatch(/wrBucketPitch\s*=/);
		// Hydrates opponent tokens
		expect(src).toMatch(/wrOppPitch\s*=/);
		// Hydrates routes
		expect(src).toMatch(/drawnRoutes\s*=/);
	});

	it('page guards auto-save behind boardLoadComplete to prevent save during hydration', () => {
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/boardLoadComplete/);
		// scheduleSave must check the flag
		expect(src).toMatch(/if\s*\(!boardLoadComplete\)\s*return/);
	});

	it('firestore.rules scopes teams/tactics to same-tenant coach or director', () => {
		const rules = readFileSync(RULES, 'utf-8');
		// Existing Epic 2.3 block — nested under match /teams/{teamId} — no new rules required
		expect(rules).toMatch(/match \/tactics\/\{tacticId\}/);
		expect(rules).toMatch(/coachStaffCanAccessTeam\(teamId\)/);
		expect(rules).toMatch(/directorScopedToTeam\(teamId\)/);
	});
});
