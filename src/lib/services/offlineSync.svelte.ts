/**
 * offlineSync.svelte.ts
 * ──────────────────────
 * Reactive offline / sync state for the Vanguard platform.
 *
 * RESPONSIBILITY
 * ──────────────────────────────────────────────────────────────────────
 * One rune-based singleton (`syncStatus`) that any component can read
 * to know:
 *
 *   • `isOnline`     — current navigator.onLine value
 *   • `isSyncing`    — true while a post-reconnect flush is pending
 *   • `lastSyncedAt` — Date of the most recent confirmed server flush
 *
 * Hook for the Dopamine Engine (Roadmap Epic 7)
 * ──────────────────────────────────────────────
 * The Roadmap requires: "Hook the Dopamine Engine (visual particle
 * explosions) directly to verified database commits to permanently
 * reinforce the habit loop of logging difficult training sessions."
 *
 * On every transition from offline → online, this module awaits
 * Firestore's `waitForPendingWrites()` — which resolves once the SDK
 * has successfully flushed ALL queued batches to the server.  At that
 * moment we dispatch a custom DOM event `vanguard:sync-complete` with
 * `{ flushedAt: Date }` in `detail`.  Components that own a particle
 * canvas (e.g. the VanguardCard) listen for this event and trigger
 * their celebration animation — tying the visual reward to a
 * verified server commit, not just an optimistic local write.
 *
 * Initialisation
 * ──────────────
 * `+layout.svelte` (or any root-mounted component) should call
 * `syncStatus.init()` exactly once after the SvelteKit app mounts.
 * Subsequent calls are no-ops; the singleton guard is internal.
 *
 * SSR-safe: every browser-only path is guarded by `browser`.
 */

import { browser } from '$app/environment';
import { getActiveDb } from '$lib/firebase.js';
import { waitForPendingWrites } from 'firebase/firestore';

/** Cap sync banner duration when waitForPendingWrites hangs (field polish). */
const SYNC_FLUSH_TIMEOUT_MS = 10_000;

class SyncStatus {
	/** Mirrors `navigator.onLine`; defaults true on SSR so flagged UI is hidden. */
	isOnline = $state(true);

	/** True while `waitForPendingWrites()` is in flight after a reconnect. */
	isSyncing = $state(false);

	/** Timestamp of the most recent confirmed flush, or `null` if none yet. */
	lastSyncedAt = $state<Date | null>(null);

	/** Internal guard so `init()` wires listeners only once. */
	private _initialised = false;

	/** Cleanup callbacks for the listeners installed by `init()`. */
	private _cleanup: Array<() => void> = [];

	init(): void {
		if (!browser || this._initialised) return;
		this._initialised = true;

		this.isOnline = navigator.onLine !== false;

		const onOnline = () => {
			this.isOnline = true;
			void this._flush();
		};
		const onOffline = () => {
			this.isOnline = false;
		};

		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);

		this._cleanup.push(() => window.removeEventListener('online', onOnline));
		this._cleanup.push(() => window.removeEventListener('offline', onOffline));

		// If we mount while online, opportunistically flush any writes
		// queued during a previous offline session before this page
		// loaded (e.g. PWA cold start after offline use).
		if (this.isOnline) {
			void this._flush();
		}
	}

	destroy(): void {
		this._cleanup.forEach((fn) => fn());
		this._cleanup = [];
		this._initialised = false;
	}

	/**
	 * Wait for the Firestore SDK to confirm every queued write has been
	 * acknowledged by the server, then dispatch `vanguard:sync-complete`
	 * so the Dopamine Engine can fire its particle explosion.
	 *
	 * Failures here are non-fatal — if the network drops again mid-flush
	 * the SDK will retry; we just leave `isSyncing` true so the UI banner
	 * keeps showing until the next successful flush.
	 */
	private async _flush(): Promise<void> {
		if (!browser) return;

		this.isSyncing = true;
		try {
			// Phase 1, Epic 1 — Cell-Based Routing, Session F.
			// Wait for the CURRENT cell's pending writes, not the
			// module-load default.  If the user was promoted to a
			// dedicated cell while writes were queued offline, both
			// cells may have buffered batches — but only one is active
			// at a time, so a single waitForPendingWrites against the
			// active cell is the correct contract.
			const db = getActiveDb();
			await Promise.race([
				waitForPendingWrites(db),
				new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error('sync flush timeout')), SYNC_FLUSH_TIMEOUT_MS);
				}),
			]);
			const flushedAt = new Date();
			this.lastSyncedAt = flushedAt;
			this.isSyncing = false;

			window.dispatchEvent(
				new CustomEvent('vanguard:sync-complete', {
					detail: { flushedAt },
				}),
			);
		} catch (err) {
			const timedOut = err instanceof Error && err.message === 'sync flush timeout';
			console.warn(
				timedOut
					? '[offlineSync] waitForPendingWrites timed out — clearing sync banner'
					: '[offlineSync] waitForPendingWrites failed — will retry on next reconnect:',
				err,
			);
			this.isSyncing = false;
		}
	}
}

/**
 * Module-level singleton.  Importers do NOT instantiate this class;
 * they read the reactive fields directly:
 *
 *   import { syncStatus } from '$lib/services/offlineSync.svelte';
 *   const banner = $derived(!syncStatus.isOnline ? 'OFFLINE' : null);
 */
export const syncStatus = new SyncStatus();
