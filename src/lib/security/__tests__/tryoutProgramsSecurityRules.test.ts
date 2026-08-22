/**
 * tryoutProgramsSecurityRules.test.ts — Structural validation of tryout_programs security rules
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Tryout Programs Security Rules Structure', () => {
	it('defines isClubStaff helper checking director, coach, registrar, and global admin roles', () => {
		expect(RULES).toMatch(/function isClubStaff\(\)/);
		expect(RULES).toMatch(/request\.auth\.token\.role == 'director'/);
		expect(RULES).toMatch(/request\.auth\.token\.role == 'coach'/);
		expect(RULES).toMatch(/request\.auth\.token\.role == 'registrar'/);
	});

	it('gates read access to tryout_programs with clubId scoping and isClubStaff or isGlobalAdmin', () => {
		const tryoutsBlock = RULES.match(/match \/tryout_programs\/\{programId\}[\s\S]*?(?=match \/club_playbooks|$)/);
		expect(tryoutsBlock).not.toBeNull();
		const block = tryoutsBlock![0];

		expect(block).toMatch(/allow read:\s*if\s*isGlobalAdmin\(\)\s*\|\|\s*\(isClubStaff\(\)\s*&&\s*request\.auth\.token\.clubId != null\s*&&\s*resource\.data\.clubId == request\.auth\.token\.clubId\);/);
	});

	it('restricts direct client writes on tryout_programs to isGlobalAdmin', () => {
		const tryoutsBlock = RULES.match(/match \/tryout_programs\/\{programId\}[\s\S]*?(?=match \/club_playbooks|$)/);
		expect(tryoutsBlock).not.toBeNull();
		const block = tryoutsBlock![0];

		expect(block).toMatch(/allow write:\s*if\s*isGlobalAdmin\(\);/);
	});

	it('gates subcollections (registrations, sessions, evaluations, comms) to matching club staff or isGlobalAdmin', () => {
		const tryoutsBlock = RULES.match(/match \/tryout_programs\/\{programId\}[\s\S]*?(?=match \/club_playbooks|$)/);
		expect(tryoutsBlock).not.toBeNull();
		const block = tryoutsBlock![0];

		expect(block).toMatch(/match \/registrations\/\{registrationId\}/);
		expect(block).toMatch(/match \/sessions\/\{sessionId\}/);
		expect(block).toMatch(/match \/evaluations\/\{registrationId\}/);
		expect(block).toMatch(/match \/comms\/\{commId\}/);

		// Check subcollection read lookup
		expect(block).toMatch(/get\(\/databases\/\$\(database\)\/documents\/tryout_programs\/\$\(programId\)\)\.data\.clubId == request\.auth\.token\.clubId/);
	});
});
