import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { untrack } from 'svelte';
import { calculateHaversineDistance } from '$lib/utils/geoMath.js';

export class LightningRadarEngine {
	// Threat levels: Green (safe), Amber (warning, 10-15 miles), Red (critical, < 10 miles)
	strikes = $state<{ lat: number; lng: number; current_ka: number; polarity: number; dist_miles: number; timestamp: number }[]>([]);
	clubLat = $state(0);
	clubLng = $state(0);

	constructor(initialLat: number, initialLng: number) {
		this.clubLat = initialLat;
		this.clubLng = initialLng;

		$effect(() => {
			if (!isFirestoreReady()) return;
			// Gated DB init logic could go here if loading historical strikes
		});
	}

	threatLevel = $derived.by(() => {
		let level = 'Green';
		for (const strike of this.strikes) {
			if (strike.dist_miles < 10) return 'Red';
			if (strike.dist_miles <= 15) level = 'Amber';
		}
		return level;
	});

	// Mock webhook ingestion for Tomorrow.io
	ingestWebhookPayload(payload: { data: { timelines: any[] } }) {
		if (!payload?.data?.timelines) return;
		const timelines = payload.data.timelines;
		for (const tl of timelines) {
			if (!tl.intervals) continue;
			for (const interval of tl.intervals) {
				const vals = interval.values;
				if (vals && vals.lightningStrike) {
					// Tomorrow.io typical strike format approximation (assuming coords are attached or queried per region)
					// In a real scenario, coordinates come from the event payload.
					const strikeLat = vals.lat ?? (this.clubLat + (Math.random() - 0.5) * 0.3); // mock coords if missing
					const strikeLng = vals.lng ?? (this.clubLng + (Math.random() - 0.5) * 0.3);

					const dist_miles = calculateHaversineDistance(this.clubLat, this.clubLng, strikeLat, strikeLng);

					this.strikes.push({
						lat: strikeLat,
						lng: strikeLng,
						current_ka: vals.peakCurrent ?? 0,
						polarity: vals.polarity ?? 1,
						dist_miles,
						timestamp: new Date(interval.startTime).getTime()
					});
				}
			}
		}
	}

	simulateStrike(miles: number, kA: number = 25) {
		// Mock utility for testing - places a strike exactly N miles away North
		const distDegrees = miles / 69.0;
		this.strikes.push({
			lat: this.clubLat + distDegrees,
			lng: this.clubLng,
			current_ka: kA,
			polarity: -1,
			dist_miles: miles,
			timestamp: Date.now()
		});
	}
}
