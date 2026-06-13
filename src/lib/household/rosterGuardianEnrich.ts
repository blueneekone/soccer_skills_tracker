/**
 * Legacy roster rows may predate guardian denorm on player_lookup.
 * Batch-resolve households for player emails missing parentEmails.
 */
import {
	collection,
	getDocs,
	limit,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';

export interface GuardianMeta {
	parentEmails: string[];
	householdId: string | null;
	vpcStatus: string | null;
}

function normEmail(v: unknown): string {
	return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function parseGuardianMeta(data: Record<string, unknown> | undefined): GuardianMeta {
	if (!data) {
		return { parentEmails: [], householdId: null, vpcStatus: null };
	}
	const parentEmails = Array.isArray(data.parentEmails)
		? data.parentEmails.map(normEmail).filter(Boolean)
		: [];
	const householdId =
		typeof data.householdId === 'string' && data.householdId.trim()
			? data.householdId.trim()
			: null;
	const vpcStatus =
		typeof data.vpcStatus === 'string' && data.vpcStatus.trim()
			? data.vpcStatus.trim()
			: null;
	return { parentEmails, householdId, vpcStatus };
}

/**
 * For each player email, query households where playerEmails array-contains email.
 * Runs queries in parallel (Firestore has no multi-value array-contains-in).
 */
export async function fetchGuardiansByPlayerEmails(
	db: Firestore,
	emails: string[],
): Promise<Map<string, GuardianMeta>> {
	const out = new Map<string, GuardianMeta>();
	const unique = [...new Set(emails.map(normEmail).filter(Boolean))];
	if (unique.length === 0) return out;

	await Promise.all(
		unique.map(async (email) => {
			try {
				const hq = query(
					collection(db, 'households'),
					where('playerEmails', 'array-contains', email),
					limit(1),
				);
				const snap = await getDocs(hq);
				if (snap.empty) {
					out.set(email, { parentEmails: [], householdId: null, vpcStatus: null });
					return;
				}
				const docSnap = snap.docs[0];
				const data = docSnap.data() as Record<string, unknown>;
				const parentEmails = Array.isArray(data.parentEmails)
					? data.parentEmails.map(normEmail).filter(Boolean)
					: [];
				out.set(email, {
					parentEmails,
					householdId: docSnap.id,
					vpcStatus: null,
				});
			} catch {
				out.set(email, { parentEmails: [], householdId: null, vpcStatus: null });
			}
		}),
	);

	return out;
}

export { parseGuardianMeta };
