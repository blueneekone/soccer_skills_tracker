import { describe, expect, it } from 'vitest';
import { MENU_PIN_HREF } from '$lib/shell/navPinCatalog.js';
import { resolveHydratedPins } from '$lib/shell/navPinsPersistence.js';

type PinQuad = [string | null, string | null, string | null, string | null];

describe('navPinsPersistence', () => {
	const uid = 'uid-test';
	const personaKey = 'parent' as const;
	const defaults: PinQuad = [
		'/parent/household',
		'/parent/vpc',
		'/parent/dashboard',
		MENU_PIN_HREF,
	];
	const localWrites: PinQuad[] = [];

	function captureLocalWrite(uidArg: string, persona: typeof personaKey, pins: PinQuad) {
		expect(uidArg).toBe(uid);
		expect(persona).toBe(personaKey);
		localWrites.push(pins);
	}

	it('uses Firestore profile when local is empty (new device)', () => {
		localWrites.length = 0;
		const remote: PinQuad = [
			'/parent/household',
			'/messages',
			'/parent/dashboard',
			MENU_PIN_HREF,
		];
		const resolved = resolveHydratedPins(
			uid,
			personaKey,
			null,
			0,
			remote,
			1_700_000_000_000,
			defaults,
			captureLocalWrite,
		);
		expect(resolved).toEqual(remote);
		expect(localWrites).toEqual([remote]);
	});

	it('prefers newer Firestore profile over stale localStorage', () => {
		localWrites.length = 0;
		const local: PinQuad = ['/parent/household', '/parent/vpc', '/parent/dashboard', MENU_PIN_HREF];
		const remote: PinQuad = ['/parent/household', '/messages', '/parent/dashboard', MENU_PIN_HREF];
		const resolved = resolveHydratedPins(
			uid,
			personaKey,
			local,
			100,
			remote,
			200,
			defaults,
			captureLocalWrite,
		);
		expect(resolved).toEqual(remote);
		expect(localWrites).toEqual([remote]);
	});

	it('prefers local when local updatedAt is newer than profile', () => {
		localWrites.length = 0;
		const local: PinQuad = ['/parent/household', '/messages', '/parent/dashboard', MENU_PIN_HREF];
		const remote: PinQuad = ['/parent/household', '/parent/vpc', '/parent/dashboard', MENU_PIN_HREF];
		const resolved = resolveHydratedPins(
			uid,
			personaKey,
			local,
			500,
			remote,
			200,
			defaults,
			captureLocalWrite,
		);
		expect(resolved).toEqual(local);
		expect(localWrites).toHaveLength(0);
	});

	it('prefers local when timestamps tie (existing device override)', () => {
		localWrites.length = 0;
		const local: PinQuad = ['/parent/household', '/messages', '/parent/dashboard', MENU_PIN_HREF];
		const remote: PinQuad = ['/parent/household', '/parent/vpc', '/parent/dashboard', MENU_PIN_HREF];
		const resolved = resolveHydratedPins(
			uid,
			personaKey,
			local,
			0,
			remote,
			0,
			defaults,
			captureLocalWrite,
		);
		expect(resolved).toEqual(local);
	});
});
