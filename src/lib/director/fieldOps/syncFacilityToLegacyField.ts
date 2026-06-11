/**
 * Bridge clubs/{clubId}/facilities (Facility Map) → top-level fields/{id} (pitch schedule).
 * Keeps deployment calendar and legacy booking grid on the same field ids.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

function mapFacilityStatus(status: string | undefined): 'active' | 'maintenance' | 'closed' {
	const raw = (status ?? '').trim().toLowerCase();
	if (raw === 'maintenance') return 'maintenance';
	if (raw === 'inactive' || raw === 'closed') return 'closed';
	return 'active';
}

export async function syncFacilityToLegacyField(opts: {
	fieldId: string;
	clubId: string;
	name: string;
	location?: string;
	status?: string;
}): Promise<void> {
	const fieldId = opts.fieldId.trim();
	const clubId = opts.clubId.trim();
	const name = opts.name.trim();
	if (!fieldId || !clubId || !name) return;

	const directorUpsertField = httpsCallable(functions, 'directorUpsertField');
	await directorUpsertField({
		fieldId,
		clubId,
		name,
		location: (opts.location ?? '').trim(),
		status: mapFacilityStatus(opts.status),
	});
}
