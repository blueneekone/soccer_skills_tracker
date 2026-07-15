import { db } from '$lib/firebase.js';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { toEpochMs } from '$lib/utils/timestamp.js';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'past_due' | 'cancelled';
export type VettingStatus = 'pending' | 'processing' | 'cleared' | 'flagged';

export interface RecruiterRow {
	id: string;
	email: string;
	scoutName: string;
	agency: string;
	affiliationType: string;
	phone: string;
	region: string;
	verificationStatus: VerificationStatus;
	vettingStatus: VettingStatus;
	subscriptionStatus: SubscriptionStatus;
	subscriptionTier: string;
	lastActiveAt: number;
	createdAt: number;
	notes: string;
}

export function coerceVetting(raw: unknown): VettingStatus {
	const v = typeof raw === 'string' ? raw.toLowerCase() : '';
	if (v === 'processing' || v === 'cleared' || v === 'flagged') return v as VettingStatus;
	return 'pending';
}

export function coerceVerification(raw: unknown): VerificationStatus {
	const v = (typeof raw === 'string' ? raw : '').toLowerCase();
	if (v === 'verified' || v === 'rejected') return v as VerificationStatus;
	return 'pending';
}

export function coerceSubscription(raw: unknown): SubscriptionStatus {
	const v = (typeof raw === 'string' ? raw : '').toLowerCase();
	if (v === 'trial' || v === 'active' || v === 'past_due' || v === 'cancelled') return v as SubscriptionStatus;
	return 'none';
}

export async function loadRecruitersData(): Promise<RecruiterRow[]> {
	const snap = await getDocs(query(collection(db, 'recruiters'), orderBy('email')));
	const next: RecruiterRow[] = [];
	snap.forEach((d) => {
		const raw = (d.data() || {}) as Record<string, unknown>;
		const email = typeof raw.email === 'string' && raw.email ? raw.email : d.id;
		next.push({
			id: d.id,
			email,
			scoutName: typeof raw.scoutName === 'string' ? raw.scoutName.trim() : '',
			agency: typeof raw.agency === 'string' ? raw.agency.trim() : '',
			affiliationType: typeof raw.affiliationType === 'string' ? raw.affiliationType.trim() : '',
			phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
			region: typeof raw.region === 'string' ? raw.region.trim() : '',
			verificationStatus: coerceVerification(raw.verificationStatus),
			vettingStatus: coerceVetting(raw.vettingStatus),
			subscriptionStatus: coerceSubscription(raw.subscriptionStatus),
			subscriptionTier: typeof raw.subscriptionTier === 'string' ? raw.subscriptionTier.trim() : '',
			lastActiveAt: toEpochMs(raw.lastActiveAt ?? raw.lastLoginAt ?? raw.updatedAt),
			createdAt: toEpochMs(raw.createdAt),
			notes: typeof raw.notes === 'string' ? raw.notes : ''
		});
	});
	return next;
}
