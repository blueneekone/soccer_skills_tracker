/**
 * commerceWebhookInstallments.test.js — B-01 payment webhook installment unlock guards
 *
 * Proves partial PI success leaves activeSeasonStatus unchanged and final
 * installment unlocks only when the mirrored server ledger is fully paid.
 *
 * Run from repo root:
 *   node --test functions/__tests__/commerceWebhookInstallments.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const commerceSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'functions/commerce.js'),
    'utf8',
);
const commerceCommerceSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'functions-commerce/commerce.js'),
    'utf8',
);

const {
  splitAmountCents,
  aggregateSeasonPaymentLedger,
  shouldUnlockSeasonAfterPayment,
  readStoredInstallmentPlan,
} = require('../paymentInstallments');

describe('paymentInstallments server mirror — ledger math', () => {
  it('splitAmountCents puts remainder on final installment', () => {
    assert.deepEqual(splitAmountCents(10000, 3), [3333, 3333, 3334]);
  });

  it('aggregateSeasonPaymentLedger reports partial after first installment', () => {
    const ledger = aggregateSeasonPaymentLedger({
      totalFeeCents: 20000,
      installmentCount: 2,
      registrations: [
        {
          registrationId: 'reg-1',
          paymentStatus: 'paid',
          feeAmountCents: 10000,
          paidAt: Date.now(),
          createdAt: Date.now(),
        },
      ],
    });
    assert.equal(ledger.effectiveStatus, 'partial');
    assert.equal(ledger.remainingCents, 10000);
    assert.equal(ledger.paidInstallmentCount, 1);
  });

  it('aggregateSeasonPaymentLedger reports paid when ledger is complete', () => {
    const ledger = aggregateSeasonPaymentLedger({
      totalFeeCents: 20000,
      installmentCount: 2,
      registrations: [
        {
          registrationId: 'reg-1',
          paymentStatus: 'paid',
          feeAmountCents: 10000,
          paidAt: Date.now() - 1000,
          createdAt: Date.now() - 1000,
        },
        {
          registrationId: 'reg-2',
          paymentStatus: 'paid',
          feeAmountCents: 10000,
          paidAt: Date.now(),
          createdAt: Date.now(),
        },
      ],
    });
    assert.equal(ledger.effectiveStatus, 'paid');
    assert.equal(ledger.remainingCents, 0);
    assert.equal(ledger.paidInstallmentCount, 2);
  });
});

describe('shouldUnlockSeasonAfterPayment — partial vs final installment', () => {
  const activeSeason = {feeAmountDollars: 200, installments: {enabled: true}};
  const storedPlan = {installmentCount: 2, totalFeeCents: 20000};

  it('partial PI → shouldUnlock false (first installment only)', () => {
    const result = shouldUnlockSeasonAfterPayment({
      registrations: [],
      activeSeason,
      storedPlan,
      currentPayment: {registrationId: 'reg-1', feeAmountCents: 10000},
    });
    assert.equal(result.shouldUnlock, false);
    assert.equal(result.reason, 'installments_remaining');
    assert.equal(result.ledger?.effectiveStatus, 'partial');
    assert.equal(result.ledger?.paidCents, 10000);
  });

  it('final installment PI → shouldUnlock true', () => {
    const result = shouldUnlockSeasonAfterPayment({
      registrations: [
        {
          registrationId: 'reg-1',
          paymentStatus: 'paid',
          feeAmountCents: 10000,
          paidAt: Date.now() - 1000,
          createdAt: Date.now() - 1000,
        },
      ],
      activeSeason,
      storedPlan,
      currentPayment: {registrationId: 'reg-2', feeAmountCents: 10000},
    });
    assert.equal(result.shouldUnlock, true);
    assert.equal(result.reason, 'ledger_paid');
    assert.equal(result.ledger?.effectiveStatus, 'paid');
    assert.equal(result.ledger?.paidCents, 20000);
  });

  it('pay-in-full single PI → shouldUnlock true', () => {
    const result = shouldUnlockSeasonAfterPayment({
      registrations: [],
      activeSeason: {feeAmountDollars: 150},
      storedPlan: null,
      currentPayment: {registrationId: 'reg-full', feeAmountCents: 15000},
    });
    assert.equal(result.shouldUnlock, true);
    assert.equal(result.ledger?.effectiveStatus, 'paid');
  });

  it('readStoredInstallmentPlan reads parent preferences key', () => {
    const plan = readStoredInstallmentPlan(
        {
          preferences: {
            paymentInstallmentPlans: {
              'club-a:season-1:player@example.com': {
                installmentCount: 3,
                totalFeeCents: 30000,
              },
            },
          },
        },
        'club-a',
        'season-1',
        'player@example.com',
    );
    assert.deepEqual(plan, {installmentCount: 3, totalFeeCents: 30000});
  });
});

describe('commerce webhook wiring — activeSeasonStatus gated on ledger', () => {
  it('functions/commerce.js requires paymentInstallments unlock helper', () => {
    assert.match(commerceSrc, /require\('\.\/paymentInstallments'\)/);
    assert.match(commerceSrc, /shouldUnlockSeasonAfterPayment/);
    assert.match(commerceSrc, /resolveSeasonUnlockContext/);
  });

  it('functions/commerce.js only sets activeSeasonStatus when shouldUnlock', () => {
    assert.match(
        commerceSrc,
        /if \(unlock\.shouldUnlock\)[\s\S]*activeSeasonStatus:\s*'active'/,
        'activeSeasonStatus must be inside shouldUnlock branch',
    );
    assert.match(
        commerceSrc,
        /partial season payment — activeSeasonStatus unchanged/,
        'partial payments must log without unlocking',
    );
  });

  it('functions-commerce/commerce.js stays bundled in sync (unlock gate)', () => {
    assert.match(commerceCommerceSrc, /shouldUnlockSeasonAfterPayment/);
    assert.match(commerceCommerceSrc, /partial season payment — activeSeasonStatus unchanged/);
  });
});
