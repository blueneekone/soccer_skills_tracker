/**
 * teamsSecurityRules.test.ts — Structural validation of teams security rules
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Teams Security Rules Structure', () => {
	it('enforces admin, director, and coach write permissions on teams collection', () => {
		const teamsBlock = RULES.match(/match \/teams\/\{teamId\}[\s\S]*?(?=match \/|$)/);
		expect(teamsBlock).not.toBeNull();
		const block = teamsBlock![0];

		expect(block).toMatch(/allow create:\s*if\s*isGlobalAdmin\(\)\s*\|\|\s*\(\(isDirector\(\)\s*\|\|\s*isCoach\(\)\)/);
		expect(block).toMatch(/allow update:\s*if\s*isGlobalAdmin\(\)\s*\|\|\s*\(\(isDirector\(\)\s*\|\|\s*isCoach\(\)\)/);
		expect(block).toMatch(/allow delete:\s*if\s*isGlobalAdmin\(\)\s*\|\|\s*\(\(isDirector\(\)\s*\|\|\s*isCoach\(\)\)/);
	});

	it('restricts reading teams to matching club or global admin', () => {
		const teamsBlock = RULES.match(/match \/teams\/\{teamId\}[\s\S]*?(?=match \/|$)/);
		expect(teamsBlock).not.toBeNull();
		const block = teamsBlock![0];

		expect(block).toMatch(/allow read:\s*if\s*isGlobalAdmin\(\)\s*\|\|\s*\(isAuthenticated\(\)/);
		expect(block).toMatch(/resource\.data\.clubId == request\.auth\.token\.clubId/);
	});
});
