import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { authStore } from '$lib/stores/auth/facade.svelte';
import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';

export class FederationService {
	/**
	 * "God-mode" aggregation queries:
	 * Reading rosters across different clubIds, strictly filtered by commissioner's master tenantId.
	 */
	async getOdpTalentPipeline(tenantId: string) {
		if (!db || !authStore.isAuthenticated) return [];

		const q = query(
			collection(db, 'users'),
			where('tenantId', '==', tenantId),
			where('role', '==', 'player')
		);

		const snap = await getDocs(q);
		const players = [];

		for (const docSnap of snap.docs) {
			const data = docSnap.data();

			// Map player physical telemetry to 6-axis data array
			const statsRaw = data.player_stats || null;
			const armoryStats = data.armory?.stats || {};
			const sixAxis = deriveVanguardPrism(statsRaw, armoryStats);

			players.push({
				id: docSnap.id,
				clubId: data.clubId,
				name: data.name || 'Unknown Player',
				sixAxis
			});
		}

		return players;
	}
}

export const federationService = new FederationService();
