import { authStore } from '$lib/stores/auth/facade.svelte';
import { federationService } from '$lib/services/federation.svelte';
import { getActiveDb } from '$lib/firebase';
import { isFirestoreReady } from '$lib/utils/firestoreGuard';

export class CommissionerDashboardEngine {
	tenantId = $state<string | null>(null);
	odpPipeline = $state<any[]>([]);
	complianceData = $state<any[]>([]);

	constructor() {
		if (!authStore.isAuthenticated || authStore.role !== 'commissioner') {
			this.tenantId = null;
			return;
		}
		this.tenantId = authStore.tenantId || 'mock-tenant-123';
	}

	async loadFederationCompliance() {
		const db = getActiveDb();
		if (!isFirestoreReady() || !authStore.isAuthenticated || authStore.role !== 'commissioner') return [];
		if (!this.tenantId) return [];
		if (!db) return [];

		try {
			const pipeline = await federationService.getOdpTalentPipeline(this.tenantId);
			this.odpPipeline = pipeline;

			const clubsMap = new Map();
			for (const player of pipeline) {
				if (!clubsMap.has(player.clubId)) {
					clubsMap.set(player.clubId, { total: 0, compliant: 0 });
				}
				const entry = clubsMap.get(player.clubId);
				entry.total += 1;
				// Mock compliance logic for COPPA 2.0 / SafeSport / Background Check
				entry.compliant += 1;
			}

			this.complianceData = Array.from(clubsMap.entries()).map(([clubId, data]) => {
				const safeSportRate = Math.round((data.compliant / data.total) * 100);
				return {
					clubId,
					complianceStatus: safeSportRate === 100 ? 'green' : 'amber',
					safeSportRate
				};
			});
			return this.complianceData;
		} catch (error) {
			console.error("Federation Data Load Error", error);
			return [];
		}
	}
}
