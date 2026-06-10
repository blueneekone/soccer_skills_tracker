/**
 * epic22VaultWiring.test.ts — Epic 2.2 PII vault client wiring guards
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const PASSPORT = join(ROOT, 'src/routes/(app)/passport/+page.svelte');
const VAULT = join(ROOT, 'src/lib/services/vault.svelte.ts');
const LOADER = join(ROOT, 'src/lib/registrar/loadComplianceRows.js');
const RULES = join(ROOT, 'firestore.rules');
const VAULT_OPS = join(ROOT, 'functions/src/domains/vaultOps.js');
const SHRED_OPS = join(ROOT, 'functions/src/domains/shredOps.js');
const RETENTION = join(ROOT, 'src/lib/components/compliance/DirectorRetentionReport.svelte');

describe('Epic 2.2 — PII vault wiring', () => {
	it('passport save routes sensitive fields through buildVaultSealedPatch', () => {
		const src = readFileSync(PASSPORT, 'utf8');
		expect(src).toMatch(/buildVaultSealedPatch/);
		expect(src).toMatch(/hydrateSensitiveFieldsFromDoc/);
		expect(src).toMatch(/await setDoc\([\s\S]*?sealed/);
	});

	it('vault.svelte.ts exposes seal, hydrate, and strip helpers', () => {
		const src = readFileSync(VAULT, 'utf8');
		expect(src).toMatch(/vaultSealPii/);
		expect(src).toMatch(/vaultUnsealPii/);
		expect(src).toMatch(/buildVaultSealedPatch/);
		expect(src).toMatch(/hydrateSensitiveFieldsFromDoc/);
		expect(src).toMatch(/stripSensitivePlaintext/);
	});

	it('compliance matrix hydrates vaulted passport fields for director display', () => {
		const src = readFileSync(LOADER, 'utf8');
		expect(src).toMatch(/hydrateSensitiveFieldsFromDoc/);
	});

	it('firestore rules keep pii_vault Admin SDK-only', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/match \/pii_vault\/\{sealId\}/);
		expect(rules).toMatch(
			/match \/pii_vault\/\{sealId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});

	it('vaultOps and shredOps export scheduled/callable compliance functions', () => {
		expect(readFileSync(VAULT_OPS, 'utf8')).toMatch(/exports\.vaultSealPii/);
		expect(readFileSync(VAULT_OPS, 'utf8')).toMatch(/exports\.vaultUnsealPii/);
		expect(readFileSync(SHRED_OPS, 'utf8')).toMatch(/exports\.shredSensitiveData/);
	});

	it('DirectorRetentionReport uses us-east1 getRetentionReport', () => {
		expect(existsSync(RETENTION)).toBe(true);
		const src = readFileSync(RETENTION, 'utf8');
		expect(src).toMatch(/getRetentionReport/);
		expect(src).toMatch(/us-east1/);
	});
});
