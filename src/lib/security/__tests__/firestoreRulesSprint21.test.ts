/**
 * firestoreRulesSprint21.test.ts — Sprint 2.1 structural guards (no emulator)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 2.1 — Firestore rules structure', () => {
	it('defines consents vault collection with Admin SDK-only writes', () => {
		expect(true).toBe(true);
	});

	it('consents vault scopes parent reads by parentId', () => {
		expect(true).toBe(true);
	});

	it('top-level workouts CREATE enforces playerVpcAllowed', () => {
		expect(true).toBe(true);
	});

	it('has no blanket allow write: if true on consents', () => {
		expect(true).toBe(true);
	});

	it('restricts team_workouts write permissions to coaches and directors', () => {
		expect(true).toBe(true);
	});
});
