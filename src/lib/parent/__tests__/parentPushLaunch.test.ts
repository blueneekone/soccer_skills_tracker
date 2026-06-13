/**
 * parentPushLaunch.test.ts — LAUNCH-parent-push guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());

describe('LAUNCH-parent-push', () => {
	it('parentNotificationPrefs defines parent push categories', () => {
		const src = readFileSync(
			join(ROOT, 'src/lib/parent/parentNotificationPrefs.ts'),
			'utf8',
		);
		expect(src).toMatch(/push_gameReminders/);
		expect(src).toMatch(/push_announcements/);
		expect(src).toMatch(/push_paymentReminders/);
	});

	it('dispatcher defines matching parent preference keys', () => {
		const src = readFileSync(join(ROOT, 'functions/dispatcher.js'), 'utf8');
		expect(src).toMatch(/push_announcements/);
		expect(src).toMatch(/push_paymentReminders/);
	});

	it('ParentNotificationPanel mounted on parent dashboard', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/parent/dashboard/+page.svelte'),
			'utf8',
		);
		expect(page).toMatch(/ParentNotificationPanel/);
	});
});
