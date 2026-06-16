/**
 * liveStreamLaunch.test.ts — LAUNCH-live-stream guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	isAllowlistedEmbedUrl,
	normalizeLiveStreamUrl,
	parseLiveStreamUrl,
} from '../liveStreamEmbed.js';

const ROOT = join(process.cwd());

describe('LAUNCH-live-stream — embed allowlist', () => {
	it('accepts YouTube watch and youtu.be links', () => {
		const watch = parseLiveStreamUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(watch?.provider).toBe('youtube');
		expect(watch?.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');

		const short = parseLiveStreamUrl('https://youtu.be/dQw4w9WgXcQ');
		expect(short?.embedUrl).toContain('youtube.com/embed/');
	});

	it('accepts Vimeo and Mux player URLs', () => {
		const vimeo = parseLiveStreamUrl('https://vimeo.com/123456789');
		expect(vimeo?.provider).toBe('vimeo');
		expect(vimeo?.embedUrl).toBe('https://player.vimeo.com/video/123456789');

		const mux = parseLiveStreamUrl('https://stream.mux.com/abc123XYZ');
		expect(mux?.provider).toBe('mux');
		expect(mux?.embedUrl).toBe('https://player.mux.com/abc123XYZ');
	});

	it('rejects non-HTTPS and unknown hosts', () => {
		expect(parseLiveStreamUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
		expect(parseLiveStreamUrl('https://evil.example/live')).toBeNull();
		expect(normalizeLiveStreamUrl('https://twitch.tv/foo')).toBeNull();
	});

	it('embed URLs must pass iframe allowlist', () => {
		const parsed = parseLiveStreamUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(parsed && isAllowlistedEmbedUrl(parsed.embedUrl)).toBe(true);
		expect(isAllowlistedEmbedUrl('https://evil.example/embed')).toBe(false);
	});
});

describe('LAUNCH-live-stream — wiring', () => {
	it('saveTeamScheduledEvent accepts liveStreamUrl', () => {
		const workouts = readFileSync(join(ROOT, 'src/lib/stores/workouts.svelte.js'), 'utf8');
		expect(workouts).toMatch(/liveStreamUrl/);
		expect(workouts).toMatch(/normalizeLiveStreamUrl/);
	});

	it('coach schedule panel exposes live stream paste field', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/coach/logistics/CoachTeamSchedulePanel.svelte'),
			'utf8',
		);
		expect(panel).toMatch(/liveStreamUrl/);
		expect(panel).toMatch(/Live stream URL/);
	});

	it('CoachMatchDayView persists liveStreamUrl on match_sessions', () => {
		const view = readFileSync(
			join(ROOT, 'src/lib/coach/match-day/CoachMatchDayView.svelte'),
			'utf8',
		);
		expect(view).toMatch(/liveStreamUrl/);
		expect(view).toMatch(/match_sessions/);
		expect(view).toMatch(/normalizeLiveStreamUrl/);
	});

	it('LiveStreamEmbed applies teen guard instead of iframe', () => {
		const embed = readFileSync(join(ROOT, 'src/lib/live-stream/LiveStreamEmbed.svelte'), 'utf8');
		expect(embed).toMatch(/isTeenAdBlocked/);
		expect(embed).toMatch(/iframe/);
		expect(embed).toMatch(/isAllowlistedEmbedUrl/);
	});

	it('parent dashboard mounts LiveStreamWatch with Watch live', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/parent/dashboard/+page.svelte'),
			'utf8',
		);
		expect(page).toMatch(/LiveStreamWatch/);
		const watch = readFileSync(
			join(ROOT, 'src/lib/components/parent/LiveStreamWatch.svelte'),
			'utf8',
		);
		expect(watch).toMatch(/Watch live/);
		expect(watch).toMatch(/loadHouseholdMatchStreams/);
	});

	it('Firestore rules allow liveStreamUrl on match_sessions', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
		expect(rules).toMatch(/liveStreamUrl/);
		expect(rules).toMatch(/match \/match_sessions\/\{sessionId\}/);
	});

	it('loadHouseholdScheduleEvents parses liveStreamUrl', () => {
		const loader = readFileSync(
			join(ROOT, 'src/lib/parent/loadHouseholdScheduleEvents.ts'),
			'utf8',
		);
		expect(loader).toMatch(/liveStreamUrl/);
		expect(loader).toMatch(/loadHouseholdMatchStreams/);
	});

	it('director FieldOpsModule persists liveStreamUrl on field bookings', () => {
		const mod = readFileSync(
			join(ROOT, 'src/lib/components/director/os/FieldOpsModule.svelte'),
			'utf8',
		);
		expect(mod).toMatch(/liveStreamUrl/);
		expect(mod).toMatch(/normalizeLiveStreamUrl/);
		expect(mod).toMatch(/Live stream URL/);
	});

	it('ParentWeekScheduleStrip shows prominent Watch live on event rows', () => {
		const strip = readFileSync(
			join(ROOT, 'src/lib/components/parent/ParentWeekScheduleStrip.svelte'),
			'utf8',
		);
		expect(strip).toMatch(/Watch live/);
		expect(strip).toMatch(/parseLiveStreamUrl/);
		expect(strip).toMatch(/liveStreamUrl/);
	});
});
