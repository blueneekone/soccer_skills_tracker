import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';
import type { HouseholdOperativeBase, HouseholdOperativeRow } from '$lib/types/household.js';

/** Builds base operative rows from a household Firestore document. */
export function baseRowsFromHousehold(d: Record<string, unknown>): HouseholdOperativeBase[] {
	const pe = Array.isArray(d.playerEmails) ? d.playerEmails : [];
	const pnames = Array.isArray(d.playerNames) ? d.playerNames : [];
	const pcall = Array.isArray(d.playerCallsigns) ? d.playerCallsigns : [];
	return pe
		.map((em, i) => {
			const email = String(em || '')
				.trim()
				.toLowerCase();
			const nm = typeof pnames[i] === 'string' && pnames[i].trim() ? pnames[i].trim() : '';
			const callsign =
				typeof pcall[i] === 'string' && pcall[i].trim() ?
					pcall[i].trim()
				: email && email.endsWith('@operative.local') ?
					email.split('@')[0]
				:	'';
			return {
				email,
				callsign,
				name: nm || (email ? email.split('@')[0] : 'Operative'),
			};
		})
		.filter((r) => r.email);
}

/** Loads gamertag + dispatch metadata for one operative row. */
export async function enrichOperativeRow(
	db: Firestore,
	row: HouseholdOperativeBase,
): Promise<HouseholdOperativeRow> {
	const em = row.email;
	if (!em.endsWith('@operative.local')) {
		return {
			...row,
			loginCallsign: '',
			dispatchCode: '',
			pendingGamertag: null,
			gamertagChangesLeft: 3,
			hudErr: '',
		};
	}
	const local = em.includes('@') ? em.split('@')[0] : em;
	let pendingGamertag: string | null = null;
	let gamertagChangesLeft = 3;
	let dispatchCode = '';
	let hudErr = '';
	try {
		const uSnap = await getDoc(doc(db, 'users', em));
		const dSnap = await getDocs(
			query(collection(db, 'operative_dispatches'), where('childEmail', '==', em), limit(20)),
		);
		if (uSnap.exists()) {
			const ud = uSnap.data() || {};
			if (typeof ud.pendingGamertag === 'string' && ud.pendingGamertag.trim()) {
				pendingGamertag = ud.pendingGamertag.trim();
			}
			if (typeof ud.gamertagChangesLeft === 'number' && !Number.isNaN(ud.gamertagChangesLeft)) {
				gamertagChangesLeft = ud.gamertagChangesLeft;
			}
		}
		if (!dSnap.empty) {
			let best = dSnap.docs[0];
			let bestMs = 0;
			for (const qd of dSnap.docs) {
				const x = qd.data();
				const t = x && typeof x.createdAt?.toMillis === 'function' ? x.createdAt.toMillis() : 0;
				if (t >= bestMs) {
					bestMs = t;
					best = qd;
				}
			}
			const b = best.data() || {};
			dispatchCode = typeof b.dispatchCode === 'string' ? b.dispatchCode.trim() : '';
		}
	} catch (e) {
		hudErr = e instanceof Error ? e.message : 'Load failed';
	}
	return {
		...row,
		loginCallsign: local,
		dispatchCode,
		pendingGamertag,
		gamertagChangesLeft,
		hudErr,
	};
}

/** Builds fully enriched operative rows for a household document. */
export async function buildEnrichedOperativeRows(
	db: Firestore,
	d: Record<string, unknown>,
): Promise<HouseholdOperativeRow[]> {
	const base = baseRowsFromHousehold(d);
	return Promise.all(base.map((r) => enrichOperativeRow(db, r)));
}

/** Loads operative rows for a household id. */
export async function loadHouseholdOperativeRows(
	db: Firestore,
	householdId: string,
): Promise<HouseholdOperativeRow[]> {
	const hid = householdId && String(householdId).trim() ? String(householdId) : '';
	if (!hid) return [];
	const hs = await getDoc(doc(db, 'households', hid));
	if (!hs.exists()) return [];
	return buildEnrichedOperativeRows(db, hs.data() || {});
}
