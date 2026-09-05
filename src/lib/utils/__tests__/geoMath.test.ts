import { describe, it, expect } from 'vitest';
import {
	calculateHaversineDistance,
	calculateBearing,
	bearingToCompass,
	latLngToTile,
	getDestinationPoint,
} from '../geoMath.js';

describe('geoMath', () => {
	it('calculates accurate haversine distance', () => {
		// New York to Philadelphia ~ 80 miles
		const d = calculateHaversineDistance(40.7128, -74.006, 39.9526, -75.1652);
		expect(d).toBeGreaterThan(78);
		expect(d).toBeLessThan(85);
	});

	it('calculates accurate bearing and compass heading', () => {
		// Due north
		const bNorth = calculateBearing(40.0, -75.0, 41.0, -75.0);
		expect(Math.round(bNorth)).toBe(0);
		expect(bearingToCompass(bNorth)).toBe('N');

		// Due east
		const bEast = calculateBearing(40.0, -75.0, 40.0, -74.0);
		expect(Math.round(bEast)).toBe(90);
		expect(bearingToCompass(bEast)).toBe('E');

		// Northwest
		const bNW = calculateBearing(40.0, -75.0, 41.0, -76.0);
		expect(bearingToCompass(bNW)).toBe('NW');
	});

	it('converts lat/lng to Slippy map tile coords', () => {
		const tile = latLngToTile(41.633, -111.851, 10);
		expect(tile.x).toBeGreaterThan(0);
		expect(tile.y).toBeGreaterThan(0);
		expect(Math.floor(tile.x)).toBe(193);
		expect(Math.floor(tile.y)).toBe(381);
	});

	it('projects destination point from origin with distance and bearing', () => {
		const originLat = 41.633;
		const originLng = -111.851;
		const dest = getDestinationPoint(originLat, originLng, 10, 90);
		const dist = calculateHaversineDistance(originLat, originLng, dest.lat, dest.lng);
		expect(Math.round(dist)).toBe(10);
	});
});
