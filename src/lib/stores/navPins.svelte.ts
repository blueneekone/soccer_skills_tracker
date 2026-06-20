/**
 * NAV-OPTION-D — customizable bottom pin slots (localStorage + Firestore sync).
 */
import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { doc, updateDoc } from 'firebase/firestore';
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

async function persistFirestore(
	email: string,
	personaKey: NavPersonaKey,
	pins: PinTriple,
	existing?: Record<string, PinTriple>,
): Promise<void> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) return;
	try {
		await updateDoc(doc(db, 'users', normalized), {
			mobileNavPins: { ...(existing ?? {}), [personaKey]: pins },
		});
	} catch (err) {
		console.warn('[navPins] Firestore sync failed (best-effort)', err);
	}
}

let firestoreSyncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFirestoreSync(
	email: string,
	personaKey: NavPersonaKey,
	pins: PinTriple,
	existing?: Record<string, PinTriple>,
): void {
	if (firestoreSyncTimer) clearTimeout(firestoreSyncTimer);
	firestoreSyncTimer = setTimeout(() => {
		firestoreSyncTimer = null;
		void persistFirestore(email, personaKey, pins, existing);
	}, 500);
}

let pins = $state<PinTriple>([null, null, null]);
let activePersonaKey = $state<NavPersonaKey>('player');
let activeUid = $state('');
let activeEmail = $state('');
let firestoreSnapshot = $state<Record<string, PinTriple>>({});

function applyPins(next: PinTriple): void {
	pins = next;
}

function savePins(next: PinTriple): void {
	applyPins(next);
	if (activeUid) writeLocalPins(activeUid, activePersonaKey, next);
	if (activeEmail) {
		scheduleFirestoreSync(activeEmail, activePersonaKey, next, firestoreSnapshot);
	}
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
		email: string,
		personaKey: NavPersonaKey,
		profilePins?: Record<string, PinTriple> | null,
	): void {
		activeUid = uid;
		activeEmail = email;
		activePersonaKey = personaKey;
		firestoreSnapshot = profilePins ?? {};

		const fromFirestore = profilePins?.[personaKey];
		const fromLocal = readLocalPins(uid, personaKey);
		const raw = fromFirestore ?? fromLocal ?? getDefaultPins(personaKey);
		applyPins(sanitizePins(raw, personaKey));

		if (fromFirestore && uid) writeLocalPins(uid, personaKey, pins);
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
