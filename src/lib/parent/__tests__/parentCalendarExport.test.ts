/**
 * parentCalendarExport.test.ts — LAUNCH-parent-ical guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	buildHouseholdIcsCalendar,
	escapeIcsText,
	formatIcsUtc,
} from '../householdCalendarIcs.js';

const ROOT = join(process.cwd());

describe('LAUNCH-parent-ical — ICS builder', () => {
	it('formatIcsUtc emits RFC 5545 UTC timestamps', () => {
		const ms = Date.parse('2026-06-15T18:00:00.000Z');
		expect(formatIcsUtc(ms)).toBe('20260615T180000Z');
	});

	it('escapeIcsText escapes special characters', () => {
		expect(escapeIcsText('Game; note, line\nbreak')).toBe(
			'Game\\; note\\, line\\nbreak',
		);
	});

	it('buildHouseholdIcsCalendar wraps VEVENT entries', () => {
		const ics = buildHouseholdIcsCalendar([
			{
				id: 'evt1',
				teamId: 'team-a',
				name: 'U12 Practice',
				kind: 'practice',
				startMs: Date.parse('2026-06-15T18:00:00.000Z'),
				endMs: Date.parse('2026-06-15T19:30:00.000Z'),
			},
		]);
		expect(ics).toMatch(/BEGIN:VCALENDAR/);
		expect(ics).toMatch(/BEGIN:VEVENT/);
		expect(ics).toMatch(/UID:evt1@sstracker\.app/);
		expect(ics).toMatch(/SUMMARY:U12 Practice/);
		expect(ics).toMatch(/DTEND:20260615T193000Z/);
		expect(ics).toMatch(/END:VCALENDAR/);
	});

	it('defaults end time when endMs is missing', () => {
		const startMs = Date.parse('2026-06-15T18:00:00.000Z');
		const ics = buildHouseholdIcsCalendar([
			{
				id: 'evt2',
				teamId: 'team-b',
				name: 'League Game',
				kind: 'game',
				startMs,
				endMs: null,
			},
		]);
		expect(ics).toMatch(/DTEND:20260615T200000Z/);
	});
});

describe('LAUNCH-parent-ical — wiring guards', () => {
	it('shared loader resolves team ids from child emails', () => {
		const src = readFileSync(
			join(ROOT, 'src/lib/parent/loadHouseholdScheduleEvents.ts'),
			'utf8',
		);
		expect(src).toMatch(/resolveTeamIdsForChildEmails/);
		expect(src).toMatch(/team_workouts/);
		expect(src).toMatch(/scheduled_event/);
	});

	it('UpcomingEventsRsvp exports household calendar download', () => {
		const src = readFileSync(
			join(ROOT, 'src/lib/components/parent/UpcomingEventsRsvp.svelte'),
			'utf8',
		);
		expect(src).toMatch(/loadHouseholdScheduleEvents/);
		expect(src).toMatch(/buildHouseholdIcsCalendar/);
		expect(src).toMatch(/downloadIcsFile/);
		expect(src).toMatch(/Add to calendar/);
	});
});
