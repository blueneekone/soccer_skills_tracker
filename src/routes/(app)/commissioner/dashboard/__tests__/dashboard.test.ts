import * as firebase from '$lib/firebase.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * @vitest-environment jsdom
 */
import { CommissionerDashboardEngine } from '../CommissionerDashboardEngine.svelte.js';
import { authStore } from '$lib/stores/auth/facade.svelte';
import { federationService } from '$lib/services/federation.svelte';
import * as firestoreGuard from '$lib/utils/firestoreGuard';
import { db } from '$lib/firebase/config';
import { render } from '@testing-library/svelte';
import VanguardPrism from '$lib/components/commissioner/VanguardPrism.svelte';

vi.mock('$lib/stores/auth/facade.svelte', () => ({
	authStore: {
		isAuthenticated: false,
		role: 'guest',
		tenantId: null
	}
}));

vi.mock('$lib/services/federation.svelte', () => ({
	federationService: {
		getOdpTalentPipeline: vi.fn()
	}
}));

vi.mock('$lib/utils/firestoreGuard', () => ({
	isFirestoreReady: vi.fn()
}));

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn()
}));

vi.mock('$lib/firebase/config', () => ({
	db: {}
}));

describe('Commissioner OS - Dashboard Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Engine constructor: properly blocks access if role is not commissioner', () => {
		authStore.isAuthenticated = true;
		authStore.role = 'coach';
		authStore.tenantId = 'test-tenant';

		const engine = new CommissionerDashboardEngine();
		expect(engine.tenantId).toBeNull();
	});

	it('Engine loadFederationCompliance: strictly gates fetch on B815 hydration guards', async () => {
		authStore.isAuthenticated = false;
		authStore.role = 'commissioner';
		authStore.tenantId = 'master-tenant';
		// Simulating firestore NOT ready via B815 hydration check
		vi.mocked(firebase.getActiveDb as any).mockReturnValue(null as any);
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(false);

		const engine = new CommissionerDashboardEngine();
		const result = await engine.loadFederationCompliance();

		expect(result).toEqual([]);
		expect(federationService.getOdpTalentPipeline).not.toHaveBeenCalled();
	});

	it('Engine loadFederationCompliance: successfully aggregates telemetry metrics per child club', async () => {
		authStore.isAuthenticated = true;
		authStore.role = 'commissioner';
		authStore.tenantId = 'master-tenant-123';
		const mockDb = {};
		vi.mocked(firebase.getActiveDb as any).mockReturnValue(mockDb as any);
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);

		const mockPipeline = [
			{ id: 'u1', clubId: 'club-a', name: 'Alpha Player', sixAxis: [50, 50, 50, 50, 50, 50] },
			{ id: 'u2', clubId: 'club-a', name: 'Beta Player', sixAxis: [60, 60, 60, 60, 60, 60] },
			{ id: 'u3', clubId: 'club-b', name: 'Gamma Player', sixAxis: [40, 40, 40, 40, 40, 40] }
		];
		vi.mocked(federationService.getOdpTalentPipeline).mockResolvedValue(mockPipeline);

		const engine = new CommissionerDashboardEngine();
		const result = await engine.loadFederationCompliance();

		expect(federationService.getOdpTalentPipeline).toHaveBeenCalledWith('master-tenant-123');
		expect(engine.odpPipeline).toEqual(mockPipeline);

		expect(result).toHaveLength(2); // club-a and club-b
		expect(result.find((c: any) => c.clubId === 'club-a')).toBeDefined();
		expect(result.find((c: any) => c.clubId === 'club-b')).toBeDefined();
	});
});

describe('Vanguard Prism Component Tests', () => {
	it('Renders pure SVG and strictly avoids Canvas API and Chart.js dependencies', () => {
		const { container } = render(VanguardPrism, { props: { sixAxis: [80, 80, 80, 80, 80, 80], playerLabel: 'TEST PLAYER' } });

		const svgElements = container.querySelectorAll('svg');
		expect(svgElements.length).toBeGreaterThan(0);

		const canvasElements = container.querySelectorAll('canvas');
		expect(canvasElements.length).toBe(0);

		const textNodes = container.querySelectorAll('text');
		const labelNode = Array.from(textNodes).find(node => node.textContent?.includes('TEST PLAYER'));
		expect(labelNode).toBeTruthy();
	});
});
