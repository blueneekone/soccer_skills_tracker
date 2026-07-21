import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAuditEngine } from '../audit-log/AdminAuditEngine.svelte.js';
import { authStore } from '$lib/stores/auth.svelte.js';

// Mock getDocs to ensure it's not called
vi.mock('firebase/firestore', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		getDocs: vi.fn(),
		collection: vi.fn(),
		query: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		startAfter: vi.fn()
	};
});

// Partial mock for authStore
vi.mock('$lib/stores/auth.svelte.js', () => {
	return {
		authStore: {
			isAuthenticated: false
		}
	};
});

describe('Admin Hydration Guards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should throw an error and not call getDocs in fetchAuditPage if not authenticated', async () => {
		// Set authenticated to false just in case
		authStore.isAuthenticated = false;

		const engine = new AdminAuditEngine();

		await expect(engine.fetchAuditPage(false, null)).rejects.toThrow('Unauthenticated');

		// Ensure getDocs was NOT called from the mock
		const { getDocs } = await import('firebase/firestore');
		expect(getDocs).not.toHaveBeenCalled();
	});
});
