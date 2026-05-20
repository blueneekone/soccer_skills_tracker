import { deleteDoc, doc, type Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { HttpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { goto } from '$app/navigation';
import { provisionClub } from '$lib/admin/organizationsProvision.js';
import { logSecurityEvent } from '$lib/utils/security.js';
import type { AdminAddClubInput, AdminClub, AdminComplianceHealth } from '$lib/types/adminOrganizations.js';

export type AddClubFormState = {
	clubId: string;
	clubName: string;
	sport: string;
	newSportMode: boolean;
	newSportName: string;
	newSportIcon: string;
	directorEmail: string;
	verifiedAddress: string;
	phoneNumber: string;
	primaryFacility: string;
};

export const EMPTY_ADD_CLUB_FORM: AddClubFormState = {
	clubId: '',
	clubName: '',
	sport: 'soccer',
	newSportMode: false,
	newSportName: '',
	newSportIcon: 'ph-soccer-ball',
	directorEmail: '',
	verifiedAddress: '',
	phoneNumber: '',
	primaryFacility: '',
};

export function addClubInputFromForm(form: AddClubFormState): AdminAddClubInput {
	return {
		clubId: form.clubId,
		clubName: form.clubName,
		sport: form.sport,
		newSportMode: form.newSportMode,
		newSportName: form.newSportName,
		newSportIcon: form.newSportIcon,
		directorEmail: form.directorEmail,
		verifiedAddress: form.verifiedAddress,
		phoneNumber: form.phoneNumber,
		primaryFacility: form.primaryFacility,
	};
}

export type AddClubResult = {
	clubs: AdminClub[];
	complianceMap: Map<string, AdminComplianceHealth>;
};

export async function executeAddClub(deps: {
	db: Firestore;
	form: AddClubFormState;
	createSportModuleFn: HttpsCallable<
		{ sportName: string; defaultIcon: string; courtType: string },
		{ ok?: boolean; sportId?: string }
	>;
}): Promise<AddClubResult> {
	const createdId = deps.form.clubId.trim().toLowerCase();
	const createdName = deps.form.clubName.trim();
	const result = await provisionClub({
		db: deps.db,
		createSportModuleFn: deps.createSportModuleFn,
		input: addClubInputFromForm(deps.form),
	});
	await logSecurityEvent('CREATE_CLUB', createdId, createdName);
	return result;
}

export async function executeDeleteClub(deps: {
	db: Firestore;
	id: string;
	name: string;
}): Promise<boolean> {
	if (!confirm(`Permanently delete organization "${deps.name}" (${deps.id})? This cannot be undone.`)) {
		return false;
	}
	await deleteDoc(doc(deps.db, 'clubs', deps.id));
	await logSecurityEvent('DELETE_CLUB', deps.id, 'Club deleted permanently');
	return true;
}

export async function executeLoginAsDirector(deps: {
	auth: Auth;
	club: AdminClub;
	actorEmail: string;
	impersonateUserFn: HttpsCallable<{ targetEmail: string }, { token?: string }>;
	onScope: (clubId: string) => void | Promise<void>;
	touchImpersonation: () => void | Promise<void>;
}): Promise<void> {
	const email = (deps.club.directorEmail || '').trim().toLowerCase();
	if (!email) {
		throw new Error(
			`${deps.club.name || deps.club.id} has no director email on file — assign one before impersonating.`,
		);
	}
	const ok = confirm(
		`Begin impersonation session as ${email} (Director of ${deps.club.name || deps.club.id})?\n\n` +
			'Every action will be attributed to the Director. The session will be written to security_audit.',
	);
	if (!ok) return;

	const res = await deps.impersonateUserFn({ targetEmail: email });
	const payload = (res.data || {}) as { token?: string };
	if (!payload.token) throw new Error('Impersonation token missing from response.');

	deps.onScope(deps.club.id);
	await signInWithCustomToken(deps.auth, payload.token);
	await deps.touchImpersonation();
	await logSecurityEvent(
		'IMPERSONATE_DIRECTOR',
		deps.club.id,
		`Global Admin ${deps.actorEmail} started director impersonation for ${email}`,
	);
	await goto(`/director?clubId=${encodeURIComponent(deps.club.id)}`, { replaceState: true });
}
