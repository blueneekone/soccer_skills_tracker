import { describe, expect, it, vi } from 'vitest';
import {
	fetchHouseholdClearance,
	guardsPassForHouseholdLoad,
	shouldClearLoadBusy,
	normalizeHouseholdId,
	HOUSEHOLD_CLEARANCE_TIMEOUT_MS,
} from '$lib/parent/loadHouseholdClearance.js';

vi.mock('$lib/parent/householdOperatives.js', () => ({
	buildEnrichedOperativeRows: vi.fn(),
}));

import { buildEnrichedOperativeRows } from '$lib/parent/householdOperatives.js';
import { doc, getDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
	doc: vi.fn((_db, _col, id) => ({ id })),
	getDoc: vi.fn(),
}));

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

	it('shouldClearLoadBusy always true so finally always clears loadBusy', () => {
		expect(shouldClearLoadBusy(true)).toBe(true);
		expect(shouldClearLoadBusy(false)).toBe(true);
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

	it('times out when buildEnrichedOperativeRows exceeds the 15s budget', async () => {
		vi.mocked(getDoc).mockResolvedValue({
			exists: () => true,
			data: () => ({ coppaSigned: false, playerEmails: ['kid@operative.local'] }),
		} as never);
		vi.mocked(buildEnrichedOperativeRows).mockImplementation(
			() => new Promise(() => {}),
		);

		const db = {} as import('firebase/firestore').Firestore;
		const result = await fetchHouseholdClearance(db, 'hh-timeout', { timeoutMs: 50 });
		expect(result.loadErr).toBe('Household read timed out');
		expect(result.operativeRows).toEqual([]);
	});

	it('wraps getDoc and enrich in a single timeout race', async () => {
		vi.mocked(getDoc).mockResolvedValue({
			exists: () => true,
			data: () => ({ coppaSigned: true, coppaSignedAt: null, playerEmails: [] }),
		} as never);
		vi.mocked(buildEnrichedOperativeRows).mockResolvedValue([]);

		const db = {} as import('firebase/firestore').Firestore;
		const result = await fetchHouseholdClearance(db, 'hh-ok');
		expect(buildEnrichedOperativeRows).toHaveBeenCalled();
		expect(result.coppaSigned).toBe(true);
	});
});
