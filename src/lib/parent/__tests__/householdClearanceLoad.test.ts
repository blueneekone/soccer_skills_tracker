import { describe, expect, it } from 'vitest';
import {
	fetchHouseholdClearance,
	guardsPassForHouseholdLoad,
	shouldClearLoadBusy,
	normalizeHouseholdId,
	HOUSEHOLD_CLEARANCE_TIMEOUT_MS,
} from '$lib/parent/loadHouseholdClearance.js';

describe('householdClearanceLoad guards', () => {
	it('guardsPassForHouseholdLoad rejects SSR, auth loading, and missing email', () => {
		expect(
			guardsPassForHouseholdLoad({ browser: false, authLoading: false, userEmail: 'a@b.com' }),
		).toBe(false);
		expect(
			guardsPassForHouseholdLoad({ browser: true, authLoading: true, userEmail: 'a@b.com' }),
		).toBe(false);
		expect(guardsPassForHouseholdLoad({ browser: true, authLoading: false, userEmail: '' })).toBe(
			false,
		);
		expect(
			guardsPassForHouseholdLoad({ browser: true, authLoading: false, userEmail: 'a@b.com' }),
		).toBe(true);
	});

	it('early-return guard paths imply loadBusy must be false (never infinite SCANNING)', () => {
		const earlyReturnCases = [
			{ browser: false, authLoading: false, userEmail: 'parent@test.com' },
			{ browser: true, authLoading: true, userEmail: 'parent@test.com' },
			{ browser: true, authLoading: false, userEmail: '' },
		];
		for (const input of earlyReturnCases) {
			expect(guardsPassForHouseholdLoad(input)).toBe(false);
		}
	});

	it('shouldClearLoadBusy only for the latest generation', () => {
		expect(shouldClearLoadBusy(true)).toBe(true);
		expect(shouldClearLoadBusy(false)).toBe(false);
	});

	it('normalizeHouseholdId trims and rejects empty', () => {
		expect(normalizeHouseholdId('  hh-1  ')).toBe('hh-1');
		expect(normalizeHouseholdId('')).toBe('');
		expect(normalizeHouseholdId(undefined)).toBe('');
	});

	it('exports 15s default timeout constant', () => {
		expect(HOUSEHOLD_CLEARANCE_TIMEOUT_MS).toBe(15_000);
	});
});

describe('fetchHouseholdClearance', () => {
	it('returns empty state when householdId is blank', async () => {
		const db = {} as import('firebase/firestore').Firestore;
		const result = await fetchHouseholdClearance(db, '');
		expect(result).toMatchObject({
			householdId: '',
			coppaSigned: false,
			loadErr: '',
			operativeRows: [],
		});
	});
});
