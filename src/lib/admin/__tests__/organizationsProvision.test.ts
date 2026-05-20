import { describe, expect, it } from 'vitest';
import { validateAddClubInput } from '$lib/admin/organizationsProvision.js';
import type { AdminAddClubInput } from '$lib/types/adminOrganizations.js';

const baseInput = (): AdminAddClubInput => ({
	clubId: 'aggiesfc',
	clubName: 'Aggie FC',
	sport: 'soccer',
	newSportMode: false,
	newSportName: '',
	newSportIcon: 'ph-soccer-ball',
	directorEmail: '',
	verifiedAddress: '',
	phoneNumber: '',
	primaryFacility: '',
});

describe('organizationsProvision.validateAddClubInput', () => {
	it('returns null for a valid minimal payload', () => {
		expect(validateAddClubInput(baseInput())).toBeNull();
	});

	it('requires club id and name', () => {
		expect(validateAddClubInput({ ...baseInput(), clubId: '  ' })).toMatch(/required/i);
		expect(validateAddClubInput({ ...baseInput(), clubName: '' })).toMatch(/required/i);
	});

	it('rejects invalid club id slugs', () => {
		expect(validateAddClubInput({ ...baseInput(), clubId: 'Bad ID!' })).toMatch(/Club ID/i);
	});

	it('requires sport name when creating a new sport module', () => {
		expect(
			validateAddClubInput({ ...baseInput(), newSportMode: true, newSportName: '   ' }),
		).toMatch(/Sport name/i);
	});

	it('validates director email when provided', () => {
		expect(validateAddClubInput({ ...baseInput(), directorEmail: 'not-an-email' })).toMatch(
			/email/i,
		);
	});

	it('validates phone format when provided', () => {
		expect(validateAddClubInput({ ...baseInput(), phoneNumber: 'abc' })).toMatch(/Phone/i);
		expect(validateAddClubInput({ ...baseInput(), phoneNumber: '+15125550100' })).toBeNull();
	});
});
