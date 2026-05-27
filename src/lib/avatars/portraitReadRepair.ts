/**
 * Lazy read-repair for operativeAvatar v1 → v2 and ownedPortraitParts defaults.
 * Firestore writes are best-effort via queuePortraitReadRepairWrite (browser only).
 */

import { browser } from '$app/environment';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import {
	defaultOwnedPortraitParts,
	defaultPortraitV2,
	getPortraitPartsForSlot,
	normalizePortraitParts,
	parseOperativePortrait,
	type OperativePortraitV2,
	type PortraitPartSlot,
} from './portraitV2Schema.js';

/** djb2 string → unsigned 32-bit hash (matches bauhausAvatar.js). */
function djb2(str: string): number {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
	}
	return h;
}

function pickCatalogPartForSlot(seed: string, slot: PortraitPartSlot): string | null {
	const catalog = getPortraitPartsForSlot(slot);
	if (!catalog.length) return null;
	const idx = djb2(`${seed}::${slot}`) % catalog.length;
	return catalog[idx]?.id ?? null;
}

/**
 * Deterministic v1 seed → v2 catalog part ids per slot (hash picks within slot catalog).
 */
export function upgradeV1SeedToPortraitV2(seed: string): OperativePortraitV2 {
	const normalizedSeed = String(seed ?? '').trim() || 'operative';
	const parts: Partial<Record<PortraitPartSlot, string | null>> = {};

	for (const slot of ['face', 'hair', 'kit'] as const) {
		const picked = pickCatalogPartForSlot(normalizedSeed, slot);
		if (picked) parts[slot] = picked;
	}

	const hasAnyPart = Object.values(parts).some((v) => typeof v === 'string' && v);
	if (!hasAnyPart) return defaultPortraitV2();

	return {
		v: 2,
		parts: normalizePortraitParts(parts),
	};
}

export type PortraitReadRepairResult = {
	operativeAvatar: OperativePortraitV2;
	ownedPortraitParts: string[];
	didMigrate: boolean;
};

/**
 * Normalize in-memory portrait state; flag didMigrate when Firestore should be patched.
 */
export function readRepairOperativeAvatar(
	raw: unknown,
	ownedPortraitPartsRaw?: unknown,
): PortraitReadRepairResult {
	const ownedPortraitParts =
		Array.isArray(ownedPortraitPartsRaw) && ownedPortraitPartsRaw.length > 0 ?
			ownedPortraitPartsRaw.filter((id): id is string => typeof id === 'string')
		:	defaultOwnedPortraitParts();

	const parsed = parseOperativePortrait(raw);

	if (parsed?.v === 2) {
		const operativeAvatar: OperativePortraitV2 = {
			v: 2,
			parts: normalizePortraitParts(parsed.parts, undefined, ownedPortraitParts),
		};
		return {
			operativeAvatar,
			ownedPortraitParts: ownedPortraitParts.length ?
				ownedPortraitParts
			:	defaultOwnedPortraitParts(),
			didMigrate: false,
		};
	}

	if (parsed?.v === 1) {
		return {
			operativeAvatar: upgradeV1SeedToPortraitV2(parsed.seed),
			ownedPortraitParts: ownedPortraitParts.length ?
				ownedPortraitParts
			:	defaultOwnedPortraitParts(),
			didMigrate: true,
		};
	}

	return {
		operativeAvatar: defaultPortraitV2(),
		ownedPortraitParts: defaultOwnedPortraitParts(),
		didMigrate: true,
	};
}

/**
 * Queue a non-blocking merge write for lazy v2 migration (dashboard / armory hydrate).
 */
export async function queuePortraitReadRepairWrite(
	emailKey: string,
	payload: { operativeAvatar: OperativePortraitV2; ownedPortraitParts: string[] },
): Promise<void> {
	if (!browser) return;
	const key = emailKey.trim().toLowerCase();
	if (!key) return;

	try {
		await updateDoc(doc(db, 'users', key), {
			operativeAvatar: payload.operativeAvatar,
			ownedPortraitParts: payload.ownedPortraitParts,
		});
	} catch (err) {
		console.warn('[portraitReadRepair] merge write failed (offline ok):', err);
	}
}
