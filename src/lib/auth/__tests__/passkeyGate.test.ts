import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requiresPasskeyEnrollmentBeforeApp } from '../passkeyGate.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { getIdTokenResult } from 'firebase/auth';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/auth', () => ({
	getIdTokenResult: vi.fn()
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		role: ''
	}
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	getDocs: vi.fn(),
	limit: vi.fn(),
	query: vi.fn()
}));

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

describe('passkeyGate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authStore.role = '';
    });

	it('returns true if user needs enrollment', async () => {
        const mockUser = {
            uid: '123',
            providerData: [{ providerId: 'password' }]
        };
        (firestore.getDocs as any).mockResolvedValueOnce({ empty: true });
        (getIdTokenResult as any).mockResolvedValue({ claims: { role: 'coach' } });

        const result = await requiresPasskeyEnrollmentBeforeApp(mockUser as any);
        expect(result).toBe(true);
	});

    it('handles exception in isPlayerRoleExempt and returns false for exemption', async () => {
        const mockUser = {
            uid: '123',
            providerData: [{ providerId: 'password' }]
        };
        (firestore.getDocs as any).mockResolvedValueOnce({ empty: true });

        // Mock getIdTokenResult for isPlatformOperatorExempt
        (getIdTokenResult as any).mockResolvedValueOnce({ claims: { role: 'coach' } });

        // Mock getIdTokenResult for isPlayerRoleExempt to throw
        (getIdTokenResult as any).mockRejectedValueOnce(new Error('Firebase error'));

        const result = await requiresPasskeyEnrollmentBeforeApp(mockUser as any);
        expect(result).toBe(true);
    });
});
