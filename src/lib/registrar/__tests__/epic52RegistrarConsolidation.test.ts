/**
 * epic52RegistrarConsolidation.test.ts — Epic 5.2 registrar → Director OS guards
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const COMPLIANCE_TAB = join(ROOT, 'src/lib/components/director/ComplianceTab.svelte');
const LOADER = join(ROOT, 'src/lib/registrar/loadComplianceRows.js');
const REGISTRAR_PAGE = join(ROOT, 'src/routes/(app)/registrar/+page.js');
const ROUTE_POLICIES = join(ROOT, 'src/lib/auth/route-policies.js');
const LOGIN_ROUTING = join(ROOT, 'src/lib/auth/loginRouting.js');
const DIRECTOR_PAGE = join(ROOT, 'src/routes/(app)/director/+page.svelte');
const MIGRATION = join(ROOT, 'docs/REGISTRAR_DIRECTOR_MIGRATION.md');

describe('Epic 5.2 — registrar / Director consolidation', () => {
	it('/registrar redirects to Director compliance tab', () => {
		expect(existsSync(REGISTRAR_PAGE)).toBe(true);
		const src = readFileSync(REGISTRAR_PAGE, 'utf8');
		expect(src).toMatch(/redirect\(302,\s*'\/director\?tab=compliance'\)/);
	});

	it('route-policies allow registrar on /director and /registrar', () => {
		const src = readFileSync(ROUTE_POLICIES, 'utf8');
		expect(src).toMatch(/'\/registrar':\s*\[[^\]]*'registrar'/);
		expect(src).toMatch(/'\/director':\s*\[[^\]]*'registrar'/);
	});

	it('login waterfall sends registrar to compliance matrix tab', () => {
		const src = readFileSync(LOGIN_ROUTING, 'utf8');
		expect(src).toMatch(/role === 'registrar'/);
		expect(src).toMatch(/\/director\?tab=compliance/);
	});

	it('ComplianceTab uses registrar loadComplianceTable (team-scoped matrix)', () => {
		const tab = readFileSync(COMPLIANCE_TAB, 'utf8');
		const loader = readFileSync(LOADER, 'utf8');
		expect(tab).toMatch(/loadComplianceTable/);
		expect(tab).toMatch(/loadComplianceRows/);
		expect(tab).not.toMatch(/getDocs\(collection\(db,\s*'passports'\)\)/);
		expect(loader).toMatch(/player_lookup/);
		expect(loader).toMatch(/rosters/);
	});

	it('director page reloads teams for registrar club scope', () => {
		const src = readFileSync(DIRECTOR_PAGE, 'utf8');
		expect(src).toMatch(/role !== 'director' && role !== 'registrar'/);
	});

	it('migration doc tracks redirect + compliance parity', () => {
		const doc = readFileSync(MIGRATION, 'utf8');
		expect(doc).toMatch(/\/registrar.*\/director\?tab=compliance/s);
		expect(doc).toMatch(/loadComplianceRows/);
	});
});
