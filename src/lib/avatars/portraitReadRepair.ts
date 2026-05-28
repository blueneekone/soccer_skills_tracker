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
	normalizePortraitParts,
	parseOperativePortrait,
	type OperativePortraitV2,
} from './portraitV2Schema.js';
import { upgradeV1SeedToPortraitV2 } from './portraitV1Upgrade.js';

export { upgradeV1SeedToPortraitV2 };

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
