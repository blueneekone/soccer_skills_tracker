import { getActiveDb } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';

export class FieldOpsEngine {
	status = $state<'CLEAR' | 'LOCKED_WEATHER_ALERT' | 'ADVISORY'>('CLEAR');
	latitude = $state<number | null>(null);
	longitude = $state<number | null>(null);
	lockReason = $state<string>('');
	lastAlertAt = $state<Date | null>(null);

	constructor() {}

	setupMapListeners(canvas: HTMLCanvasElement) {
		const db = getActiveDb();
		if (!db || !authStore.isAuthenticated) return;

		canvas.addEventListener('click', (e) => {
			this.handleCanvasClick(e);
		});
	}

	handleCanvasClick(event: MouseEvent) {
		const db = getActiveDb();
		if (!db || !authStore.isAuthenticated) return;

		// Mock canvas coordinate logic
		this.latitude = 40.0;
		this.longitude = -74.0;
	}

	updateAlertState(
		status: 'CLEAR' | 'LOCKED_WEATHER_ALERT' | 'ADVISORY',
		lat: number,
		lng: number,
		reason: string
	) {
		this.status = status;
		this.latitude = lat;
		this.longitude = lng;
		this.lockReason = reason;
		this.lastAlertAt = new Date();
	}
}
