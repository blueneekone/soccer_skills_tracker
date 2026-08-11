import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommissionerDashboardEngine } from '../CommissionerDashboardEngine.svelte';
import fs from 'fs';
import path from 'path';
import * as firestoreGuard from '$lib/utils/firestoreGuard.js';
import * as firebase from '$lib/firebase.js';
import * as firestore from 'firebase/firestore';

// Mock dependencies
let mockRole = 'commissioner';
vi.mock('$lib/firebase/config', () => ({
	db: {}
}));

vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: new Proxy({}, {
		get: (_, prop) => (prop === "role" ? mockRole : prop === "isAuthenticated" ? true : prop === "isLoading" ? false : prop === "userProfile" ? { tenantId: "tenant-123" } : undefined),
		set: (_, prop, val) => {
			if (prop === 'role') mockRole = val;
			return true;
		}
	}),
}));

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn()
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn()
}));

vi.mock('firebase/firestore', () => {
	return {
		collection: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		getDocs: vi.fn()
	};
});

describe('Commissioner OS Master Dashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRole = 'commissioner';
	});

	describe('CommissionerDashboardEngine', () => {
		it('should gate access if the custom JWT role claim is not commissioner', async () => {
			mockRole = 'coach'; // Override for test
			vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);

			const engine = new CommissionerDashboardEngine();
			expect(engine.isAuthorized).toBe(false);

			await engine.fetchFederationData();
			expect(engine.error).toBe('Unauthorized access.');
		});

		it('should return early if B815 defensive hydration guard fails', async () => {
			vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(false);

			const engine = new CommissionerDashboardEngine();
			await engine.fetchFederationData();

			expect(firebase.getActiveDb).not.toHaveBeenCalled();
			expect(engine.isLoading).toBe(false);
		});

		it('should resolve telemetry across multi-tenant child club databases', async () => {
			vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);

			const mockDb = {};
			vi.mocked(firebase.getActiveDb).mockReturnValue(mockDb as any);

			const mockDocs = [
				{
					id: 'club-1',
					data: () => ({
						name: 'Test Club',
						compliance: { safesport: 'green', background: 'amber', coppa: 'green' },
						updatedAt: { toMillis: () => 1620000000000 }
					})
				}
			];
			vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any);

			const engine = new CommissionerDashboardEngine();
			await engine.fetchFederationData();

			expect(firestore.collection).toHaveBeenCalledWith(mockDb, 'clubs');
			expect(firestore.where).toHaveBeenCalledWith('tenantId', '==', 'tenant-123');
			expect(engine.clubs.length).toBe(1);
			expect(engine.clubs[0].id).toBe('club-1');
		});
	});

	describe('VanguardPrism Component (Static Regex)', () => {
		it('should be constructed without Canvas API dependencies and use pure SVG attributes', () => {
			const filePath = path.resolve(__dirname, '../../../../../../src/lib/components/commissioner/VanguardPrism.svelte');
			const content = fs.readFileSync(filePath, 'utf-8');

			// Assert presence of <svg> element with correct standard geometry attributes
			expect(content).toMatch(/<svg/);
			expect(content).toMatch(/viewBox="0 0 1200 800"/);
			expect(content).toMatch(/preserveAspectRatio="xMidYMid slice"/);

			// Assert NO canvas tags
			expect(content).not.toMatch(/<canvas/);
			expect(content).toMatch(/<defs>/);
			expect(content).toMatch(/id="neonBloom"/);

			// Assert no Tailwind text-sizing classes exist in the file inside SVG contexts
			// Just a general check that `tw-text-` size constraints aren't used for fonts
			expect(content).not.toMatch(/tw-text-\[\d+px\]/);
			expect(content).not.toMatch(/tw-text-(xs|sm|base|lg|xl|2xl)/);

			// Assert that pure native font-size SVG attribute is used
			expect(content).toMatch(/font-size="\d+"/);
		});
	});
});
