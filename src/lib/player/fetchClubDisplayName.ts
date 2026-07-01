import { doc, getDoc, type Firestore } from 'firebase/firestore';
import {
	resolveClubDisplayName,
	resolveClubIdFromProfile,
	type ClubProfileSlice,
} from '$lib/player/resolveClubDisplayName.js';

/**
 * Async club label for emblem surfaces — fetches `clubs/{clubId}` when needed.
 * When profile.clubId is empty but teamId is set, resolves clubId via `teams/{teamId}` once.
 */
export async function fetchClubDisplayName(
	db: Firestore,
	profile: ClubProfileSlice | null | undefined,
): Promise<string> {
	const inline = resolveClubDisplayName(profile, null);
	let clubId = resolveClubIdFromProfile(profile, null);
	if (!clubId) {
		const teamId =
			typeof profile?.teamId === 'string' && profile.teamId.trim() ?
				profile.teamId.trim()
			:	'';
		if (typeof teamId === 'string' && teamId.trim().length > 0) {
			try {
				const teamSnap = await getDoc(doc(db, 'teams', teamId));
				if (teamSnap.exists()) {
					clubId = resolveClubIdFromProfile(profile, teamSnap.data());
				}
			} catch {
				// keep clubId empty — fall back to inline label
			}
		}
	}
	if (typeof clubId !== 'string' || clubId.trim().length === 0) return inline;
	try {
		const snap = await getDoc(doc(db, 'clubs', clubId));
		if (!snap.exists()) return inline;
		return resolveClubDisplayName(profile, snap.data());
	} catch {
		return inline;
	}
}