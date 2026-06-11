/**
 * epic54WeatherLock.test.ts — Epic 5.4 weather lock scaffold guards
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const ROOT = join(process.cwd());
const WEATHER_OPS = join(ROOT, 'functions/src/domains/weatherOps.js');
const INDEX = join(ROOT, 'functions/index.js');
const FIELD_OPS = join(ROOT, 'src/lib/components/director/os/FieldOpsModule.svelte');
const CAL = join(ROOT, 'src/lib/components/director/os/DeploymentCalendar.svelte');
const RULES = join(ROOT, 'firestore.rules');
const DESIGN = join(ROOT, 'docs/WEATHER_LOCK_DESIGN.md');

describe('Epic 5.4 — field weather lock', () => {
	it('weatherOps exports scheduled evaluateFieldWeatherLock with feature flag', () => {
		const src = readFileSync(WEATHER_OPS, 'utf8');
		expect(src).toMatch(/exports\.evaluateFieldWeatherLock\s*=/);
		expect(src).toMatch(/WEATHER_LOCK_ENABLED/);
		expect(src).toMatch(/field_weather_status/);
		expect(src).toMatch(/haversineKm/);
		expect(src).toMatch(/weatherEvaluation/);
		expect(src).not.toMatch(/evaluateWeatherStub/);
	});

	it('weatherEvaluation maps DANGER alerts to locked field status', () => {
		const { mapSnapshotToFieldStatus } = require(join(ROOT, 'functions/src/domains/weatherEvaluation.js'));
		const status = mapSnapshotToFieldStatus({
			lightning: { alertLevel: 'DANGER', estimatedMiles: 5, nwsEvent: 'Severe Thunderstorm Warning' },
			deploymentStatus: 'NO-GO',
		});
		expect(status.status).toBe('locked');
		expect(status.provider).toBe('aegis');
	});

	it('functions index re-exports evaluateFieldWeatherLock', () => {
		const idx = readFileSync(INDEX, 'utf8');
		expect(idx).toMatch(/weatherOps/);
		expect(idx).toMatch(/evaluateFieldWeatherLock/);
	});

	it('firestore.rules defines field_weather_status director read, CF-only write', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/match \/field_weather_status\/\{facilityId\}/);
		expect(rules).toMatch(/allow create, update, delete: if false/);
	});

	it('FieldOpsModule surfaces weather lock advisory banner', () => {
		const src = readFileSync(FIELD_OPS, 'utf8');
		expect(src).toMatch(/field_weather_status/);
		expect(src).toMatch(/Weather lock active/);
		expect(src).toMatch(/Weather advisory/);
	});

	it('DeploymentCalendar blocks schedule on locked facilities', () => {
		const src = readFileSync(CAL, 'utf8');
		expect(src).toMatch(/weatherStatusByFacility/);
		expect(src).toMatch(/weather-locked/);
		expect(src).toMatch(/status === 'locked'/);
	});

	it('WEATHER_LOCK_DESIGN documents secrets and scheduled evaluator', () => {
		const doc = readFileSync(DESIGN, 'utf8');
		expect(doc).toMatch(/evaluateFieldWeatherLock/);
		expect(doc).toMatch(/TOMORROW_IO_API_KEY/);
	});
});

describe('Epic 5.4 — haversine unit', () => {
	const { haversineKm } = require(join(ROOT, 'functions/src/domains/weatherOps.js'));

	it('returns ~0 km for identical coordinates', () => {
		expect(haversineKm(40.7128, -74.006, 40.7128, -74.006)).toBeCloseTo(0, 3);
	});

	it('returns plausible NYC–Philadelphia distance (~129 km)', () => {
		const km = haversineKm(40.7128, -74.006, 39.9526, -75.1652);
		expect(km).toBeGreaterThan(120);
		expect(km).toBeLessThan(140);
	});
});
