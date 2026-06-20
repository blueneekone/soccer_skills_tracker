/**
 * NAV-OPTION-D — customizable bottom pin slots (localStorage only, v1).
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

const STORAGE_PREFIX = 'vanguard_nav_pins_v1';

function storageKey(uid: string, personaKey: NavPersonaKey): string {
	return `${STORAGE_PREFIX}:${uid}:${personaKey}`;
}

function readLocalPins(uid: string, personaKey: NavPersonaKey): PinQuad | null {
	if (!browser || !uid) return null;
	try {
		const raw = localStorage.getItem(storageKey(uid, personaKey));
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
		localStorage.setItem(storageKey(uid, personaKey), JSON.stringify(pins));
	} catch {
		/* quota / private mode */
	}
}

let pins = $state<PinQuad>([null, null, null, null]);
let activePersonaKey = $state<NavPersonaKey>('player');
let activeUid = $state('');

function applyPins(next: PinQuad): void {
	pins = next;
}

function savePins(next: PinQuad): void {
	applyPins(next);
	if (activeUid) writeLocalPins(activeUid, activePersonaKey, next);
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
		_email: string,
		personaKey: NavPersonaKey,
		_profilePins?: Record<string, PinQuad> | null,
	): void {
		activeUid = uid;
		activePersonaKey = personaKey;

		const fromLocal = readLocalPins(uid, personaKey);
		const raw = fromLocal ?? getDefaultPins(personaKey);
		applyPins(sanitizePins(raw, personaKey));
	},
	setPin(slotIndex: 0 | 1 | 2 | 3, href: string | null): void {
		if (href !== null && !isHrefAllowedForPersona(href, activePersonaKey)) return;
		const next: PinQuad = [...pins] as PinQuad;
		next[slotIndex] = href;
		savePins(sanitizePins(next, activePersonaKey));
	},
	resetToDefaults(): void {
		savePins(getDefaultPins(activePersonaKey));
	},
};
