import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { browser } from '$app/environment';

export interface ProBenchmarks {
	PAC: number;
	ACC: number;
	POW: number;
	COMP: number;
	STM: number;
	AGI: number;
	updatedAt?: unknown;
	source?: string;
}

class ProBenchmarkService {
	benchmarks = $state<ProBenchmarks | null>(null);
	private unsub: (() => void) | null = null;

	constructor() {
		if (browser) {
			this.subscribe();
		}
	}

	subscribe() {
		if (this.unsub) return;
		
		const ref = doc(db, 'platform_config', 'pro_benchmarks');
		this.unsub = onSnapshot(ref, (snap) => {
			if (snap.exists()) {
				this.benchmarks = snap.data() as ProBenchmarks;
			}
		});
	}

	destroy() {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
	}
}

export const proBenchmarkService = new ProBenchmarkService();
