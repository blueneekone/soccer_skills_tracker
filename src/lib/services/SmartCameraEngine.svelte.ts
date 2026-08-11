import { untrack } from 'svelte';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import type { SmartCameraNode } from '$lib/types/broadcast.js';

export class SmartCameraEngine {
	#cameras = $state<SmartCameraNode[]>([]);
	#unsubs: (() => void)[] = [];
	#connectedVenueId = $state<string | null>(null);

	get cameras(): SmartCameraNode[] {
		if (!isFirestoreReady()) {
			if (this.#unsubs.length > 0) {
				this.disconnect();
			}
			return [];
		}
		return this.#cameras;
	}

	get connectedVenueId(): string | null {
		return this.#connectedVenueId;
	}

	connect(venueId?: string) {
		this.disconnect(); // Clear existing listener and reset state first

		this.#connectedVenueId = venueId || null;
		if (!isFirestoreReady()) {
			return;
		}
		const db = getActiveDb();
		if (!db) return;

		const camerasCol = collection(db, 'smart_cameras');
		const q = venueId
			? query(camerasCol, where('venueId', '==', venueId))
			: query(camerasCol);

		const unsub = onSnapshot(q, (snap) => {
			if (!isFirestoreReady()) {
				this.disconnect();
				return;
			}
			const list: SmartCameraNode[] = [];
			snap.forEach((doc) => {
				list.push({ cameraId: doc.id, ...doc.data() } as SmartCameraNode);
			});
			untrack(() => {
				this.#cameras = list;
			});
		}, (err) => {
			console.error('[SmartCameraEngine] Firestore snapshot failed:', err);
			if (!isFirestoreReady()) {
				this.disconnect();
			}
		});

		this.#unsubs.push(unsub);
	}

	disconnect() {
		this.#unsubs.forEach(u => u());
		this.#unsubs = [];
		untrack(() => {
			this.#cameras = [];
			this.#connectedVenueId = null;
		});
	}
}
