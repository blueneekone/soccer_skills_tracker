/**
 * Batch-read guardian denorm from player_lookup (written by Cloud Functions).
 */
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { parseGuardianMeta, type GuardianMeta } from './rosterGuardianEnrich.js';

function normEmail(v: unknown): string {
	return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

/** Parallel getDoc — Firestore batch get capped; roster pages stay small. */
export async function fetchGuardiansFromPlayerLookup(
	db: Firestore,
	emails: string[],
): Promise<Map<string, GuardianMeta>> {
	const out = new Map<string, GuardianMeta>();
	const unique = [...new Set(emails.map(normEmail).filter(Boolean))];
	if (unique.length === 0) return out;

	await Promise.all(
		unique.map(async (email) => {
			try {
				const snap = await getDoc(doc(db, 'player_lookup', email));
				if (!snap.exists()) {
					out.set(email, { parentEmails: [], householdId: null, vpcStatus: null });
					return;
				}
				out.set(email, parseGuardianMeta(snap.data() as Record<string, unknown>));
			} catch {
				out.set(email, { parentEmails: [], householdId: null, vpcStatus: null });
			}
		}),
	);

	return out;
}

export function guardianSummary(meta: GuardianMeta | undefined): string {
	if (!meta) return '—';
	if (meta.parentEmails.length > 0) return meta.parentEmails.join(', ');
	if (meta.householdId) return meta.householdId;
	return 'Unlinked';
}

export function vpcSummary(status: string | null | undefined): string {
	const s = String(status || '').trim().toLowerCase();
	if (s === 'verified') return 'Verified';
	if (s === 'pending_parent' || s === 'pending') return 'Pending';
	if (!s) return '—';
	return String(status);
}
