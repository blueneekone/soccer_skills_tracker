import { describe, it, expect } from 'vitest';
import { toEpochMs } from '../timestamp.js';

describe('toEpochMs', () => {
	it('handles Date objects', () => {
		const d = new Date('2026-07-15T00:00:00.000Z');
		expect(toEpochMs(d)).toBe(1784073600000);
	});

	it('handles Firestore Timestamp objects', () => {
		const mockFirestoreTimestamp = {
			toDate: () => new Date('2026-07-15T00:00:00.000Z'),
		};
		expect(toEpochMs(mockFirestoreTimestamp)).toBe(1784073600000);
	});

	it('handles numbers', () => {
		expect(toEpochMs(1784073600000)).toBe(1784073600000);
	});

	it('handles valid strings', () => {
		expect(toEpochMs('2026-07-15T00:00:00.000Z')).toBe(1784073600000);
	});

	it('returns 0 for invalid or unparseable types', () => {
		expect(toEpochMs('invalid date')).toBe(0);
		expect(toEpochMs(null)).toBe(0);
		expect(toEpochMs(undefined)).toBe(0);
		expect(toEpochMs({})).toBe(0);
	});
});
