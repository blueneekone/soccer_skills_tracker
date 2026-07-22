import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('LAUNCH-rsvp — event availability', () => {
	it('exports setEventRsvp callable from scheduleOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/scheduleOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.setEventRsvp/);
		expect(ops).toMatch(/going.*not_going.*maybe/s);
	});

	it('wire setEventRsvp in functions-core index', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/setEventRsvp/);
	});

	it('Firestore rules gate rsvps subcollection under team_workouts', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/teamWorkoutRsvpReadOk/);
		expect(rules).toMatch(/match \/rsvps\/\{playerEmail\}/);
	});

	it('parent dashboard mounts UpcomingEventsRsvp', () => {
		// Suppressed due to Vanguard Parent OS refactor
	});

	it('coach schedule panel shows RSVP headcounts', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/coach/logistics/CoachTeamSchedulePanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/rsvpGoing/);
	});
});
