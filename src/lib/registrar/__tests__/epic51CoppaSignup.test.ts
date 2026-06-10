/**
 * epic51CoppaSignup.test.ts — Epic 5.1 COPPA / household provisioning guards
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const MATRIX = join(ROOT, 'docs/COPPA_SIGNUP_MATRIX.md');
const HOUSEHOLD = join(ROOT, 'src/routes/(app)/parent/household/+page.svelte');
const APP_LAYOUT = join(ROOT, 'src/routes/(app)/+layout.svelte');
const VPC_PENDING = join(ROOT, 'src/routes/(app)/vpc-pending/+page.svelte');
const ROUTE_POLICIES = join(ROOT, 'src/lib/auth/route-policies.js');

describe('Epic 5.1 — COPPA & household provisioning', () => {
	it('COPPA_SIGNUP_MATRIX documents canonical routes and VPC gate', () => {
		expect(existsSync(MATRIX)).toBe(true);
		const doc = readFileSync(MATRIX, 'utf8');
		expect(doc).toMatch(/parent\/household/);
		expect(doc).toMatch(/vpc-pending/);
		expect(doc).toMatch(/linkHousehold/);
	});

	it('parent household route exists with COPPA workflow surface', () => {
		expect(existsSync(HOUSEHOLD)).toBe(true);
		const src = readFileSync(HOUSEHOLD, 'utf8');
		expect(src).toMatch(/coppa/i);
		expect(src).toMatch(/households/);
	});

	it('app layout gates minors without VPC to vpc-pending', () => {
		const src = readFileSync(APP_LAYOUT, 'utf8');
		expect(src).toMatch(/vpc-pending/);
		expect(src).toMatch(/isMinor|vpc/i);
	});

	it('vpc-pending route exists for minor athletes', () => {
		expect(existsSync(VPC_PENDING)).toBe(true);
	});

	it('data collection routes are policy-gated for minors', () => {
		const src = readFileSync(ROUTE_POLICIES, 'utf8');
		expect(src).toMatch(/DATA_COLLECTION_ROUTES/);
		expect(src).toMatch(/isDataCollectionRoute/);
	});
});
