/**
 * paymentInstallments.ts — season registration installment planning
 *
 * Pure helpers for parent payments UX: split fees, build schedules, aggregate
 * multiple season_registrations into a single ledger view.
 */

export type RegistrationPaymentStatus =
	| 'none'
	| 'pending'
	| 'processing'
	| 'paid'
	| 'failed';

/** Display status includes partial progress across installment payments. */
export type PaymentDisplayStatus = RegistrationPaymentStatus | 'partial';

export interface InstallmentScheduleItem {
	index: number;
	amountCents: number;
	dueDateIso: string | null;
	status: 'paid' | 'due' | 'upcoming' | 'overdue';
}

export interface SeasonRegistrationRow {
	registrationId: string;
	paymentStatus: RegistrationPaymentStatus;
	feeAmountCents: number;
	paidAt: number | null;
	createdAt: number | null;
}

export interface InstallmentSeasonConfig {
	enabled: boolean;
	/** Installment counts offered (always includes 1 = pay in full). */
	options: number[];
	minFeeDollars: number;
}

export interface SeasonPaymentLedger {
	totalFeeCents: number;
	paidCents: number;
	remainingCents: number;
	effectiveStatus: PaymentDisplayStatus;
	installmentCount: number;
	schedule: InstallmentScheduleItem[];
	nextInstallmentIndex: number;
	nextDueCents: number;
	paidInstallmentCount: number;
	registrations: SeasonRegistrationRow[];
}

const MIN_INSTALLMENT_CENTS = 2500; // $25 minimum per installment charge

/** Split total cents into `count` parts; remainder lands on the final installment. */
export function splitAmountCents(totalCents: number, count: number): number[] {
	if (count < 1 || totalCents <= 0) return totalCents > 0 ? [totalCents] : [];
	const base = Math.floor(totalCents / count);
	const remainder = totalCents - base * count;
	return Array.from({ length: count }, (_, i) =>
		i === count - 1 ? base + remainder : base,
	);
}

/** Read optional `activeSeason.installments` director config with safe defaults. */
export function parseInstallmentConfig(
	activeSeason: Record<string, unknown> | null | undefined,
	feeAmountDollars: number,
): InstallmentSeasonConfig {
	const raw =
		activeSeason?.installments && typeof activeSeason.installments === 'object'
			? (activeSeason.installments as Record<string, unknown>)
			: {};
	const minFeeDollars =
		typeof raw.minFeeDollars === 'number' && raw.minFeeDollars > 0
			? raw.minFeeDollars
			: 50;
	const maxInstallments =
		typeof raw.maxInstallments === 'number' && raw.maxInstallments >= 2
			? Math.min(4, Math.trunc(raw.maxInstallments))
			: 4;
	const explicitlyDisabled = raw.enabled === false;
	const feeCents = Math.round(feeAmountDollars * 100);
	const enabled =
		!explicitlyDisabled && feeAmountDollars >= minFeeDollars && feeCents >= MIN_INSTALLMENT_CENTS * 2;

	const options: number[] = [1];
	if (enabled) {
		for (let n = 2; n <= maxInstallments; n++) {
			const per = Math.floor(feeCents / n);
			if (per >= MIN_INSTALLMENT_CENTS) options.push(n);
		}
	}
	return { enabled, options, minFeeDollars };
}

/** Evenly space due dates from `startMs` through `deadlineMs` (inclusive endpoints). */
export function buildInstallmentDueDates(
	count: number,
	startMs: number,
	deadlineMs: number | null,
): Array<string | null> {
	if (count <= 0) return [];
	if (!deadlineMs || deadlineMs <= startMs) {
		return Array.from({ length: count }, () => null);
	}
	if (count === 1) {
		return [new Date(deadlineMs).toISOString().slice(0, 10)];
	}
	const step = (deadlineMs - startMs) / (count - 1);
	return Array.from({ length: count }, (_, i) =>
		new Date(Math.round(startMs + step * i)).toISOString().slice(0, 10),
	);
}

export function buildInstallmentSchedule(args: {
	totalFeeCents: number;
	installmentCount: number;
	paidCents: number;
	startMs?: number;
	deadlineIso?: string | null;
	nowMs?: number;
}): InstallmentScheduleItem[] {
	const {
		totalFeeCents,
		installmentCount,
		paidCents,
		startMs = Date.now(),
		deadlineIso = null,
		nowMs = Date.now(),
	} = args;
	const amounts = splitAmountCents(totalFeeCents, installmentCount);
	const deadlineMs = deadlineIso ? Date.parse(`${deadlineIso}T23:59:59Z`) : null;
	const dueDates = buildInstallmentDueDates(installmentCount, startMs, deadlineMs);

	let runningPaid = paidCents;
	const today = new Date(nowMs).toISOString().slice(0, 10);
	let markedDue = false;

	return amounts.map((amountCents, index) => {
		let status: InstallmentScheduleItem['status'] = 'upcoming';
		if (runningPaid >= amountCents) {
			status = 'paid';
			runningPaid -= amountCents;
		} else if (!markedDue) {
			status = 'due';
			markedDue = true;
			runningPaid = 0;
		} else {
			const due = dueDates[index];
			if (!due) status = 'upcoming';
			else if (due < today) status = 'overdue';
			else if (due === today) status = 'due';
			else status = 'upcoming';
		}
		return {
			index,
			amountCents,
			dueDateIso: dueDates[index],
			status,
		};
	});
}

/** Infer installment count from equal payment sizes already recorded. */
export function inferInstallmentCount(
	totalFeeCents: number,
	paidCents: number,
	options: number[],
): number {
	if (paidCents <= 0 || totalFeeCents <= 0) return 1;
	for (const count of [...options].sort((a, b) => b - a)) {
		if (count <= 1) continue;
		const parts = splitAmountCents(totalFeeCents, count);
		const first = parts[0];
		if (first > 0 && paidCents % first === 0) {
			const paidCount = paidCents / first;
			if (paidCount > 0 && paidCount < count) return count;
		}
	}
	return 1;
}

export function sumPaidRegistrationCents(regs: SeasonRegistrationRow[]): number {
	return regs
		.filter((r) => r.paymentStatus === 'paid')
		.reduce((sum, r) => sum + Math.max(0, r.feeAmountCents), 0);
}

export function aggregateSeasonPaymentLedger(args: {
	totalFeeCents: number;
	registrations: SeasonRegistrationRow[];
	installmentCount: number;
	deadlineIso?: string | null;
	nowMs?: number;
}): SeasonPaymentLedger {
	const { totalFeeCents, registrations, installmentCount, deadlineIso, nowMs } = args;
	const paidCents = sumPaidRegistrationCents(registrations);
	const remainingCents = Math.max(0, totalFeeCents - paidCents);
	const sorted = [...registrations].sort(
		(a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
	);
	const latest = sorted[0];

	let effectiveStatus: PaymentDisplayStatus = 'none';
	if (paidCents >= totalFeeCents && totalFeeCents > 0) {
		effectiveStatus = 'paid';
	} else if (paidCents > 0) {
		effectiveStatus = 'partial';
	} else if (latest) {
		effectiveStatus = latest.paymentStatus;
	}

	const schedule = buildInstallmentSchedule({
		totalFeeCents,
		installmentCount: Math.max(1, installmentCount),
		paidCents,
		deadlineIso,
		nowMs,
	});
	const paidInstallmentCount = schedule.filter((s) => s.status === 'paid').length;
	const nextItem =
		schedule.find((s) => s.status === 'due' || s.status === 'overdue') ??
		schedule.find((s) => s.status === 'upcoming');
	const nextInstallmentIndex = nextItem?.index ?? Math.max(0, paidInstallmentCount);
	const nextDueCents =
		remainingCents > 0
			? Math.min(remainingCents, nextItem?.amountCents ?? remainingCents)
			: 0;

	return {
		totalFeeCents,
		paidCents,
		remainingCents,
		effectiveStatus,
		installmentCount: Math.max(1, installmentCount),
		schedule,
		nextInstallmentIndex,
		nextDueCents,
		paidInstallmentCount,
		registrations,
	};
}

export function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function displayStatusLabel(status: PaymentDisplayStatus): string {
	if (status === 'paid') return 'Paid';
	if (status === 'partial') return 'Partially paid';
	if (status === 'pending') return 'Pending';
	if (status === 'processing') return 'Processing';
	if (status === 'failed') return 'Failed';
	return 'Not paid';
}

export function installmentProgressLabel(ledger: SeasonPaymentLedger): string {
	if (ledger.installmentCount <= 1) return '';
	if (ledger.effectiveStatus === 'paid') {
		return `Paid in full (${ledger.installmentCount} installments)`;
	}
	return `${ledger.paidInstallmentCount} of ${ledger.installmentCount} installments · ${formatCents(ledger.remainingCents)} remaining`;
}
