/**
 * prescriptionSchema.test.ts — Sprint PRESCRIPTION-schema
 * Guards for intent prescription types, read-repair, and effective rep math.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	repairIntentPrescription,
	repairDrillEntry,
	effectivePrescriptionReps,
	type IntentPrescription,
	type PrescriptionDrillEntry,
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

describe('PRESCRIPTION-schema — videoUrl + cues round-trip', () => {
	it('videoUrl and cues are optional — omitted when absent', () => {
		const rx = repairIntentPrescription({ sets: 2, bilateral: false });
		expect(rx).toBeDefined();
		expect(rx?.videoUrl).toBeUndefined();
		expect(rx?.cues).toBeUndefined();
	});

	it('repairIntentPrescription round-trips valid videoUrl and cues', () => {
		const rx = repairIntentPrescription({
			sets: 3,
			bilateral: true,
			videoUrl: 'https://example.com/demo.mp4',
			cues: 'Keep your head up and use both feet.',
		});
		expect(rx?.videoUrl).toBe('https://example.com/demo.mp4');
		expect(rx?.cues).toBe('Keep your head up and use both feet.');
	});

	it('repairIntentPrescription trims whitespace from videoUrl and cues', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			videoUrl: '  https://example.com/clip.mp4  ',
			cues: '  Tight touches.  ',
		});
		expect(rx?.videoUrl).toBe('https://example.com/clip.mp4');
		expect(rx?.cues).toBe('Tight touches.');
	});

	it('repairIntentPrescription drops blank videoUrl and cues', () => {
		const rx = repairIntentPrescription({ sets: 1, bilateral: false, videoUrl: '   ', cues: '' });
		expect(rx?.videoUrl).toBeUndefined();
		expect(rx?.cues).toBeUndefined();
	});

	it('IntentPrescription type carries videoUrl and cues fields', () => {
		const rx: IntentPrescription = {
			sets: 2,
			bilateral: false,
			videoUrl: 'https://example.com/v',
			cues: 'Focus on technique.',
		};
		expect(rx.videoUrl).toBeDefined();
		expect(rx.cues).toBeDefined();
	});
});

describe('PRESCRIPTION-schema — cadence round-trip (B2)', () => {
	it('cadence is optional — omitted when absent', () => {
		const rx = repairIntentPrescription({ sets: 2, bilateral: false });
		expect(rx?.cadence).toBeUndefined();
	});

	it('round-trips valid cadence object', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			cadence: { sessionsPerWindow: 3, windowDays: 7 },
		});
		expect(rx?.cadence).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
	});

	it('clamps to integer and drops cadence with sessionsPerWindow out of range (0 and 22)', () => {
		expect(
			repairIntentPrescription({ sets: 1, bilateral: false, cadence: { sessionsPerWindow: 0, windowDays: 7 } })?.cadence,
		).toBeUndefined();
		expect(
			repairIntentPrescription({ sets: 1, bilateral: false, cadence: { sessionsPerWindow: 22, windowDays: 7 } })?.cadence,
		).toBeUndefined();
	});

	it('drops cadence with windowDays out of range (0 and 31)', () => {
		expect(
			repairIntentPrescription({ sets: 1, bilateral: false, cadence: { sessionsPerWindow: 3, windowDays: 0 } })?.cadence,
		).toBeUndefined();
		expect(
			repairIntentPrescription({ sets: 1, bilateral: false, cadence: { sessionsPerWindow: 3, windowDays: 31 } })?.cadence,
		).toBeUndefined();
	});

	it('rounds fractional sessionsPerWindow and windowDays to integer', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			cadence: { sessionsPerWindow: 3.9, windowDays: 7.8 },
		});
		expect(rx?.cadence).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
	});

	it('drops non-object cadence', () => {
		expect(
			repairIntentPrescription({ sets: 1, bilateral: false, cadence: 'weekly' })?.cadence,
		).toBeUndefined();
		expect(
			repairIntentPrescription({ sets: 1, bilateral: false, cadence: [3, 7] })?.cadence,
		).toBeUndefined();
	});
});

describe('PRESCRIPTION-schema — B3 drills[] round-trip', () => {
	it('drills[] is optional — omitted when absent', () => {
		const rx = repairIntentPrescription({ sets: 2, bilateral: false });
		expect(rx?.drills).toBeUndefined();
	});

	it('one-shot (no drills) prescription is 100% unchanged', () => {
		const rx = repairIntentPrescription({
			sets: 3,
			repsPerSet: 10,
			bilateral: false,
			videoUrl: 'https://example.com/v',
			cues: 'Focus.',
		});
		expect(rx?.drills).toBeUndefined();
		expect(rx?.sets).toBe(3);
		expect(rx?.repsPerSet).toBe(10);
		expect(rx?.videoUrl).toBe('https://example.com/v');
	});

	it('round-trips a valid drills[] array', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			drills: [
				{ sets: 3, repsPerSet: 10, drillTitle: 'Toe taps' },
				{ sets: 2, drillTitle: 'Wall passing', videoUrl: 'https://example.com/wp.mp4' },
			],
		});
		expect(rx?.drills).toHaveLength(2);
		expect(rx?.drills?.[0]).toEqual({ sets: 3, repsPerSet: 10, drillTitle: 'Toe taps' });
		expect(rx?.drills?.[1]?.drillTitle).toBe('Wall passing');
		expect(rx?.drills?.[1]?.videoUrl).toBe('https://example.com/wp.mp4');
	});

	it('repairs sets default to 1 inside each drill entry', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			drills: [{ drillTitle: 'Agility', repsPerSet: 5 }],
		});
		expect(rx?.drills?.[0]?.sets).toBe(1);
	});

	it('silently drops null/invalid drill entries (non-object)', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			drills: [null, { sets: 3, drillTitle: 'Sprints' }, undefined, 'bad'],
		});
		expect(rx?.drills).toHaveLength(1);
		expect(rx?.drills?.[0]?.drillTitle).toBe('Sprints');
	});

	it('caps drills[] at 8 (silently truncates)', () => {
		const drills = Array.from({ length: 12 }, (_, i) => ({ sets: 1, drillTitle: `D${i}` }));
		const rx = repairIntentPrescription({ sets: 1, bilateral: false, drills });
		expect(rx?.drills).toHaveLength(8);
	});

	it('omits drills field when all entries are invalid', () => {
		const rx = repairIntentPrescription({
			sets: 1,
			bilateral: false,
			drills: [null, null, 'not-an-object'],
		});
		expect(rx?.drills).toBeUndefined();
	});

	it('omits drills field when drills is an empty array', () => {
		const rx = repairIntentPrescription({ sets: 1, bilateral: false, drills: [] });
		expect(rx?.drills).toBeUndefined();
	});

	it('each entry repairs optional fields with per-field guards', () => {
		const entry = repairDrillEntry({
			sets: 2.9,
			repsPerSet: 10.7,
			bilateral: true,
			targetDurationMin: 15.3,
			targetRpe: 7.8,
			videoUrl: 'https://example.com/demo.mp4',
			cues: '  Keep hips low.  ',
			drillTitle: '  Lateral shuffle  ',
			teamDrillId: '  drill-123  ',
		});
		expect(entry?.sets).toBe(2);
		expect(entry?.repsPerSet).toBe(10);
		expect(entry?.bilateral).toBe(true);
		expect(entry?.targetDurationMin).toBe(15);
		expect(entry?.targetRpe).toBe(8);
		expect(entry?.videoUrl).toBe('https://example.com/demo.mp4');
		expect(entry?.cues).toBe('Keep hips low.');
		expect(entry?.drillTitle).toBe('Lateral shuffle');
		expect(entry?.teamDrillId).toBe('drill-123');
	});

	it('repairDrillEntry returns undefined for null/non-object/array', () => {
		expect(repairDrillEntry(null)).toBeUndefined();
		expect(repairDrillEntry(undefined)).toBeUndefined();
		expect(repairDrillEntry('string')).toBeUndefined();
		expect(repairDrillEntry([1, 2])).toBeUndefined();
	});

	it('PrescriptionDrillEntry type is exported correctly', () => {
		const entry: PrescriptionDrillEntry = {
			sets: 3,
			repsPerSet: 10,
			drillTitle: 'Cone dribbling',
		};
		expect(entry.sets).toBe(3);
	});
});

describe('B4a — requiresParentVerification round-trip', () => {
	it('is absent (undefined) when not present in raw object', () => {
		const rx = repairIntentPrescription({ sets: 2, bilateral: false });
		expect(rx?.requiresParentVerification).toBeUndefined();
	});

	it('coerces true to boolean true', () => {
		const rx = repairIntentPrescription({ sets: 1, bilateral: false, requiresParentVerification: true });
		expect(rx?.requiresParentVerification).toBe(true);
	});

	it('drops falsy values — false, null, 0, string', () => {
		expect(repairIntentPrescription({ sets: 1, bilateral: false, requiresParentVerification: false })?.requiresParentVerification).toBeUndefined();
		expect(repairIntentPrescription({ sets: 1, bilateral: false, requiresParentVerification: null })?.requiresParentVerification).toBeUndefined();
		expect(repairIntentPrescription({ sets: 1, bilateral: false, requiresParentVerification: 0 })?.requiresParentVerification).toBeUndefined();
		expect(repairIntentPrescription({ sets: 1, bilateral: false, requiresParentVerification: 'yes' })?.requiresParentVerification).toBeUndefined();
	});

	it('one-shot prescription without the flag is 100% unchanged', () => {
		const rx = repairIntentPrescription({
			sets: 3,
			repsPerSet: 10,
			bilateral: false,
			videoUrl: 'https://example.com/v',
		});
		expect(rx?.drills).toBeUndefined();
		expect(rx?.requiresParentVerification).toBeUndefined();
		expect(rx?.sets).toBe(3);
	});

	it('IntentPrescription type carries requiresParentVerification field', () => {
		const rx: IntentPrescription = {
			sets: 2,
			bilateral: false,
			requiresParentVerification: true,
		};
		expect(rx.requiresParentVerification).toBe(true);
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
