/**
 * Slice 5 — AttributeRadar lives under $lib (not route-relative imports).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LIB_RADAR = join(
	process.cwd(),
	'src',
	'lib',
	'components',
	'player',
	'dashboard',
	'AttributeRadar.svelte',
);
const ROUTE_RADAR = join(
	process.cwd(),
	'src',
	'routes',
	'(app)',
	'player',
	'dashboard',
	'AttributeRadar.svelte',
);
const VPP = join(
	process.cwd(),
	'src',
	'lib',
	'components',
	'player',
	'dashboard',
	'VanguardProtocolPanel.svelte',
);

describe('Slice 5 — AttributeRadar module location', () => {
	it('AttributeRadar.svelte exists under $lib/components/player/dashboard', () => {
		expect(existsSync(LIB_RADAR)).toBe(true);
	});

	it('route-local AttributeRadar.svelte is removed', () => {
		expect(existsSync(ROUTE_RADAR)).toBe(false);
	});

	it('VanguardProtocolPanel imports AttributeRadar from $lib', () => {
		const src = readFileSync(VPP, 'utf-8');
		expect(src).toMatch(/\$lib\/components\/player\/dashboard\/AttributeRadar\.svelte/);
		expect(src).not.toMatch(/routes\/\(app\)\/player\/dashboard\/AttributeRadar/);
	});
});
