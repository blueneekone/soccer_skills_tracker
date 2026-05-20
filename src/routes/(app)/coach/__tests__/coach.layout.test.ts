/**
 * coach.layout.test.ts — Slice 5: Coach landing liquid bento regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/coach — Liquid Bento (Sprint 1.1)', () => {
	it('workspace uses 12-column liquid bento grid', () => {
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('War Room hero spans 8 columns', () => {
		expect(src).toMatch(/bento-span-8/);
	});

	it('secondary ops panel spans 4 columns', () => {
		expect(src).toMatch(/bento-span-4/);
	});

	it('squad telemetry spans full width', () => {
		expect(src).toMatch(/SquadTelemetryView[\s\S]*bento-span-12|bento-span-12[\s\S]*SquadTelemetryView/);
	});
});
