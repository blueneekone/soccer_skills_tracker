/**
 * coach.layout.test.ts — Slice 5: Coach landing liquid bento regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe.skip('/coach — Liquid Bento (Sprint 1.1) [Legacy]', () => {
	it('workspace uses 12-column liquid bento grid', () => {
		const PAGE = join(__dirname, '..', '+page.svelte');
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('War Room HQ gated behind warRoomHqVisible with 8-column span', () => {
		const PAGE = join(__dirname, '..', '+page.svelte');
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/\{#if warRoomHqVisible\}/);
		expect(src).toMatch(/coach-os-war-room[\s\S]*tw-col-span-8|tw-col-span-8[\s\S]*coach-os-war-room/);
	});

	it('Facility Ops responsive span follows warRoomHqVisible (COACH-NEXUS-BENTO-FIX)', () => {
		const PAGE = join(__dirname, '..', '+page.svelte');
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/const warRoomHqVisible\s*=/);
		expect(src).toMatch(/coach-os-facility[\s\S]*class:bento-span-12=\{!warRoomHqVisible\}/);
		expect(src).toMatch(/coach-os-facility[\s\S]*class:tw-col-span-4=\{warRoomHqVisible\}/);
	});

	it('squad telemetry spans full width', () => {
		const PAGE = join(__dirname, '..', '+page.svelte');
		const src = readFileSync(PAGE, 'utf-8');
		expect(src).toMatch(/SquadTelemetryView[\s\S]*bento-span-12|bento-span-12[\s\S]*SquadTelemetryView/);
	});
});

describe('/coach/dashboard — Asymmetric Bento Layout', () => {
	it('uses asymmetric bento grid layout and panels', () => {
		const arena = readFileSync(join(__dirname, '..', 'dashboard', 'DashboardArena.svelte'), 'utf-8');
		const page = readFileSync(join(__dirname, '..', 'dashboard', '+page.svelte'), 'utf-8');
		expect(page).toContain('coach-nexus-canvas');
		expect(arena).toContain('coach-mainboard-grid');
	});
});
