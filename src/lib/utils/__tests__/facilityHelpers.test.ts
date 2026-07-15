import { describe, it, expect } from 'vitest';
import { readFirestoreCoord, hydrateSig, parseFacilityMapData } from '../facilityHelpers.js';

describe('facilityHelpers', () => {
	describe('readFirestoreCoord', () => {
		it('returns number for valid numbers', () => {
			expect(readFirestoreCoord(45.123)).toBe(45.123);
		});
		
		it('parses valid strings', () => {
			expect(readFirestoreCoord('45.123')).toBe(45.123);
		});

		it('handles object with latitude', () => {
			expect(readFirestoreCoord({ latitude: 45.123 })).toBe(45.123);
		});

		it('returns undefined for invalid inputs', () => {
			expect(readFirestoreCoord('invalid')).toBeUndefined();
			expect(readFirestoreCoord(null)).toBeUndefined();
			expect(readFirestoreCoord({})).toBeUndefined();
		});
	});

	describe('hydrateSig', () => {
		it('creates correct signature from row', () => {
			const row = { latitude: 10, longitude: 20, mapData: 'test' };
			expect(hydrateSig(row)).toBe('10,20|test');
		});

		it('handles missing data', () => {
			const row = { latitude: 10 };
			expect(hydrateSig(row)).toBe('10,|');
		});
	});

	describe('parseFacilityMapData', () => {
		it('returns default object for invalid json', () => {
			const parsed = parseFacilityMapData('invalid');
			expect(parsed.version).toBe(1);
			expect(parsed.polygons.length).toBe(0);
			expect(parsed.markers.length).toBe(0);
		});

		it('parses valid polygons and markers', () => {
			const json = JSON.stringify({
				polygons: [{ name: 'Area', path: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 3 }] }],
				markers: [{ lat: 10, lng: 20 }]
			});
			const parsed = parseFacilityMapData(json);
			expect(parsed.polygons.length).toBe(1);
			expect(parsed.markers.length).toBe(1);
			expect(parsed.markers[0].lat).toBe(10);
		});
	});
});
