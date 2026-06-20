/**
 * NAV-OPTION-D — customizable bottom pin slots (localStorage + Firestore sync).
 */
import { browser } from '$app/environment';
import {
	getDefaultPins,
	isHrefAllowedForPersona,
	MENU_PIN_HREF,
	sanitizePins,
	type NavPersonaKey,
	type PinQuad,
} from '$lib/shell/navPinCatalog.js';
import {
	localPinsStorageKey,
	persistMobileNavPinsToFirestore,
	readLocalPinsUpdatedAt,
	resolveHydratedPins,
	writeLocalPinsUpdatedAt,
	type MobileNavPinsMap,
	type MobileNavPinsUpdatedAtMap,
} from '$lib/shell/navPinsPersistence.js';

function readLocalPins(uid: string, personaKey: NavPersonaKey): PinQuad | null {
	if (!browser || !uid) return null;
	try {
		const raw = localStorage.getItem(localPinsStorageKey(uid, personaKey));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed) || (parsed.length !== 3 && parsed.length !== 4)) return null;
		const padded =
			parsed.length === 3 ?
				([...(parsed as (string | null)[]), MENU_PIN_HREF] as (string | null)[])
			:	(parsed as (string | null)[]);
		return sanitizePins(padded, personaKey);
	} catch {
		return null;
	}
}

function writeLocalPins(uid: string, personaKey: NavPersonaKey, pins: PinQuad): void {
	if (!browser || !uid) return;
	try {
		localStorage.setItem(localPinsStorageKey(uid, personaKey), JSON.stringify(pins));
	} catch {
		/* quota / private mode */
	}
}

let pins = $state<PinQuad>([null, null, null, null]);
let activePersonaKey = $state<NavPersonaKey>('player');
let activeUid = $state('');
let activeEmail = $state('');
let hydratedSessionKey = $state('');

function pinsEqual(a: PinQuad, b: PinQuad): boolean {
	return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function applyPins(next: PinQuad): void {
	if (pinsEqual(pins, next)) return;
	pins = next;
}

function persistPins(next: PinQuad): void {
	const updatedAt = Date.now();
	applyPins(next);
	if (activeUid) {
		writeLocalPins(activeUid, activePersonaKey, next);
		writeLocalPinsUpdatedAt(activeUid, activePersonaKey, updatedAt);
	}
	if (activeEmail) {
		void persistMobileNavPinsToFirestore(activeEmail, activePersonaKey, next).catch((err) => {
			console.warn('[navPinsStore] Firestore sync failed (local copy kept):', err);
		});
	}
}

export const navPinsStore = {
	get pins(): PinQuad {
		return pins;
	},
	get personaKey(): NavPersonaKey {
		return activePersonaKey;
	},
	hydrate(
		uid: string,
		email: string,
		personaKey: NavPersonaKey,
		profilePins?: MobileNavPinsMap | null,
		profileUpdatedAt?: MobileNavPinsUpdatedAtMap | null,
	): void {
		const sessionKey = `${uid}:${personaKey}`;
		activeUid = uid;
		activeEmail = email.trim().toLowerCase();
		activePersonaKey = personaKey;

		const next = resolveHydratedPins(
			uid,
			personaKey,
			readLocalPins(uid, personaKey),
			readLocalPinsUpdatedAt(uid, personaKey),
			profilePins?.[personaKey],
			profileUpdatedAt?.[personaKey] ?? 0,
			getDefaultPins(personaKey),
			writeLocalPins,
		);

		if (sessionKey === hydratedSessionKey && pinsEqual(pins, next)) return;

		applyPins(next);
		hydratedSessionKey = sessionKey;
	},
	setPin(slotIndex: 0 | 1 | 2 | 3, href: string | null): void {
		if (href !== null && !isHrefAllowedForPersona(href, activePersonaKey)) return;
		const next: PinQuad = [...pins] as PinQuad;
		next[slotIndex] = href;
		persistPins(sanitizePins(next, activePersonaKey));
	},
	resetToDefaults(): void {
		persistPins(getDefaultPins(activePersonaKey));
	},
};
