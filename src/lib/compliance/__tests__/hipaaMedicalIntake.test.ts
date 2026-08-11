import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { isDataCollectionRoute } from '$lib/auth/route-policies.js';
import { MedicalIntakeEngine } from '../MedicalIntakeEngine.svelte';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: 'demo-hipaa-medical-intake',
		firestore: {
			rules: readFileSync('firestore.rules', 'utf8'),
			host: '127.0.0.1',
			port: 8080
		}
	});
}, 30000);

afterAll(async () => {
	if (testEnv) {
		await testEnv.cleanup();
	}
});

describe('Firestore Security Rules for medical_records', () => {
	it('strictly forbids client-side reads to medical_records collection', async () => {
		const authContext = testEnv.authenticatedContext('player_123', {
			email: 'player@example.com',
			role: 'player'
		});
		const db = authContext.firestore();
		const docRef = db.collection('medical_records').doc('record_123');

		await assertFails(docRef.get());
	});

	it('strictly forbids client-side writes to medical_records collection', async () => {
		const authContext = testEnv.authenticatedContext('player_123', {
			email: 'player@example.com',
			role: 'player'
		});
		const db = authContext.firestore();
		const docRef = db.collection('medical_records').doc('record_123');

		await assertFails(docRef.set({
			emergencyContactName: 'John Doe',
			insuranceCarrier: 'Blue Shield',
			policyId: 'ABC987654',
			signature: 'Jane Doe'
		}));
	});
});

describe('MedicalIntakeEngine State & Progressive Disclosure', () => {
	it('manages fields and starts with sensitive fields hidden by default', () => {
		const engine = new MedicalIntakeEngine();
		expect(engine.emergencyContactName).toBe('');
		expect(engine.insuranceCarrier).toBe('');
		expect(engine.policyId).toBe('');
		expect(engine.signature).toBe('');
		expect(engine.showSensitiveFields).toBe(false);
		expect(engine.isValid).toBe(false);
	});

	it('progressive disclosure toggle works as expected', () => {
		const engine = new MedicalIntakeEngine();
		expect(engine.showSensitiveFields).toBe(false);

		engine.toggleSensitiveFields();
		expect(engine.showSensitiveFields).toBe(true);

		engine.toggleSensitiveFields();
		expect(engine.showSensitiveFields).toBe(false);
	});

	it('validation succeeds when non-sensitive fields are filled and sensitive fields are hidden', () => {
		const engine = new MedicalIntakeEngine();
		engine.emergencyContactName = 'Jane Doe';
		engine.signature = 'Jane Doe';
		expect(engine.isValid).toBe(true);
	});

	it('validation fails if progressive disclosure is enabled but sensitive fields are empty', () => {
		const engine = new MedicalIntakeEngine();
		engine.emergencyContactName = 'Jane Doe';
		engine.signature = 'Jane Doe';
		engine.showSensitiveFields = true;

		expect(engine.isValid).toBe(false);

		engine.insuranceCarrier = 'Kaiser';
		engine.policyId = '9876543';
		expect(engine.isValid).toBe(true);
	});
});

describe('Routing Gating & Interception', () => {
	it('redirects players with uncompleted medical releases away from data-collection routes', () => {
		const medicalSignatureVerified = false;

		// Check routing logic mirroring Layout hook
		const path = '/tracker';
		const isDataCollection = isDataCollectionRoute(path);
		const shouldRedirect = !medicalSignatureVerified && isDataCollection && !path.startsWith('/player/intake');

		expect(isDataCollection).toBe(true);
		expect(shouldRedirect).toBe(true);
	});

	it('does not redirect players who have completed their medical intake', () => {
		const medicalSignatureVerified = true;

		const path = '/tracker';
		const isDataCollection = isDataCollectionRoute(path);
		const shouldRedirect = !medicalSignatureVerified && isDataCollection && !path.startsWith('/player/intake');

		expect(isDataCollection).toBe(true);
		expect(shouldRedirect).toBe(false);
	});

	it('does not redirect players if they are already on the intake page', () => {
		const medicalSignatureVerified = false;

		const path = '/player/intake';
		const isDataCollection = isDataCollectionRoute(path);
		const shouldRedirect = !medicalSignatureVerified && isDataCollection && !path.startsWith('/player/intake');

		expect(shouldRedirect).toBe(false);
	});
});
