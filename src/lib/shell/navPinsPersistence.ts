/**
 * NAV-OPTION-D — Firestore + localStorage pin persistence (cross-device sync).
 */
import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import {
	sanitizePins,
	type NavPersonaKey,
	type PinQuad,
} from '$lib/shell/navPinCatalog.js';
import { doc, updateDoc } from 'firebase/firestore';

const STORAGE_PREFIX = 'vanguard_nav_pins_v1';
const STORAGE_UPDATED_PREFIX = 'vanguard_nav_pins_updated_v1';

export function localPinsStorageKey(uid: string, personaKey: NavPersonaKey): string {
	return `${STORAGE_PREFIX}:${uid}:${personaKey}`;
}

export function localPinsUpdatedStorageKey(uid: string, personaKey: NavPersonaKey): string {
	return `${STORAGE_UPDATED_PREFIX}:${uid}:${personaKey}`;
}

export function readLocalPinsUpdatedAt(uid: string, personaKey: NavPersonaKey): number {
	if (!browser || !uid) return 0;
	try {
		const raw = localStorage.getItem(localPinsUpdatedStorageKey(uid, personaKey));
		if (!raw) return 0;
		const n = Number(raw);
		return Number.isFinite(n) && n > 0 ? n : 0;
	} catch {
		return 0;
	}
}

export function writeLocalPinsUpdatedAt(uid: string, personaKey: NavPersonaKey, ms: number): void {
	if (!browser || !uid || ms <= 0) return;
	try {
		localStorage.setItem(localPinsUpdatedStorageKey(uid, personaKey), String(ms));
	} catch {
		/* quota / private mode */
	}
}

export type MobileNavPinsMap = Record<string, PinQuad>;
export type MobileNavPinsUpdatedAtMap = Record<string, number>;

/** Pick local vs remote pins by updatedAt; write back to local when remote wins. */
export function resolveHydratedPins(
	uid: string,
	personaKey: NavPersonaKey,
	fromLocal: PinQuad | null,
	localUpdatedAt: number,
	fromProfile: PinQuad | null | undefined,
	profileUpdatedAt: number,
	defaults: PinQuad,
	writeLocal: (uid: string, personaKey: NavPersonaKey, pins: PinQuad) => void,
): PinQuad {
	const remote = fromProfile ? sanitizePins(fromProfile, personaKey) : null;
	const local = fromLocal ? sanitizePins(fromLocal, personaKey) : null;
	const fallback = sanitizePins(defaults, personaKey);

	if (!local && !remote) return fallback;
	if (local && !remote) return local;
	if (!local && remote) {
		writeLocal(uid, personaKey, remote);
		if (profileUpdatedAt > 0) writeLocalPinsUpdatedAt(uid, personaKey, profileUpdatedAt);
		return remote;
	}

	if (profileUpdatedAt > localUpdatedAt) {
		writeLocal(uid, personaKey, remote!);
		writeLocalPinsUpdatedAt(uid, personaKey, profileUpdatedAt);
		return remote!;
	}

	return local!;
}

export async function persistMobileNavPinsToFirestore(
	email: string,
	personaKey: NavPersonaKey,
	pins: PinQuad,
): Promise<void> {
	if (!browser || !email) return;
	const key = email.trim().toLowerCase();
	if (!key) return;
	const updatedAt = Date.now();
	await updateDoc(doc(db, 'users', key), {
		[`mobileNavPins.${personaKey}`]: pins,
		[`mobileNavPinsUpdatedAt.${personaKey}`]: updatedAt,
	});
}
