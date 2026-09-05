/**
 * geoMath.ts — Geospatial and Cartographic Navigation Math
 * ─────────────────────────────────────────────────────────────
 * Provides Haversine distance, Great Circle bearings, Slippy map tile
 * projections, and destination point coordinates.
 */

const EARTH_RADIUS_MILES = 3958.8;

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @returns Distance in statute miles
 */
export function calculateHaversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return EARTH_RADIUS_MILES * c;
}

/**
 * Calculates the initial forward bearing from point 1 to point 2 in degrees (0..360).
 */
export function calculateBearing(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const phi1 = (lat1 * Math.PI) / 180;
	const phi2 = (lat2 * Math.PI) / 180;
	const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

	const y = Math.sin(deltaLambda) * Math.cos(phi2);
	const x =
		Math.cos(phi1) * Math.sin(phi2) -
		Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

	const theta = Math.atan2(y, x);
	return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Converts a degree bearing to an 8-point compass cardinal string.
 */
export function bearingToCompass(deg: number): string {
	const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
	const normalized = (deg % 360 + 360) % 360;
	const index = Math.round(normalized / 45) % 8;
	return cardinals[index];
}

/**
 * Converts WGS-84 lat/lng coordinates to Slippy Map tile coordinates at a given zoom level.
 */
export function latLngToTile(
	lat: number,
	lng: number,
	zoom: number
): { x: number; y: number } {
	const latRad = (lat * Math.PI) / 180;
	const n = 2 ** zoom;
	const x = ((lng + 180) / 360) * n;
	const y =
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
	return { x, y };
}

/**
 * Calculates a new destination point given an origin, distance (miles), and bearing (degrees).
 */
export function getDestinationPoint(
	lat: number,
	lon: number,
	distanceMiles: number,
	bearingDeg: number
): { lat: number; lng: number } {
	const delta = distanceMiles / EARTH_RADIUS_MILES;
	const theta = (bearingDeg * Math.PI) / 180;
	const phi1 = (lat * Math.PI) / 180;
	const lambda1 = (lon * Math.PI) / 180;

	const phi2 = Math.asin(
		Math.sin(phi1) * Math.cos(delta) +
			Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
	);
	const lambda2 =
		lambda1 +
		Math.atan2(
			Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
			Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
		);

	return {
		lat: (phi2 * 180) / Math.PI,
		lng: (((lambda2 * 180) / Math.PI + 540) % 360) - 180,
	};
}
