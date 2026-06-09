/**
 * directorBillingAuditPanel.guard.test.ts
 * ─────────────────────────────────────────
 * T1-12 guard: source-scan assertions verifying the DirectorBillingAuditPanel
 * component correctly wires both director data surfaces:
 *
 *  1. audit_logs director view  — queries with tenantId filter
 *  2. Stripe Connect status     — reads stripeOnboardingComplete from organizations/{clubId}
 *
 * No Firestore emulator required — assertions scan component source.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PANEL_SRC = readFileSync(
	resolve('src/lib/components/director/DirectorBillingAuditPanel.svelte'),
	'utf8',
);

const COMPLIANCE_PAGE_SRC = readFileSync(
	resolve('src/routes/(app)/director/compliance/+page.svelte'),
	'utf8',
);

describe('T1-12 — DirectorBillingAuditPanel: audit_logs tenantId query', () => {
	it('queries audit_logs collection', () => {
		expect(PANEL_SRC).toContain("collection(db, 'audit_logs')");
	});

	it('filters audit_logs by tenantId', () => {
		expect(PANEL_SRC).toContain("where('tenantId'");
	});

	it('orders results by timestamp descending', () => {
		expect(PANEL_SRC).toContain("orderBy('timestamp', 'desc')");
	});

	it('applies a result limit', () => {
		expect(PANEL_SRC).toContain('limit(50)');
	});
});

describe('T1-12 — DirectorBillingAuditPanel: Stripe Connect status reader', () => {
	it('reads from organizations collection', () => {
		expect(PANEL_SRC).toContain("doc(db, 'organizations'");
	});

	it('reads stripeOnboardingComplete field', () => {
		expect(PANEL_SRC).toContain('stripeOnboardingComplete');
	});

	it('reads stripePayoutsEnabled field', () => {
		expect(PANEL_SRC).toContain('stripePayoutsEnabled');
	});

	it('reads stripeAccountId field', () => {
		expect(PANEL_SRC).toContain('stripeAccountId');
	});
});

describe('T1-12 — DirectorBillingAuditPanel: renders both sections', () => {
	it('renders STRIPE CONNECT STATUS section header', () => {
		expect(PANEL_SRC).toContain('STRIPE CONNECT STATUS');
	});

	it('renders TENANT AUDIT LOG section header', () => {
		expect(PANEL_SRC).toContain('TENANT AUDIT LOG');
	});
});

describe('T1-12 — compliance page: mounts DirectorBillingAuditPanel', () => {
	it('imports DirectorBillingAuditPanel', () => {
		expect(COMPLIANCE_PAGE_SRC).toContain('DirectorBillingAuditPanel');
	});

	it('renders DirectorBillingAuditPanel with clubId prop', () => {
		expect(COMPLIANCE_PAGE_SRC).toMatch(/DirectorBillingAuditPanel.*clubId/s);
	});
});
