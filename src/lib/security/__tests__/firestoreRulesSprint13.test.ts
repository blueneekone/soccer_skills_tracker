/**
 * firestoreRulesSprint13.test.ts — Sprint 1.3 structural guards (no emulator)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 1.3 — Firestore rules structure', () => {
	it('defines JWT token partitioning helpers', () => {
		expect(RULES).toMatch(/function tokenClubMatchesDoc\(/);
		expect(RULES).toMatch(/function canReadUsersDocument\(/);
		expect(RULES).toMatch(/function canReadWorkoutDocument\(/);
		expect(RULES).toMatch(/function workoutInTokenClub\(/);
		expect(RULES).toMatch(/function canReadOrganization\(/);
	});

	it('users collection gates reads via canReadUsersDocument', () => {
		expect(RULES).toMatch(
			/match \/users\/\{userId\}[\s\S]*?allow read: if canReadUsersDocument\(userId\)/,
		);
	});

	it('top-level workouts enforce token club partition', () => {
		expect(RULES).toMatch(
			/match \/workouts\/\{docId\}[\s\S]*?allow read: if authed\(\) && canReadWorkoutDocument\(resource\.data\)/,
		);
	});

	it('clubs collection requires isAuthorized (not blanket authed)', () => {
		expect(RULES).toMatch(
			/match \/clubs\/\{clubId\}[\s\S]*?allow read: if isPlatformAdmin\(\) \|\| isAuthorized\(clubId\)/,
		);
		expect(RULES).not.toMatch(
			/match \/clubs\/\{clubId\}[\s\S]*?allow read: if authed\(\);/,
		);
	});

	it('organizations collection uses canReadOrganization', () => {
		expect(RULES).toMatch(
			/match \/organizations\/\{tenantId\}[\s\S]*?allow read: if canReadOrganization\(tenantId\)/,
		);
	});

	it('has no blanket allow read: if true', () => {
		expect(RULES).not.toMatch(/allow read: if true/);
	});
});
