import { getActiveDb } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

export interface RosterPlayer {
	id: string;
	clubId: string;
	name: string;
	role: string;
	tenantId: string;
}

/**
 * FederationEngine.svelte.ts — Cell-Isolated State Federation Aggregator (Read-Only)
 * Walled off strictly from global admin mutations.
 * Constraints:
 * 1. Exclusively uses Svelte 5 runes ($state, $derived, etc.) for reactive states.
 * 2. Gated by B815 defensive hydration guards.
 * 3. Restricts all queries to the active commissioner's master tenantId.
 * 4. Strictly capped under 80 lines of code per function.
 */
export class FederationEngine {
	// Svelte 5 Rune States
	rosterPlayers = $state<RosterPlayer[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);
	tenantId = $state<string | null>(null);

	// Derived authorization status
	isAuthorized = $derived(authStore.isAuthenticated && authStore.role === 'commissioner');

	constructor() {
		// Defensive Hydration check
		if (!authStore.isAuthenticated || authStore.role !== 'commissioner') {
			this.tenantId = null;
			return;
		}
		this.tenantId = authStore.tenantId || authStore.userProfile?.tenantId || null;
	}

	/**
	 * Queries children rosters across multiple clubIds in the state federation.
	 * Constrained strictly by the commissioner's master tenantId.
	 */
	async queryFederationRosters(clubIds?: string[]): Promise<RosterPlayer[]> {
		if (!isFirestoreReady()) {
			this.isLoading = false;
			return [];
		}

		if (!this.isAuthorized || !this.tenantId) {
			this.error = 'Unauthorized access.';
			this.isLoading = false;
			return [];
		}

		this.isLoading = true;
		this.error = null;

		try {
			const db = getActiveDb();
			if (!db) throw new Error('Database not available');

			const usersRef = collection(db, 'users');
			const q = query(
				usersRef,
				where('tenantId', '==', this.tenantId),
				where('role', '==', 'player')
			);

			const snapshot = await getDocs(q);
			const players: RosterPlayer[] = [];

			snapshot.forEach((doc) => {
				const data = doc.data();
				// If clubIds are provided, restrict the results accordingly
				if (!clubIds || clubIds.length === 0 || clubIds.includes(data.clubId)) {
					players.push({
						id: doc.id,
						clubId: data.clubId || '',
						name: data.name || 'Unknown Player',
						role: data.role || 'player',
						tenantId: data.tenantId || ''
					});
				}
			});

			this.rosterPlayers = players;
			return players;
		} catch (err: unknown) {
			console.error('Failed to query federation rosters:', err);
			this.error = err instanceof Error ? err.message : 'Unknown error';
			return [];
		} finally {
			this.isLoading = false;
		}
	}
}
