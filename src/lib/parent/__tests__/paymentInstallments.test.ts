/**
 * paymentInstallments.test.ts — P2 parent payment installment guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	aggregateSeasonPaymentLedger,
	buildInstallmentSchedule,
	inferInstallmentCount,
	parseInstallmentConfig,
	splitAmountCents,
} from '../paymentInstallments.js';

const ROOT = join(process.cwd());

describe('paymentInstallments — pure helpers', () => {
	it('splitAmountCents puts remainder on final installment', () => {
		expect(splitAmountCents(10000, 3)).toEqual([3333, 3333, 3334]);
	});

	it('parseInstallmentConfig enables multi-pay when fee meets minimum', () => {
		const cfg = parseInstallmentConfig({ installments: { enabled: true } }, 200);
		expect(cfg.enabled).toBe(true);
		expect(cfg.options).toContain(2);
		expect(cfg.options).toContain(1);
	});

	it('buildInstallmentSchedule marks paid slices after partial payment', () => {
		const schedule = buildInstallmentSchedule({
			totalFeeCents: 12000,
			installmentCount: 3,
			paidCents: 4000,
		});
		expect(schedule[0].status).toBe('paid');
		expect(schedule[1].status).toBe('due');
	});

	it('inferInstallmentCount detects an in-progress 3-pay plan', () => {
		const count = inferInstallmentCount(30000, 10000, [1, 2, 3, 4]);
		expect(count).toBe(3);
	});

	it('aggregateSeasonPaymentLedger reports partial status', () => {
		const ledger = aggregateSeasonPaymentLedger({
			totalFeeCents: 20000,
			installmentCount: 2,
			registrations: [
				{
					registrationId: 'a',
					paymentStatus: 'paid',
					feeAmountCents: 10000,
					paidAt: Date.now(),
					createdAt: Date.now(),
				},
			],
		});
		expect(ledger.effectiveStatus).toBe('partial');
		expect(ledger.remainingCents).toBe(10000);
		expect(ledger.nextDueCents).toBe(10000);
	});
});

describe('P2 parent payments — route wiring', () => {
	it('payments page imports installment ledger loader', () => {
		const src = readFileSync(
			join(ROOT, 'src/routes/(app)/parent/payments/+page.svelte'),
			'utf8',
		);
		expect(src).toMatch(/loadSeasonPaymentLedger/);
		expect(src).toMatch(/paymentInstallments/);
	});

	it('SeasonRegistration offers installment plan selection', () => {
		const src = readFileSync(
			join(ROOT, 'src/lib/components/parent/SeasonRegistration.svelte'),
			'utf8',
		);
		expect(src).toMatch(/installmentCount/);
		expect(src).toMatch(/saveInstallmentPlan/);
		expect(src).toMatch(/buildInstallmentSchedule/);
	});

	it('parent lib exports installment preference persistence', () => {
		const src = readFileSync(
			join(ROOT, 'src/lib/parent/paymentInstallmentPrefs.ts'),
			'utf8',
		);
		expect(src).toMatch(/paymentInstallmentPlans/);
	});
});
