import type { HouseholdScheduleEvent } from './loadHouseholdScheduleEvents.js';

/** RFC 5545 UTC date-time: YYYYMMDDTHHMMSSZ */
export function formatIcsUtc(ms: number): string {
	return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function escapeIcsText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

function defaultEndMs(event: HouseholdScheduleEvent): number {
	if (event.endMs != null && event.endMs > event.startMs) return event.endMs;
	const minutes = event.kind.toLowerCase() === 'game' ? 120 : 90;
	return event.startMs + minutes * 60_000;
}

/**
 * Build a VCALENDAR document for household team events (Apple/Google/Outlook import).
 */
export function buildHouseholdIcsCalendar(
	events: HouseholdScheduleEvent[],
	calendarName = 'SSTracker household schedule',
): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//SSTracker//Household Calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeIcsText(calendarName)}`,
	];

	const stamp = formatIcsUtc(Date.now());

	for (const ev of events) {
		lines.push(
			'BEGIN:VEVENT',
			`UID:${ev.id}@sstracker.app`,
			`DTSTAMP:${stamp}`,
			`DTSTART:${formatIcsUtc(ev.startMs)}`,
			`DTEND:${formatIcsUtc(defaultEndMs(ev))}`,
			`SUMMARY:${escapeIcsText(ev.name)}`,
			`DESCRIPTION:${escapeIcsText(`${ev.kind} · SSTracker team event`)}`,
			'END:VEVENT',
		);
	}

	lines.push('END:VCALENDAR');
	return `${lines.join('\r\n')}\r\n`;
}

/** Trigger a browser download of an `.ics` file. */
export function downloadIcsFile(ics: string, filename: string): void {
	if (typeof document === 'undefined') return;
	const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
