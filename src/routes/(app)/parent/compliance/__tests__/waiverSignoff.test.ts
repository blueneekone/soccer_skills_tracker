import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { WaiverController } from '../WaiverController.svelte.ts';
import { writeBatch, doc } from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
	const actual = await vi.importActual('firebase/firestore');
	return {
		...actual,
		doc: vi.fn((...args) => {
			const path = args.map(a => typeof a === 'string' ? a : (a?.id || 'doc')).join('/');
			return { path, id: args[args.length - 1] };
		}),
		writeBatch: vi.fn(() => ({
			set: vi.fn(),
			commit: vi.fn().mockResolvedValue(undefined)
		})),
		getDoc: vi.fn().mockResolvedValue({
			exists: () => false,
			data: () => ({})
		})
	};
});

vi.mock('$lib/firebase.js', () => ({
	db: {},
	getActiveDb: vi.fn(() => ({}))
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn(() => true)
}));

vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: {
		user: { email: 'parent@vanguard.com', uid: 'parent_uid_123' },
		isAuthenticated: true,
		isLoading: false,
		role: 'parent'
	}
}));

describe('Waiver Sign-off and Media Release Control', () => {
	let controller: WaiverController;

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new WaiverController();
	});

	it('Asserts clicking sign-off correctly registers the E-Sign payload (IP address, date, timestamp) and commits atomically', async () => {
		const mockSet = vi.fn();
		const mockCommit = vi.fn().mockResolvedValue(undefined);

		vi.mocked(writeBatch).mockReturnValue({
			set: mockSet,
			commit: mockCommit
		} as any);

		const email = 'parent@vanguard.com';
		const ipAddress = '198.51.100.42';

		// Set opt-ins
		controller.fanOsOptIn = true;
		controller.playerOsOptIn = true;

		await controller.submitWaiver(email, ipAddress);

		expect(controller.success).toBe(true);
		expect(writeBatch).toHaveBeenCalled();
		expect(mockCommit).toHaveBeenCalledTimes(1); // atomically committed

		// We expect 2 operations:
		// 1. set the consent record under the consents collection
		// 2. set (with merge) the user profile under the users collection
		expect(mockSet).toHaveBeenCalledTimes(2);

		// Inspect set arguments
		const firstCall = mockSet.mock.calls[0];
		const secondCall = mockSet.mock.calls[1];

		// Consents doc assertion
		const consentsDocData = firstCall[1];
		expect(consentsDocData.email).toBe(email);
		expect(consentsDocData.consentType).toBe('sport_hazard_liability_and_media_release');
		expect(consentsDocData.encryptedPayload).toBeDefined();

		// Check encrypted data
		const decryptedRaw = controller.decrypt(consentsDocData.encryptedPayload);
		const decryptedJson = JSON.parse(decryptedRaw);
		expect(decryptedJson.ipAddress).toBe(ipAddress);
		expect(decryptedJson.email).toBe(email);
		expect(decryptedJson.timestamp).toBeDefined();
		expect(decryptedJson.fan_os_opt_in).toBe(true);
		expect(decryptedJson.player_os_opt_in).toBe(true);

		// Profile doc assertion
		const profileDocData = secondCall[1];
		expect(profileDocData.fan_os_opt_in).toBe(true);
		expect(profileDocData.player_os_opt_in).toBe(true);
		expect(profileDocData.waiver_signed_at).toBeDefined();
		expect(profileDocData.waiver_encrypted_payload).toBe(consentsDocData.encryptedPayload);
	});

	it('Asserts that opting out of the video release successfully sets the fan_os_opt_in and player_os_opt_in flags to false in their Firestore profile', async () => {
		const mockSet = vi.fn();
		const mockCommit = vi.fn().mockResolvedValue(undefined);

		vi.mocked(writeBatch).mockReturnValue({
			set: mockSet,
			commit: mockCommit
		} as any);

		const email = 'parent@vanguard.com';
		const ipAddress = '198.51.100.42';

		// Opt out of both
		controller.fanOsOptIn = false;
		controller.playerOsOptIn = false;

		await controller.submitWaiver(email, ipAddress);

		expect(controller.success).toBe(true);
		expect(mockCommit).toHaveBeenCalledTimes(1);

		// Verify flags set to false in user profile (second mockSet call)
		const profileDocData = mockSet.mock.calls[1][1];
		expect(profileDocData.fan_os_opt_in).toBe(false);
		expect(profileDocData.player_os_opt_in).toBe(false);

		// Verify flags also set to false in consents document
		const consentDocData = mockSet.mock.calls[0][1];
		expect(consentDocData.fan_os_opt_in).toBe(false);
		expect(consentDocData.player_os_opt_in).toBe(false);
	});
});

// Add decrypt method helper to the test scope or controller
// Since the controller doesn't strictly need decrypt at runtime (it's write-only secure compliance vault),
// we can implement a decrypt helper here to inspect and verify the encrypted values in the test!
WaiverController.prototype['decrypt'] = function (encrypted: string, secretKey: string = 'esign-audit-secret'): string {
	const xorResult = atob(encrypted);
	let b64 = '';
	for (let i = 0; i < xorResult.length; i++) {
		const charCode = xorResult.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
		b64 += String.fromCharCode(charCode);
	}
	return decodeURIComponent(atob(b64));
};
