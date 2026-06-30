/**
 * commsSprint46.test.ts — Epic 4.6 game + payment/registration reminder guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const dispatcher = readFileSync(join(ROOT, '..', '..', 'functions', 'dispatcher.js'), 'utf8');
const indexJs = readFileSync(join(ROOT, '..', '..', 'functions', 'index.js'), 'utf8');
const indexes = readFileSync(join(ROOT, '..', '..', 'firestore.indexes.json'), 'utf8');
const seasonPanel = readFileSync(
	join(ROOT, 'components', 'director', 'DirectorActiveSeasonPanel.svelte'),
	'utf8',
);
const licensesTab = readFileSync(join(ROOT, 'components', 'director', 'LicensesTab.svelte'), 'utf8');

describe.skip('Epic 4.6 — scheduled event reminders (game)', () => {
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

describe.skip('Epic 4.6 — payment & registration reminders', () => {
	it('exports sendRegistrationPaymentReminders daily scheduler', () => {
		expect(dispatcher).toMatch(/exports\.sendRegistrationPaymentReminders\s*=\s*onSchedule/);
		expect(indexJs).toMatch(
			/exports\.sendRegistrationPaymentReminders\s*=\s*dispatcherHandlers\.sendRegistrationPaymentReminders/,
		);
	});

	it('nudges pending/failed season_registrations with paymentRemindersSent dedup', () => {
		const block = dispatcher.slice(dispatcher.indexOf('sendRegistrationPaymentReminders'));
		expect(block).toMatch(/paymentStatus['"],\s*['"]==['"],\s*['"]pending['"]/);
		expect(block).toMatch(/paymentStatus['"],\s*['"]==['"],\s*['"]failed['"]/);
		expect(block).toMatch(/paymentRemindersSent/);
		expect(block).toMatch(/['"]push_paymentReminders['"]/);
		expect(block).toMatch(/\/parent\/payments/);
	});

	it('deadline fan-out uses organizations.activeSeason.registrationDeadline offsets 7/3/1/0', () => {
		const block = dispatcher.slice(dispatcher.indexOf('sendRegistrationPaymentReminders'));
		expect(block).toMatch(/registrationDeadline/);
		expect(block).toMatch(/PAYMENT_DEADLINE_OFFSETS\s*=\s*\[7,\s*3,\s*1,\s*0\]/);
		expect(block).toMatch(/activeSeason\.remindersSent/);
		expect(block).toMatch(/collectUnpaidPlayerEmails/);
	});

	it('push_paymentReminders defaults on for parents only', () => {
		expect(dispatcher).toMatch(/push_paymentReminders:\s*\{parent:\s*true,\s*default:\s*false\}/);
	});

	it('director configures deadline via DirectorActiveSeasonPanel on Licenses tab', () => {
		expect(seasonPanel).toMatch(/registrationDeadline/);
		expect(seasonPanel).toMatch(/organizations/);
		expect(licensesTab).toMatch(/DirectorActiveSeasonPanel/);
	});
});
