/**
 * Club-paid Checkr configuration — Firestore `clubs/{clubId}` with Vite env fallback.
 *
 * Canonical club fields:
 * - checkrPackageSlug
 * - checkrWorkState
 * - checkrWorkCity
 * - checkrNode (optional, when Checkr account hierarchy uses nodes)
 */

import { db } from '$lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export type ClubCheckrConfig = {
	packageSlug: string;
	workState: string;
	workCity: string;
	node: string;
	clubName: string;
};

function envFallback(): ClubCheckrConfig {
	return {
		packageSlug:
			typeof import.meta.env.VITE_CHECKR_PACKAGE_SLUG === 'string'
				? import.meta.env.VITE_CHECKR_PACKAGE_SLUG.trim()
				: '',
		workState:
			typeof import.meta.env.VITE_CHECKR_WORK_STATE === 'string'
				? import.meta.env.VITE_CHECKR_WORK_STATE.trim()
				: '',
		workCity:
			typeof import.meta.env.VITE_CHECKR_WORK_CITY === 'string'
				? import.meta.env.VITE_CHECKR_WORK_CITY.trim()
				: '',
		node: '',
		clubName: '',
	};
}

/** Read club Checkr package + work location; falls back to Vite env for dev. */
export async function fetchClubCheckrConfig(clubId: string | undefined | null): Promise<ClubCheckrConfig> {
	const fallback = envFallback();
	const id = typeof clubId === 'string' ? clubId.trim() : '';
	if (!id) return fallback;

	try {
		const snap = await getDoc(doc(db, 'clubs', id));
		if (!snap.exists()) return fallback;

		const d = snap.data();
		return {
			packageSlug: String(d.checkrPackageSlug || fallback.packageSlug || '').trim(),
			workState: String(d.checkrWorkState || fallback.workState || '').trim(),
			workCity: String(d.checkrWorkCity || fallback.workCity || '').trim(),
			node: String(d.checkrNode || '').trim(),
			clubName: String(d.name || '').trim(),
		};
	} catch {
		return fallback;
	}
}
