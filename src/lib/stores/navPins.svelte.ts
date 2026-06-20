/**
 * NAV-OPTION-D — customizable bottom pin slots (localStorage only, v1).
 */
import { browser } from '$app/environment';
import {
	getDefaultPins,
	isHrefAllowedForPersona,
	sanitizePins,
	type NavPersonaKey,
	type PinTriple,
} from '$lib/shell/navPinCatalog.js';

const STORAGE_PREFIX = 'vanguard_nav_pins_v1';

function storageKey(uid: string, personaKey: NavPersonaKey): string {
	return `${STORAGE_PREFIX}:${uid}:${personaKey}`;
}

function readLocalPins(uid: string, personaKey: NavPersonaKey): PinTriple | null {
	if (!browser || !uid) return null;
	try {
		const raw = localStorage.getItem(storageKey(uid, personaKey));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed) || parsed.length !== 3) return null;
		return sanitizePins(parsed as (string | null)[], personaKey);
	} catch {
		return null;
	}
}

function writeLocalPins(uid: string, personaKey: NavPersonaKey, pins: PinTriple): void {
	if (!browser || !uid) return;
	try {
		localStorage.setItem(storageKey(uid, personaKey), JSON.stringify(pins));
	} catch {
		/* quota / private mode */
	}
}

let pins = $state<PinTriple>([null, null, null]);
let activePersonaKey = $state<NavPersonaKey>('player');
let activeUid = $state('');

function applyPins(next: PinTriple): void {
	pins = next;
}

function savePins(next: PinTriple): void {
	applyPins(next);
	if (activeUid) writeLocalPins(activeUid, activePersonaKey, next);
}

export const navPinsStore = {
	get pins(): PinTriple {
		return pins;
	},
	get personaKey(): NavPersonaKey {
		return activePersonaKey;
	},
	hydrate(
		uid: string,
		_email: string,
		personaKey: NavPersonaKey,
		_profilePins?: Record<string, PinTriple> | null,
	): void {
		activeUid = uid;
		activePersonaKey = personaKey;

		const fromLocal = readLocalPins(uid, personaKey);
		const raw = fromLocal ?? getDefaultPins(personaKey);
		applyPins(sanitizePins(raw, personaKey));
	},
	setPin(slotIndex: 0 | 1 | 2, href: string | null): void {
		if (href !== null && !isHrefAllowedForPersona(href, activePersonaKey)) return;
		const next: PinTriple = [...pins] as PinTriple;
		next[slotIndex] = href;
		savePins(sanitizePins(next, activePersonaKey));
	},
	resetToDefaults(): void {
		savePins(getDefaultPins(activePersonaKey));
	},
};
