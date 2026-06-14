'use strict';

/**
 * paymentInstallments.js — server-side mirror of src/lib/parent/paymentInstallments.ts
 *
 * Pure helpers for installment ledger math + season unlock decision used by
 * handleRegistrationWebhook after Stripe payment_intent.succeeded.
 */

const MIN_INSTALLMENT_CENTS = 2500;

/** Split total cents into `count` parts; remainder lands on the final installment. */
function splitAmountCents(totalCents, count) {
  if (count < 1 || totalCents <= 0) return totalCents > 0 ? [totalCents] : [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({length: count}, (_, i) =>
    i === count - 1 ? base + remainder : base,
  );
}

/** Read optional `activeSeason.installments` director config with safe defaults. */
function parseInstallmentConfig(activeSeason, feeAmountDollars) {
  const raw =
    activeSeason?.installments && typeof activeSeason.installments === 'object' ?
      activeSeason.installments :
      {};
  const minFeeDollars =
    typeof raw.minFeeDollars === 'number' && raw.minFeeDollars > 0 ?
      raw.minFeeDollars :
      50;
  const maxInstallments =
    typeof raw.maxInstallments === 'number' && raw.maxInstallments >= 2 ?
      Math.min(4, Math.trunc(raw.maxInstallments)) :
      4;
  const explicitlyDisabled = raw.enabled === false;
  const feeCents = Math.round(feeAmountDollars * 100);
  const enabled =
    !explicitlyDisabled &&
    feeAmountDollars >= minFeeDollars &&
    feeCents >= MIN_INSTALLMENT_CENTS * 2;

  const options = [1];
  if (enabled) {
    for (let n = 2; n <= maxInstallments; n++) {
      const per = Math.floor(feeCents / n);
      if (per >= MIN_INSTALLMENT_CENTS) options.push(n);
    }
  }
  return {enabled, options, minFeeDollars};
}

function buildInstallmentDueDates(count, startMs, deadlineMs) {
  if (count <= 0) return [];
  if (!deadlineMs || deadlineMs <= startMs) {
    return Array.from({length: count}, () => null);
  }
  if (count === 1) {
    return [new Date(deadlineMs).toISOString().slice(0, 10)];
  }
  const step = (deadlineMs - startMs) / (count - 1);
  return Array.from({length: count}, (_, i) =>
    new Date(Math.round(startMs + step * i)).toISOString().slice(0, 10),
  );
}

function buildInstallmentSchedule(args) {
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
    let status = 'upcoming';
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

function inferInstallmentCount(totalFeeCents, paidCents, options) {
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

function sumPaidRegistrationCents(regs) {
  return regs
      .filter((r) => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + Math.max(0, r.feeAmountCents), 0);
}

function aggregateSeasonPaymentLedger(args) {
  const {totalFeeCents, registrations, installmentCount, deadlineIso, nowMs} = args;
  const paidCents = sumPaidRegistrationCents(registrations);
  const remainingCents = Math.max(0, totalFeeCents - paidCents);
  const sorted = [...registrations].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );
  const latest = sorted[0];

  let effectiveStatus = 'none';
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
    remainingCents > 0 ?
      Math.min(remainingCents, nextItem?.amountCents ?? remainingCents) :
      0;

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

function installmentPlanKey(tenantId, seasonId, playerEmail) {
  return `${String(tenantId).trim()}:${String(seasonId).trim()}:${String(playerEmail).trim().toLowerCase()}`;
}

function readStoredInstallmentPlan(userData, tenantId, seasonId, playerEmail) {
  const plans = userData?.preferences?.paymentInstallmentPlans;
  if (!plans || typeof plans !== 'object') return null;
  const raw = plans[installmentPlanKey(tenantId, seasonId, playerEmail)];
  if (!raw || typeof raw !== 'object') return null;
  const installmentCount = Number(raw.installmentCount);
  const totalFeeCents = Number(raw.totalFeeCents);
  if (!Number.isFinite(installmentCount) || installmentCount < 1) return null;
  if (!Number.isFinite(totalFeeCents) || totalFeeCents <= 0) return null;
  return {
    installmentCount: Math.trunc(installmentCount),
    totalFeeCents: Math.trunc(totalFeeCents),
  };
}

/**
 * Apply an in-flight webhook payment to registration rows before ledger aggregation.
 * @param {Array<{registrationId: string, paymentStatus: string, feeAmountCents: number, createdAt: number|null}>} registrations
 * @param {{registrationId: string, feeAmountCents: number}} currentPayment
 */
function applyCurrentPaymentToRegistrations(registrations, currentPayment) {
  let found = false;
  const merged = registrations.map((row) => {
    if (row.registrationId !== currentPayment.registrationId) return row;
    found = true;
    return {
      ...row,
      paymentStatus: 'paid',
      feeAmountCents: currentPayment.feeAmountCents,
    };
  });
  if (!found) {
    merged.push({
      registrationId: currentPayment.registrationId,
      paymentStatus: 'paid',
      feeAmountCents: currentPayment.feeAmountCents,
      paidAt: Date.now(),
      createdAt: Date.now(),
    });
  }
  return merged;
}

/**
 * Resolve whether season registration is fully paid after the current PI succeeds.
 * Mirrors client `loadSeasonPaymentLedger` decision path without Firestore I/O.
 */
function shouldUnlockSeasonAfterPayment(args) {
  const {
    registrations,
    activeSeason,
    storedPlan,
    currentPayment,
    registrationDeadline,
    nowMs,
  } = args;

  let totalFeeCents = 0;
  if (
    activeSeason &&
    typeof activeSeason.feeAmountDollars === 'number' &&
    activeSeason.feeAmountDollars > 0
  ) {
    totalFeeCents = Math.round(activeSeason.feeAmountDollars * 100);
  }
  if (!totalFeeCents && storedPlan) {
    totalFeeCents = storedPlan.totalFeeCents;
  }

  const rows = currentPayment ?
    applyCurrentPaymentToRegistrations(registrations, currentPayment) :
    registrations;
  const paidCents = sumPaidRegistrationCents(rows);

  if (!totalFeeCents) {
    const paidRows = rows.filter((r) => r.paymentStatus === 'paid');
    if (paidRows.length === 1 && paidRows[0].feeAmountCents > 0) {
      totalFeeCents = paidRows[0].feeAmountCents;
    }
  }
  if (totalFeeCents <= 0) {
    return {shouldUnlock: false, ledger: null, reason: 'unknown_total_fee'};
  }

  const feeDollars = totalFeeCents / 100;
  const config = parseInstallmentConfig(activeSeason, feeDollars);

  let installmentCount = 1;
  if (storedPlan && storedPlan.totalFeeCents === totalFeeCents) {
    installmentCount = storedPlan.installmentCount;
  } else if (paidCents > 0) {
    installmentCount = inferInstallmentCount(totalFeeCents, paidCents, config.options);
  }

  const ledger = aggregateSeasonPaymentLedger({
    totalFeeCents,
    registrations: rows,
    installmentCount,
    deadlineIso: registrationDeadline ?? null,
    nowMs,
  });

  return {
    shouldUnlock: ledger.effectiveStatus === 'paid',
    ledger,
    reason: ledger.effectiveStatus === 'paid' ? 'ledger_paid' : 'installments_remaining',
  };
}

module.exports = {
  MIN_INSTALLMENT_CENTS,
  splitAmountCents,
  parseInstallmentConfig,
  buildInstallmentDueDates,
  buildInstallmentSchedule,
  inferInstallmentCount,
  sumPaidRegistrationCents,
  aggregateSeasonPaymentLedger,
  installmentPlanKey,
  readStoredInstallmentPlan,
  applyCurrentPaymentToRegistrations,
  shouldUnlockSeasonAfterPayment,
};
