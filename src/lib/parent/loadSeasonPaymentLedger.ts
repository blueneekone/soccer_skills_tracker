import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import {
	aggregateSeasonPaymentLedger,
	inferInstallmentCount,
	parseInstallmentConfig,
	type SeasonPaymentLedger,
	type SeasonRegistrationRow,
} from '$lib/parent/paymentInstallments.js';
import { loadInstallmentPlan } from '$lib/parent/paymentInstallmentPrefs.js';

export async function fetchSeasonRegistrations(
	playerEmail: string,
	tenantId: string,
	seasonId: string,
): Promise<SeasonRegistrationRow[]> {
	const rq = query(
		collection(db, 'season_registrations'),
		where('playerEmail', '==', playerEmail.trim().toLowerCase()),
		where('tenantId', '==', tenantId.trim()),
		where('seasonId', '==', seasonId.trim()),
	);
	const snap = await getDocs(rq);
	return snap.docs.map((d) => {
		const data = d.data();
		return {
			registrationId: d.id,
			paymentStatus: (data.paymentStatus as SeasonRegistrationRow['paymentStatus']) ?? 'none',
			feeAmountCents: Number(data.feeAmountCents) || 0,
			paidAt: data.paidAt?.toMillis?.() ?? null,
			createdAt: data.createdAt?.toMillis?.() ?? null,
		};
	});
}

export async function loadSeasonPaymentLedger(args: {
	parentEmail: string;
	playerEmail: string;
	tenantId: string;
	seasonId: string;
	totalFeeCents: number;
	activeSeason?: Record<string, unknown> | null;
	registrationDeadline?: string | null;
}): Promise<SeasonPaymentLedger> {
	const {
		parentEmail,
		playerEmail,
		tenantId,
		seasonId,
		totalFeeCents,
		activeSeason,
		registrationDeadline,
	} = args;
	const feeDollars = totalFeeCents / 100;
	const config = parseInstallmentConfig(activeSeason, feeDollars);
	const registrations = await fetchSeasonRegistrations(playerEmail, tenantId, seasonId);
	const stored = await loadInstallmentPlan(parentEmail, tenantId, seasonId, playerEmail);
	const paidCents = registrations
		.filter((r) => r.paymentStatus === 'paid')
		.reduce((sum, r) => sum + r.feeAmountCents, 0);

	let installmentCount = 1;
	if (stored && stored.totalFeeCents === totalFeeCents) {
		installmentCount = stored.installmentCount;
	} else if (paidCents > 0) {
		installmentCount = inferInstallmentCount(totalFeeCents, paidCents, config.options);
	}

	return aggregateSeasonPaymentLedger({
		totalFeeCents,
		registrations,
		installmentCount,
		deadlineIso: registrationDeadline ?? null,
	});
}
