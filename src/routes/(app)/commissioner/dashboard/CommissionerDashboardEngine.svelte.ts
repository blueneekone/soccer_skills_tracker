import { getActiveDb } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

export type ClubCompliance = {
	id: string;
	name: string;
	safesport: 'green' | 'amber' | 'red';
	background: 'green' | 'amber' | 'red';
	coppa: 'green' | 'amber' | 'red';
	lastUpdated: string;
};

export type OdpMetrics = {
	speed: number;
	agility: number;
	power: number;
	stamina: number;
	vision: number;
	technique: number;
};

export class CommissionerDashboardEngine {
	// Svelte 5 Rune State
	clubs = $state<ClubCompliance[]>([]);
	odpMetrics = $state<OdpMetrics>({
		speed: 50,
		agility: 50,
		power: 50,
		stamina: 50,
		vision: 50,
		technique: 50
	});
	isLoading = $state(true);
	error = $state<string | null>(null);

	// Derived state
	isAuthorized = $derived(authStore.role === 'commissioner');
	totalClubs = $derived(this.clubs.length);

	constructor() {
		// Initialization if necessary
	}

	async fetchFederationData() {
		// B815 Defensive Hydration Guard
		if (!isFirestoreReady()) {
			this.isLoading = false;
			return;
		}

		if (!this.isAuthorized) {
			this.error = 'Unauthorized access.';
			this.isLoading = false;
			return;
		}

		this.isLoading = true;
		this.error = null;

		try {
			const db = getActiveDb();
			if (!db) {
				throw new Error('Database not available');
			}

			// Master Tenant Architecture: Read-only aggregation
			// using active tenantId.
			const tenantId = authStore.userProfile?.tenantId;
			if (!tenantId) {
				this.clubs = [];
				this.isLoading = false;
				return;
			}

			const clubsRef = collection(db, 'clubs');
			const q = query(clubsRef, where('tenantId', '==', tenantId));
			const snapshot = await getDocs(q);

			const loadedClubs: ClubCompliance[] = [];
			snapshot.forEach(doc => {
				const data = doc.data();
				loadedClubs.push({
					id: doc.id,
					name: data.name || 'Unknown Club',
					safesport: data.compliance?.safesport || 'amber',
					background: data.compliance?.background || 'amber',
					coppa: data.compliance?.coppa || 'amber',
					lastUpdated: data.updatedAt ? new Date(data.updatedAt.toMillis()).toLocaleDateString() : 'N/A'
				});
			});

			this.clubs = loadedClubs;

			// Simulated aggregation of child club ODP metrics
			this.odpMetrics = {
				speed: 75,
				agility: 82,
				power: 65,
				stamina: 90,
				vision: 70,
				technique: 85
			};

		} catch (err: unknown) {
			console.error('Failed to fetch federation data:', err);
			this.error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			this.isLoading = false;
		}
	}
}
