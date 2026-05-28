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
	resolveBodyScaleFromAgeBand,
	type BodyScale,
	type OperativePortraitV2,
} from './portraitV2Schema.js';
import { upgradeV1SeedToPortraitV2 } from './portraitV1Upgrade.js';

export { upgradeV1SeedToPortraitV2 };

export type PortraitReadRepairProfileSlice = {
	ageBand?: string;
};

export type PortraitReadRepairResult = {
	operativeAvatar: OperativePortraitV2;
	ownedPortraitParts: string[];
	didMigrate: boolean;
};

function repairV2Portrait(
	parsed: OperativePortraitV2,
	ownedPortraitParts: string[],
	profileBodyScale?: BodyScale,
): { operativeAvatar: OperativePortraitV2; didMigrate: boolean } {
	const targetBodyScale = parsed.bodyScale ?? profileBodyScale;
	const normalizedParts = normalizePortraitParts(
		parsed.parts,
		undefined,
		ownedPortraitParts,
		targetBodyScale,
	);

	const operativeAvatar: OperativePortraitV2 = {
		v: 2,
		parts: normalizedParts,
	};
	if (targetBodyScale) operativeAvatar.bodyScale = targetBodyScale;

	const partsChanged = JSON.stringify(normalizedParts) !== JSON.stringify(parsed.parts);
	const bodyScaleAdded = targetBodyScale !== undefined && parsed.bodyScale !== targetBodyScale;

	return {
		operativeAvatar,
		didMigrate: partsChanged || bodyScaleAdded,
	};
}

/**
 * Normalize in-memory portrait state; flag didMigrate when Firestore should be patched.
 */
export function readRepairOperativeAvatar(
	raw: unknown,
	ownedPortraitPartsRaw?: unknown,
	profileSlice?: PortraitReadRepairProfileSlice,
): PortraitReadRepairResult {
	const ownedPortraitParts =
		Array.isArray(ownedPortraitPartsRaw) && ownedPortraitPartsRaw.length > 0 ?
			ownedPortraitPartsRaw.filter((id): id is string => typeof id === 'string')
		:	defaultOwnedPortraitParts();

	const profileBodyScale = profileSlice?.ageBand ?
		resolveBodyScaleFromAgeBand(profileSlice.ageBand)
	:	undefined;

	const parsed = parseOperativePortrait(raw);

	if (parsed?.v === 2) {
		const { operativeAvatar, didMigrate } = repairV2Portrait(
			parsed,
			ownedPortraitParts,
			profileBodyScale,
		);
		return {
			operativeAvatar,
			ownedPortraitParts: ownedPortraitParts.length ?
				ownedPortraitParts
			:	defaultOwnedPortraitParts(),
			didMigrate,
		};
	}

	if (parsed?.v === 1) {
		const upgraded = upgradeV1SeedToPortraitV2(parsed.seed, profileBodyScale);
		return {
			operativeAvatar: upgraded,
			ownedPortraitParts: ownedPortraitParts.length ?
				ownedPortraitParts
			:	defaultOwnedPortraitParts(),
			didMigrate: true,
		};
	}

	const operativeAvatar = defaultPortraitV2(profileBodyScale);
	return {
		operativeAvatar,
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
