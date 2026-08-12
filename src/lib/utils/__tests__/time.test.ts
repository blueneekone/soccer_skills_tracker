import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatFixtureDateFull, toMs } from '../time.js';

describe('time.ts utilities', () => {
    describe('toMs', () => {
        it('returns null for null or undefined', () => {
            expect(toMs(null)).toBeNull();
            expect(toMs(undefined)).toBeNull();
        });

        it('returns time in ms for Date object', () => {
            const d = new Date('2024-05-27T17:00:00.000Z');
            expect(toMs(d)).toBe(d.getTime());
        });

        it('returns time in ms for number', () => {
            const ms = 1716829200000;
            expect(toMs(ms)).toBe(ms);
        });

        it('returns time in ms for valid date string', () => {
            const d = new Date('2024-05-27T17:00:00.000Z');
            expect(toMs('2024-05-27T17:00:00.000Z')).toBe(d.getTime());
        });

        it('handles Firestore Timestamp with toDate()', () => {
            const mockTimestamp = {
                toDate: () => new Date('2024-05-27T17:00:00.000Z')
            };
            expect(toMs(mockTimestamp)).toBe(1716829200000);
        });

        it('handles Firestore Timestamp plain shape { seconds, nanoseconds }', () => {
            const plainTimestamp = {
                seconds: 1716829200,
                nanoseconds: 500000000
            };
            expect(toMs(plainTimestamp)).toBe(1716829200500);
        });

        it('returns null for invalid strings', () => {
            expect(toMs('invalid date string')).toBeNull();
        });

        it('returns null for invalid Date objects', () => {
            expect(toMs(new Date('invalid'))).toBeNull();
        });
    });

    describe('formatFixtureDateFull', () => {
        const EMPTY = {
            day: '—', date: '—', time: '—', tzAbbr: '—', hasTzMismatch: false, full: '—',
        };

        beforeEach(() => {
            // Default mock for browser timezone
            vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
                locale: 'en-US',
                calendar: 'gregory',
                numberingSystem: 'latn',
                timeZone: 'America/Denver',
            } as Intl.ResolvedDateTimeFormatOptions);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('returns EMPTY for null or undefined', () => {
            expect(formatFixtureDateFull(null)).toEqual(EMPTY);
            expect(formatFixtureDateFull(undefined)).toEqual(EMPTY);
        });

        it('formats valid date string using browser timezone', () => {
            const d = new Date('2024-05-27T23:00:00Z'); // 23:00 UTC = 17:00 MDT
            const result = formatFixtureDateFull(d);

            expect(result.day).toBe('MON');
            expect(result.date).toBe('27 MAY');
            expect(result.time).toMatch(/5:00\sPM/);
            expect(result.hasTzMismatch).toBe(false);
            expect(result.full).toContain('MON 27 MAY');
            expect(result.full).toContain('5:00 PM');
        });

        it('formats using facilityTimezone and flags mismatch', () => {
            const d = new Date('2024-05-27T23:00:00Z');

            // Expected for America/New_York is 19:00 EDT (or EST depending on daylight savings, but it works)
            const result = formatFixtureDateFull(d, 'America/New_York');

            expect(result.time).toMatch(/7:00\sPM/);
            expect(result.hasTzMismatch).toBe(true);
        });

        it('formats using facilityTimezone and does not flag mismatch when same as browser', () => {
            const d = new Date('2024-05-27T23:00:00Z');

            const result = formatFixtureDateFull(d, 'America/Denver');

            expect(result.time).toMatch(/5:00\sPM/);
            expect(result.hasTzMismatch).toBe(false);
        });

        it('falls back to browser timezone if facilityTimezone is invalid', () => {
            const d = new Date('2024-05-27T23:00:00Z');

            const result = formatFixtureDateFull(d, 'Invalid/Timezone');

            // Should use America/Denver
            expect(result.time).toMatch(/5:00\sPM/);
            expect(result.hasTzMismatch).toBe(false);
        });
    });
});