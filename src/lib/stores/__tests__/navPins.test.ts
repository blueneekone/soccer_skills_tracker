import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

const updateDocMock = vi.fn().mockResolvedValue(undefined);
vi.mock('$lib/firebase.js', () => ({
	db: {},
}));
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(() => ({})),
	updateDoc: (...args: unknown[]) => updateDocMock(...args),
}));

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => {
		storage.set(key, value);
	},
	removeItem: (key: string) => {
		storage.delete(key);
	},
	clear: () => {
		storage.clear();
	},
});

import { navPinsStore } from '$lib/stores/navPins.svelte.js';

describe('navPins store (NAV-OPTION-D)', () => {
	beforeEach(() => {
		storage.clear();
		updateDocMock.mockClear();
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', null);
	});

	it('hydrates with persona defaults when no saved pins (3 routes + Menu on slot 4)', () => {
		expect(navPinsStore.pins).toEqual([
			'/player/dashboard',
			'/player/workout',
			'/stats',
			'__field_menu__',
		]);
	});

	it('setPin swaps a slot and persists to localStorage + Firestore', async () => {
		navPinsStore.setPin(2, '/player/tracker');
		expect(navPinsStore.pins[2]).toBe('/player/tracker');
		const raw = storage.get('vanguard_nav_pins_v1:uid-test:player');
		expect(raw).toContain('/player/tracker');
		await vi.waitFor(() => {
			expect(updateDocMock).toHaveBeenCalled();
		});
		const patch = updateDocMock.mock.calls.at(-1)?.[1] as Record<string, unknown>;
		expect(patch['mobileNavPins.player']).toEqual(navPinsStore.pins);
		expect(typeof patch['mobileNavPinsUpdatedAt.player']).toBe('number');
	});

	it('resetToDefaults restores canon pins', () => {
		navPinsStore.setPin(0, '/player/settings');
		navPinsStore.resetToDefaults();
		expect(navPinsStore.pins).toEqual([
			'/player/dashboard',
			'/player/workout',
			'/stats',
			'__field_menu__',
		]);
	});

	it('rejects invalid href for persona', () => {
		navPinsStore.setPin(1, '/coach/forge');
		expect(navPinsStore.pins[1]).toBe('/player/workout');
	});

	it('hydrates from Firestore profile when local is empty (cross-device)', () => {
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', {
			player: ['/player/settings', '/player/workout', '/stats', '__field_menu__'],
		});
		expect(navPinsStore.pins).toEqual([
			'/player/settings',
			'/player/workout',
			'/stats',
			'__field_menu__',
		]);
		expect(storage.get('vanguard_nav_pins_v1:uid-test:player')).toContain('/player/settings');
	});

	it('prefers localStorage over Firestore profile on hydrate when timestamps tie', () => {
		storage.set(
			'vanguard_nav_pins_v1:uid-test:player',
			JSON.stringify(['/player/settings', '/player/workout', '/stats']),
		);
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', {
			player: ['/stats', '/player/workout', '/player/dashboard'],
		});
		expect(navPinsStore.pins).toEqual([
			'/player/settings',
			'/player/workout',
			'/stats',
			'__field_menu__',
		]);
	});

	it('sanitizes invalid local pins to defaults per slot', () => {
		storage.set(
			'vanguard_nav_pins_v1:uid-test:player',
			JSON.stringify(['/coach', null, '/stats', null]),
		);
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', null);
		expect(navPinsStore.pins[0]).toBe('/player/dashboard');
		expect(navPinsStore.pins[2]).toBe('/stats');
	});

	it('allows Menu pseudo-pin on slot 4', () => {
		navPinsStore.setPin(3, '__field_menu__');
		expect(navPinsStore.pins[3]).toBe('__field_menu__');
	});

	it('migrates legacy 3-slot localStorage to 4 slots', () => {
		storage.set(
			'vanguard_nav_pins_v1:uid-test:player',
			JSON.stringify(['/player/settings', '/player/workout', '/stats']),
		);
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', null);
		expect(navPinsStore.pins).toEqual([
			'/player/settings',
			'/player/workout',
			'/stats',
			'__field_menu__',
		]);
	});

	it('hydrate skips re-apply when session and pins unchanged (profile object churn)', () => {
		navPinsStore.setPin(0, '/player/settings');
		const afterSet = [...navPinsStore.pins];
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', {
			player: ['/player/dashboard', '/player/workout', '/stats', '__field_menu__'],
		});
		expect(navPinsStore.pins).toEqual(afterSet);
	});

	it('setPin round-trips through localStorage on reload hydrate', () => {
		navPinsStore.setPin(1, '/player/tracker');
		storage.clear();
		storage.set(
			'vanguard_nav_pins_v1:uid-test:player',
			JSON.stringify(navPinsStore.pins),
		);
		navPinsStore.hydrate('uid-reload', 'player@test.com', 'player', null);
		expect(navPinsStore.pins[1]).toBe('/player/workout');

		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', null);
		expect(navPinsStore.pins[1]).toBe('/player/tracker');
	});
});
