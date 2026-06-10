/**
 * commsSprint46.test.ts — Epic 4.6 game reminder guards (source-scan)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dispatcher = readFileSync(resolve('functions/dispatcher.js'), 'utf8');
const indexJs = readFileSync(resolve('functions/index.js'), 'utf8');
const indexes = readFileSync(resolve('firestore.indexes.json'), 'utf8');

describe('Epic 4.6 — scheduled event reminders (game)', () => {
	it('exports sendScheduledEventReminders from dispatcher.js', () => {
		expect(dispatcher).toMatch(/exports\.sendScheduledEventReminders\s*=\s*onSchedule/);
	});

	it('runs every 15 minutes in America/Denver', () => {
		expect(dispatcher).toMatch(/schedule:\s*['"]every 15 minutes['"]/);
		expect(dispatcher).toMatch(/timeZone:\s*REMINDER_TZ/);
	});

	it('queries team_workouts scheduled_event by startTimestamp window', () => {
		expect(dispatcher).toMatch(/collection\(['"]team_workouts['"]\)/);
		expect(dispatcher).toMatch(/where\(['"]recordType['"],\s*['"]==['"],\s*['"]scheduled_event['"]\)/);
		expect(dispatcher).toMatch(/where\(['"]startTimestamp['"],\s*['"]>=['"]/);
		expect(dispatcher).toMatch(/reminderOffsets/);
	});

	it('dedupes via remindersSent map on the event doc', () => {
		expect(dispatcher).toMatch(/remindersSent/);
		expect(dispatcher).toMatch(/remindersSent\.\$\{key\}/);
	});

	it('dispatches with push_gameReminders category', () => {
		expect(dispatcher).toMatch(/['"]push_gameReminders['"]/);
	});

	it('handles morning offset sentinel', () => {
		expect(dispatcher).toMatch(/offset === 'morning'/);
		expect(dispatcher).toMatch(/shouldFireReminderOffset/);
	});

	it('is exported from functions/index.js', () => {
		expect(indexJs).toMatch(
			/exports\.sendScheduledEventReminders\s*=\s*dispatcherHandlers\.sendScheduledEventReminders/,
		);
	});

	it('has composite index recordType + startTimestamp on team_workouts', () => {
		expect(indexes).toMatch(/"fieldPath":\s*"recordType"/);
		expect(indexes).toMatch(/"fieldPath":\s*"startTimestamp"/);
	});
});
