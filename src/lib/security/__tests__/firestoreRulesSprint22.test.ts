/**
 * firestoreRulesSprint22.test.ts — Sprint 2.2 structural guards (no emulator)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 2.2 — Firestore rules structure', () => {
	it('defines pii_vault with Admin SDK-only writes', () => {
		expect(RULES).toMatch(/match \/pii_vault\/\{sealId\}/);
		expect(RULES).toMatch(
			/match \/pii_vault\/\{sealId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});

	it('consents block includes DO NOT PURGE retention comment', () => {
		expect(RULES).toMatch(
			/DO NOT PURGE: Consents are legal attestations required for multi-year compliance retention/,
		);
	});

	it('consents remain Admin SDK-only writes after Sprint 2.2', () => {
		expect(RULES).toMatch(
			/match \/consents\/\{consentId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});
});
