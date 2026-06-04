/**
 * prescriptionSchema.test.ts — Sprint PRESCRIPTION-schema
 * Guards for intent prescription types, read-repair, and effective rep math.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	repairIntentPrescription,
	effectivePrescriptionReps,
	type IntentPrescription,
} from '$lib/types/intent.js';

const ROOT = join(__dirname, '..', '..', '..');
const INTENT_TYPES = join(__dirname, '..', 'intent.ts');
const TRAINING_OPS = join(ROOT, '..', 'functions', 'src', 'domains', 'trainingOps.js');

describe('PRESCRIPTION-schema — read-repair', () => {
	it('returns undefined for null/undefined/non-object', () => {
		expect(repairIntentPrescription(null)).toBeUndefined();
		expect(repairIntentPrescription(undefined)).toBeUndefined();
		expect(repairIntentPrescription('bad')).toBeUndefined();
	});

	it('defaults sets to 1 and bilateral to false', () => {
		expect(repairIntentPrescription({})).toEqual({ sets: 1, bilateral: false });
	});

	it('repairs partial legacy prescription blobs', () => {
		expect(repairIntentPrescription({ sets: 2, repsPerSet: 8, bilateral: true })).toEqual({
			sets: 2,
			repsPerSet: 8,
			bilateral: true,
		});
	});
});

describe('PRESCRIPTION-schema — effectivePrescriptionReps', () => {
	it('returns 0 for time-only (no repsPerSet)', () => {
		const rx: IntentPrescription = { sets: 3, bilateral: true };
		expect(effectivePrescriptionReps(rx)).toBe(0);
	});

	it('computes sets × repsPerSet × 1 when not bilateral', () => {
		expect(
			effectivePrescriptionReps({ sets: 3, repsPerSet: 10, bilateral: false }),
		).toBe(30);
	});

	it('computes sets × repsPerSet × 2 when bilateral', () => {
		expect(
			effectivePrescriptionReps({ sets: 3, repsPerSet: 10, bilateral: true }),
		).toBe(60);
	});
});

describe('PRESCRIPTION-schema — deploy wiring guards', () => {
	it('intent.ts exports prescription on IntentDoc and DeployIntentInput', () => {
		const src = readFileSync(INTENT_TYPES, 'utf-8');
		expect(src).toMatch(/export interface IntentPrescription/);
		expect(src).toMatch(/prescription\?: IntentPrescription/);
		expect(src).toMatch(/repairIntentPrescription/);
		expect(src).toMatch(/effectivePrescriptionReps/);
	});

	it('trainingOps secureDeployIntent normalizes prescription', () => {
		expect(existsSync(TRAINING_OPS)).toBe(true);
		const src = readFileSync(TRAINING_OPS, 'utf-8');
		expect(src).toMatch(/function normalizePrescription/);
		expect(src).toMatch(/normalizePrescription\(data\.prescription\)/);
		expect(src).toMatch(/if \(prescription\) intentPayload\.prescription = prescription/);
	});
});
