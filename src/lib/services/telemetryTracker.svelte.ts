import { writeBatch, type DocumentReference } from 'firebase/firestore';
import { db } from '$lib/firebase/config.js';
import type { SSTUser } from '$lib/types/user.types.js';

export type TelemetryMutationType = 'set' | 'update';

export interface TelemetryMutation {
	uid: SSTUser['uid'];
	ref: DocumentReference;
	data: Record<string, unknown>;
	type: TelemetryMutationType;
}

class TelemetryTracker {
	buffer = $state<TelemetryMutation[]>([]);
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private isFlushing = false;

	/**
	 * Pushes a telemetry mutation into the local buffer.
	 * Flushes automatically if the buffer approaches the 400 operation limit
	 * or after a 10-second debounce.
	 */
	push(mutation: TelemetryMutation): void {
		this.buffer.push(mutation);

		if (this.buffer.length >= 400) {
			// Do not wait for the interval if we hit the limit
			void this.flushTelemetry();
		} else if (!this.flushTimer) {
			// Start the 10-second debounce timer
			this.flushTimer = setInterval(() => {
				void this.flushTelemetry();
			}, 10_000);
		}
	}

	/**
	 * Flushes up to 400 pending mutations to Firestore in a single atomic batch.
	 */
	async flushTelemetry(): Promise<void> {
		if (this.isFlushing || this.buffer.length === 0) return;
		this.isFlushing = true;

		try {
			// Firestore limits batches to 500 operations. We cap at 400 for safety padding.
			const batchSize = Math.min(this.buffer.length, 400);
			const chunk = this.buffer.splice(0, batchSize);

			if (this.buffer.length === 0 && this.flushTimer) {
				clearInterval(this.flushTimer);
				this.flushTimer = null;
			}

			const batch = writeBatch(db);
			for (const mutation of chunk) {
				if (mutation.type === 'set') {
					batch.set(mutation.ref, mutation.data, { merge: true });
				} else {
					batch.update(mutation.ref, mutation.data);
				}
			}

			await batch.commit();
		} catch (err) {
			console.error('[TelemetryTracker] Batch flush failed:', err);
			// In a robust implementation, we might requeue the chunk if it was a transient error,
			// but for telemetry, we typically accept data loss over infinite retry loops.
		} finally {
			this.isFlushing = false;
		}
	}
}

export const telemetryTracker = new TelemetryTracker();
