import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	fieldMenu,
	fieldMenuDismissBlocked,
	FIELD_MENU_DISMISS_GUARD_MS,
} from '$lib/stores/fieldMenu.svelte.js';

describe('fieldMenu behavior (NAV-MENU-PIN-FIX)', () => {
	beforeEach(() => {
		fieldMenu.close();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));
	});

	afterEach(() => {
		fieldMenu.close();
		vi.useRealTimers();
	});

	it('openBrowse sets openedAt synchronously before open is true', () => {
		expect(fieldMenu.open).toBe(false);
		fieldMenu.openBrowse();
		expect(fieldMenu.open).toBe(true);
		expect(fieldMenu.openedAt).toBe(Date.now());
		expect(fieldMenu.mode).toBe('browse');
	});

	it('openPickPin sets openedAt synchronously before open is true', () => {
		fieldMenu.openPickPin(1);
		expect(fieldMenu.open).toBe(true);
		expect(fieldMenu.openedAt).toBe(Date.now());
		expect(fieldMenu.mode).toBe('pick-pin');
		expect(fieldMenu.pickSlotIndex).toBe(1);
	});

	it('fieldMenuDismissBlocked is true within guard window after openBrowse', () => {
		fieldMenu.openBrowse();
		expect(fieldMenuDismissBlocked()).toBe(true);
		vi.advanceTimersByTime(FIELD_MENU_DISMISS_GUARD_MS - 1);
		expect(fieldMenuDismissBlocked()).toBe(true);
		vi.advanceTimersByTime(1);
		expect(fieldMenuDismissBlocked()).toBe(false);
	});

	it('fieldMenuDismissBlocked is false when menu is closed', () => {
		expect(fieldMenuDismissBlocked()).toBe(false);
	});
});
