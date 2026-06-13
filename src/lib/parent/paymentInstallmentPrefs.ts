import { db } from '$lib/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export type StoredInstallmentPlan = {
	installmentCount: number;
	totalFeeCents: number;
	updatedAt: number;
};

function planKey(tenantId: string, seasonId: string, playerEmail: string): string {
	return `${tenantId.trim()}:${seasonId.trim()}:${playerEmail.trim().toLowerCase()}`;
}

/** Persist parent's installment plan choice on their user preferences doc. */
export async function loadInstallmentPlan(
	parentEmail: string,
	tenantId: string,
	seasonId: string,
	playerEmail: string,
): Promise<StoredInstallmentPlan | null> {
	const email = parentEmail.trim().toLowerCase();
	if (!email) return null;
	try {
		const snap = await getDoc(doc(db, 'users', email));
		if (!snap.exists()) return null;
		const plans = snap.data()?.preferences?.paymentInstallmentPlans;
		if (!plans || typeof plans !== 'object') return null;
		const raw = (plans as Record<string, unknown>)[planKey(tenantId, seasonId, playerEmail)];
		if (!raw || typeof raw !== 'object') return null;
		const row = raw as Record<string, unknown>;
		const installmentCount = Number(row.installmentCount);
		const totalFeeCents = Number(row.totalFeeCents);
		if (!Number.isFinite(installmentCount) || installmentCount < 1) return null;
		if (!Number.isFinite(totalFeeCents) || totalFeeCents <= 0) return null;
		return {
			installmentCount: Math.trunc(installmentCount),
			totalFeeCents: Math.trunc(totalFeeCents),
			updatedAt: Number(row.updatedAt) || 0,
		};
	} catch {
		return null;
	}
}

export async function saveInstallmentPlan(
	parentEmail: string,
	tenantId: string,
	seasonId: string,
	playerEmail: string,
	plan: Pick<StoredInstallmentPlan, 'installmentCount' | 'totalFeeCents'>,
): Promise<void> {
	const email = parentEmail.trim().toLowerCase();
	if (!email) return;
	const key = planKey(tenantId, seasonId, playerEmail);
	const snap = await getDoc(doc(db, 'users', email));
	const existingPrefs = snap.exists() ? snap.data()?.preferences ?? {} : {};
	const existingPlans =
		existingPrefs.paymentInstallmentPlans &&
		typeof existingPrefs.paymentInstallmentPlans === 'object'
			? existingPrefs.paymentInstallmentPlans
			: {};
	await updateDoc(doc(db, 'users', email), {
		preferences: {
			...existingPrefs,
			paymentInstallmentPlans: {
				...existingPlans,
				[key]: {
					installmentCount: Math.max(1, Math.trunc(plan.installmentCount)),
					totalFeeCents: Math.max(1, Math.trunc(plan.totalFeeCents)),
					updatedAt: Date.now(),
				},
			},
		},
	});
}
