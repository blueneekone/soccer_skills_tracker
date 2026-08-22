/**
 * firestoreRulesSprint21.test.ts — Sprint 2.1 structural guards (no emulator)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 2.1 — Firestore rules structure', () => {
	it('defines consents vault collection with Admin SDK-only writes', () => {
		expect(RULES).toMatch(/match \/consents\/\{consentId\}/);
		expect(RULES).toMatch(
			/match \/consents\/\{consentId\}[\s\S]*?allow create, update, delete: if false/,
		);
	});

	it('consents vault scopes parent reads by parentId', () => {
		expect(RULES).toMatch(
			/match \/consents\/\{consentId\}[\s\S]*?isParent\(\) && resource\.data\.parentId == emailKey\(\)/,
		);
	});

	it('top-level workouts CREATE enforces playerVpcAllowed', () => {
		expect(RULES).toMatch(
			/match \/workouts\/\{docId\}[\s\S]*?allow create: if authed\(\) && playerVpcAllowed\(\)/,
		);
	});

	it('has no blanket allow write: if true on consents', () => {
		const consentsBlock = RULES.match(/match \/consents\/\{consentId\}[\s\S]*?(?=match \/|$)/);
		expect(consentsBlock).not.toBeNull();
		expect(consentsBlock![0]).not.toMatch(/allow write: if true/);
	});

	it('restricts team_workouts write permissions to coaches and directors', () => {
		expect(RULES).toMatch(/match \/team_workouts\/\{workoutId\}/);
		expect(RULES).toMatch(
			/match \/team_workouts\/\{workoutId\}[\s\S]*?allow read: if isAuthenticated\(\);[\s\S]*?allow write: if isCoach\(\) \|\| isDirector\(\);/,
		);
		const workoutsBlock = RULES.match(/match \/team_workouts\/\{workoutId\}[\s\S]*?(?=match \/|$)/);
		expect(workoutsBlock).not.toBeNull();
		expect(workoutsBlock![0]).not.toMatch(/allow read,\s*write:\s*if\s*isAuthenticated\(\);/);
	});
});
