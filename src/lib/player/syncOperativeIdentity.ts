import { doc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
	OPERATIVE_PORTRAIT_V2_VERSION,
	parseOperativePortrait,
	type OperativePortraitV2,
} from '$lib/avatars/portraitV2Schema.js';
import {
	defaultOperativeLoadout,
	parseOperativeLoadout,
	type OperativeLoadoutV1,
} from '$lib/gamification/loadoutSchema.js';

export type SyncOperativeIdentityParams = {
	db: Firestore;
	emailKey: string;
	operativeAvatar: unknown;
	operativeLoadout: unknown;
	ownedPortraitParts?: string[];
	profileOwnedPortraitParts?: string[];
	setProfile?: (profile: Record<string, unknown>) => void;
	userProfile?: Record<string, unknown> | null;
};

function sortedJson(ids: string[]): string {
	return JSON.stringify([...ids].sort());
}

function shouldMergeOwnedPortraitParts(
	ownedPortraitParts: string[] | undefined,
	profileOwnedPortraitParts: string[] | undefined,
): ownedPortraitParts is string[] {
	if (!ownedPortraitParts) return false;
	if (!Array.isArray(profileOwnedPortraitParts) || profileOwnedPortraitParts.length === 0) {
		return true;
	}
	return sortedJson(ownedPortraitParts) !== sortedJson(profileOwnedPortraitParts);
}

/**
 * Single Firestore commit for operativeAvatar + operativeLoadout (+ ownedPortraitParts when changed).
 */
export async function syncOperativeIdentityToFirestore(
	params: SyncOperativeIdentityParams,
): Promise<{ ok: true }> {
	const emailKey = params.emailKey.trim().toLowerCase();
	if (!emailKey) {
		throw new Error('Sign in to sync your identity.');
	}

	const parsedAvatar = parseOperativePortrait(params.operativeAvatar);
	if (!parsedAvatar || parsedAvatar.v !== OPERATIVE_PORTRAIT_V2_VERSION) {
		throw new Error('Invalid portrait configuration — select catalog parts before saving.');
	}

	const parsedLoadout: OperativeLoadoutV1 =
		parseOperativeLoadout(params.operativeLoadout) ?? defaultOperativeLoadout();

	const payload: {
		operativeAvatar: OperativePortraitV2;
		operativeLoadout: OperativeLoadoutV1;
		ownedPortraitParts?: string[];
	} = {
		operativeAvatar: parsedAvatar,
		operativeLoadout: parsedLoadout,
	};

	if (
		shouldMergeOwnedPortraitParts(params.ownedPortraitParts, params.profileOwnedPortraitParts)
	) {
		payload.ownedPortraitParts = params.ownedPortraitParts;
	}

	await updateDoc(doc(params.db, 'users', emailKey), payload);

	if (params.setProfile) {
		const prof = params.userProfile;
		const merged: Record<string, unknown> = {
			...(prof && typeof prof === 'object' ? prof : {}),
			operativeAvatar: parsedAvatar,
			operativeLoadout: parsedLoadout,
		};
		if (payload.ownedPortraitParts !== undefined) {
			merged.ownedPortraitParts = payload.ownedPortraitParts;
		}
		params.setProfile(merged);
	}

	return { ok: true };
}
