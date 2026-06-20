import { doc, getDoc, type Firestore, type Timestamp } from 'firebase/firestore';
import { buildEnrichedOperativeRows } from '$lib/parent/householdOperatives.js';
import type { HouseholdOperativeRow } from '$lib/types/household.js';

export const HOUSEHOLD_CLEARANCE_TIMEOUT_MS = 15_000;

export interface HouseholdClearanceResult {
	householdId: string;
	coppaSigned: boolean;
	coppaAt: Timestamp | null;
	operativeRows: HouseholdOperativeRow[];
	loadErr: string;
}

export function normalizeHouseholdId(hid: string | null | undefined): string {
	return hid && String(hid).trim() ? String(hid).trim() : '';
}

/** Guards before starting a household clearance fetch — early returns must not leave loadBusy true. */
export function guardsPassForHouseholdLoad(input: {
	browser: boolean;
	authLoading: boolean;
	userEmail: string;
}): boolean {
	return input.browser && !input.authLoading && !!input.userEmail;
}

/** loadBusy always clears in the page $effect finally — stale runs ignore results via generation. */
export function shouldClearLoadBusy(_isLatestGeneration?: boolean): boolean {
	return true;
}

export async function fetchHouseholdClearance(
	db: Firestore,
	householdId: string,
	options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HouseholdClearanceResult> {
	const hid = normalizeHouseholdId(householdId);
	const timeoutMs = options?.timeoutMs ?? HOUSEHOLD_CLEARANCE_TIMEOUT_MS;

	if (!hid) {
		return {
			householdId: '',
			coppaSigned: false,
			coppaAt: null,
			operativeRows: [],
			loadErr: '',
		};
	}

	if (options?.signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new Error('household clearance timeout')), timeoutMs);
	});

	const onAbort = () => {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
	};

	options?.signal?.addEventListener('abort', onAbort, { once: true });

	try {
		const result = await Promise.race([
			(async (): Promise<HouseholdClearanceResult> => {
				const snap = await getDoc(doc(db, 'households', hid));

				if (options?.signal?.aborted) {
					throw new DOMException('Aborted', 'AbortError');
				}

				if (!snap.exists()) {
					return {
						householdId: hid,
						coppaSigned: false,
						coppaAt: null,
						operativeRows: [],
						loadErr: '',
					};
				}

				const d = snap.data() || {};
				const operativeRows = await buildEnrichedOperativeRows(db, d);

				if (options?.signal?.aborted) {
					throw new DOMException('Aborted', 'AbortError');
				}

				return {
					householdId: hid,
					coppaSigned: d.coppaSigned === true,
					coppaAt: d.coppaSignedAt ?? null,
					operativeRows,
					loadErr: '',
				};
			})(),
			timeoutPromise,
		]);

		return result;
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') {
			throw e;
		}
		const msg = e instanceof Error ? e.message : 'Read failed';
		return {
			householdId: hid,
			coppaSigned: false,
			coppaAt: null,
			operativeRows: [],
			loadErr: msg === 'household clearance timeout' ? 'Household read timed out' : msg,
		};
	} finally {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
		options?.signal?.removeEventListener('abort', onAbort);
	}
}
