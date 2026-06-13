/**
 * parentWeekSchedule.test.ts — LAUNCH-parent-week guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	filterEventsThisWeek,
	type HouseholdScheduleEvent,
} from '../loadHouseholdScheduleEvents.js';

const ROOT = join(process.cwd());

describe('LAUNCH-parent-week — filterEventsThisWeek', () => {
	const base: HouseholdScheduleEvent = {
		id: 'a',
		teamId: 't1',
		name: 'Practice',
		kind: 'practice',
		startMs: 0,
		endMs: null,
	};

	it('includes events within 7 days from today', () => {
		const now = Date.parse('2026-06-10T12:00:00.000Z');
		const tomorrow = Date.parse('2026-06-11T18:00:00.000Z');
		const nextWeek = Date.parse('2026-06-18T18:00:00.000Z');
		const filtered = filterEventsThisWeek(
			[
				{ ...base, id: 'in', startMs: tomorrow },
				{ ...base, id: 'out', startMs: nextWeek },
			],
			now,
		);
		expect(filtered.map((e) => e.id)).toEqual(['in']);
	});
});

describe('LAUNCH-parent-week — wiring', () => {
	it('ParentWeekScheduleStrip mounted on parent dashboard', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/parent/dashboard/+page.svelte'),
			'utf8',
		);
		expect(page).toMatch(/ParentWeekScheduleStrip/);
		const strip = readFileSync(
			join(ROOT, 'src/lib/components/parent/ParentWeekScheduleStrip.svelte'),
			'utf8',
		);
		expect(strip).toMatch(/This week/);
		expect(strip).toMatch(/filterEventsThisWeek/);
	});
});
