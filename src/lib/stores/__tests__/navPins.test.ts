import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

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

const updateDocMock = vi.fn().mockResolvedValue(undefined);
vi.mock('$lib/firebase.js', () => ({
	db: {},
}));
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(() => ({})),
	updateDoc: (...args: unknown[]) => updateDocMock(...args),
}));

import { navPinsStore } from '$lib/stores/navPins.svelte.js';

describe('navPins store (NAV-OPTION-D)', () => {
	beforeEach(() => {
		storage.clear();
		updateDocMock.mockClear();
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', null);
	});

	it('hydrates with persona defaults when no saved pins', () => {
		expect(navPinsStore.pins).toEqual(['/player/dashboard', '/player/workout', '/stats']);
	});

	it('setPin swaps a slot and persists to localStorage', () => {
		navPinsStore.setPin(2, '/player/tracker');
		expect(navPinsStore.pins[2]).toBe('/player/tracker');
		const raw = storage.get('vanguard_nav_pins_v1:uid-test:player');
		expect(raw).toContain('/player/tracker');
		expect(updateDocMock).toHaveBeenCalled();
	});

	it('resetToDefaults restores canon pins', () => {
		navPinsStore.setPin(0, '/player/settings');
		navPinsStore.resetToDefaults();
		expect(navPinsStore.pins).toEqual(['/player/dashboard', '/player/workout', '/stats']);
	});

	it('rejects invalid href for persona', () => {
		navPinsStore.setPin(1, '/coach/forge');
		expect(navPinsStore.pins[1]).toBe('/player/workout');
	});

	it('merges Firestore profile pins on hydrate', () => {
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', {
			player: ['/stats', '/player/workout', '/player/dashboard'],
		});
		expect(navPinsStore.pins).toEqual(['/stats', '/player/workout', '/player/dashboard']);
	});

	it('sanitizes invalid Firestore pins to defaults per slot', () => {
		navPinsStore.hydrate('uid-test', 'player@test.com', 'player', {
			player: ['/coach', null, '/stats'],
		});
		expect(navPinsStore.pins[0]).toBe('/player/dashboard');
		expect(navPinsStore.pins[2]).toBe('/stats');
	});
});
