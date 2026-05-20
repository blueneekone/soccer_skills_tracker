import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import type { HttpsCallable } from 'firebase/functions';
import { loadOrganizationsWithCompliance } from '$lib/admin/organizationsLoad.js';
import type { AdminAddClubInput } from '$lib/types/adminOrganizations.js';

export function validateAddClubInput(input: AdminAddClubInput): string | null {
	const id = input.clubId.trim();
	const name = input.clubName.trim();
	if (!id || !name) {
		return 'Club ID and Club Name are required.';
	}
	if (!/^[a-z0-9][a-z0-9_-]{1,48}$/.test(id.toLowerCase())) {
		return 'Club ID must be 2–49 lowercase letters, numbers, hyphens, or underscores.';
	}
	if (input.newSportMode && !input.newSportName.trim()) {
		return 'Sport name is required when creating a new sport module.';
	}
	const email = input.directorEmail.trim();
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return 'Director email looks invalid.';
	}
	const ph = input.phoneNumber.trim();
	if (ph && !/^\+?[0-9\s().\-]{7,20}$/.test(ph)) {
		return 'Phone number looks invalid. Use E.164 (e.g. +15125550100).';
	}
	return null;
}

async function resolveSportId(
	input: AdminAddClubInput,
	createSportModuleFn: HttpsCallable<
		{ sportName: string; defaultIcon: string; courtType: string },
		{ ok?: boolean; sportId?: string }
	>,
): Promise<string> {
	if (!input.newSportMode) return input.sport;

	const res = await createSportModuleFn({
		sportName: input.newSportName.trim(),
		defaultIcon: input.newSportIcon.trim() || 'ph-soccer-ball',
		courtType: '',
	});
	const data = res.data;
	if (!data?.ok || !data.sportId) {
		throw new Error('Sport module server did not confirm creation. Club was NOT created.');
	}
	return data.sportId;
}

async function writeClubDocuments(
	db: Firestore,
	input: AdminAddClubInput,
	resolvedSport: string,
): Promise<void> {
	const id = input.clubId.trim().toLowerCase();
	const email = input.directorEmail.trim().toLowerCase();
	const ph = input.phoneNumber.trim();

	await setDoc(doc(db, 'clubs', id), {
		id,
		name: input.clubName.trim(),
		directorEmail: email,
		sport: resolvedSport,
		verifiedAddress: input.verifiedAddress.trim() || '',
		phoneNumber: ph,
		primaryFacility: input.primaryFacility.trim() || '',
		createdAt: new Date(),
	});

	if (email) {
		await setDoc(doc(db, 'users', email), { role: 'director', clubId: id }, { merge: true });
	}
}

export type ProvisionClubDeps = {
	db: Firestore;
	input: AdminAddClubInput;
	createSportModuleFn: HttpsCallable<
		{ sportName: string; defaultIcon: string; courtType: string },
		{ ok?: boolean; sportId?: string }
	>;
};

/** Provisions a club (+ optional sport module) and reloads the organizations table. */
export async function provisionClub(deps: ProvisionClubDeps) {
	const validationErr = validateAddClubInput(deps.input);
	if (validationErr) throw new Error(validationErr);

	const resolvedSport = await resolveSportId(deps.input, deps.createSportModuleFn);
	await writeClubDocuments(deps.db, deps.input, resolvedSport);
	return loadOrganizationsWithCompliance(deps.db);
}

/** Reload helper after external mutations (delete, etc.). */
export async function reloadOrganizations(db: Firestore) {
	return loadOrganizationsWithCompliance(db);
}
