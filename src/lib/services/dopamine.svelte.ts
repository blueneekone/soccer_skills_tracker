/**
 * dopamine.svelte.ts
 * ──────────────────
 * Vanguard Dopamine Engine — Phase 4, Epic 7.
 *
 * Roadmap mandate: "Hook the Dopamine Engine (visual particle explosions)
 * directly to verified database commits to permanently reinforce the habit
 * loop of logging difficult training sessions."
 *
 * Architecture
 * ────────────
 * `dopamineExplosion(kind, origin)`
 *   Fires a canvas-confetti burst immediately.  Called only after a
 *   Firestore BatchWriteResult confirms `committed === true`.
 *
 *   Three presets:
 *     'drill'   — cyan neon burst (matches tier accent).
 *     'grit'    — magenta / violet cascade (matches Grit XP purple).
 *     'levelUp' — gold supernova (tier-change celebration).
 *
 * `dopamineOnCommit(promise, opts)`
 *   Awaits a BatchWriteResult promise from the write facade, then:
 *     • If `committed === true` AND `offlineQueued === false` (online write):
 *       fires the explosion immediately.
 *     • If `offlineQueued === true` (write is enqueued locally):
 *       defers the explosion to the `vanguard:sync-complete` custom DOM
 *       event dispatched by offlineSync.svelte.ts when the write actually
 *       lands on the server.
 *
 * Kill switches
 * ─────────────
 *   1. `vanguardFlags.dopamineEnabled === false` → instant no-op.
 *   2. `prefers-reduced-motion: reduce` media query → instant no-op.
 *   Both checks run at call time (not at module load) so the flag and
 *   OS accessibility setting can change at runtime without a reload.
 *
 * SSR safety
 * ──────────
 * canvas-confetti accesses `window`; all execution paths inside this
 * module are guarded by `typeof window !== 'undefined'`.
 */

import type { BatchWriteResult } from '$lib/services/writes.types';
import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
import type confetti from 'canvas-confetti';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DopamineKind = 'drill' | 'grit' | 'levelUp' | 'matchWin';

export interface DopamineOpts {
	kind: DopamineKind;
	/** Optional pointer-relative origin (0–1 range, defaults to bottom-center). */
	origin?: { x: number; y: number };
}

type ConfettiOptions = Parameters<typeof confetti>[0];

// ── Accessibility + kill-switch guard ─────────────────────────────────────────

function isEnabled(): boolean {
	if (typeof window === 'undefined') return false;
	if (!vanguardFlags.dopamineEnabled) return false;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
	return true;
}

// ── Confetti presets ──────────────────────────────────────────────────────────

const PRESETS: Record<DopamineKind, ConfettiOptions> = {
	drill: {
		particleCount: 80,
		spread: 70,
		colors: ['#14b8a6', '#cffafe', '#ffffff', '#0ea5e9'],
		startVelocity: 30,
		gravity: 0.9,
		scalar: 0.9,
		ticks: 200,
	},
	grit: {
		particleCount: 100,
		spread: 90,
		colors: ['#9d00ff', '#c084fc', '#e879f9', '#ffffff'],
		startVelocity: 35,
		gravity: 0.85,
		scalar: 1.0,
		ticks: 250,
	},
	levelUp: {
		particleCount: 160,
		spread: 120,
		colors: ['#f0a500', '#fbbf24', '#fde68a', '#14b8a6', '#ffffff'],
		startVelocity: 45,
		gravity: 0.8,
		scalar: 1.1,
		ticks: 350,
	},
	matchWin: {
		particleCount: 140,
		spread: 110,
		colors: ['#10b981', '#34d399', '#a7f3d0', '#ffffff'],
		startVelocity: 40,
		gravity: 0.85,
		scalar: 1.0,
		ticks: 300,
	},
};

// ── Core explosion function ───────────────────────────────────────────────────

/**
 * Fire a particle explosion immediately.
 * No-op when the kill switch or prefers-reduced-motion is active.
 */
export async function dopamineExplosion(
	kind: DopamineKind,
	origin: { x: number; y: number } = { x: 0.5, y: 0.75 },
): Promise<void> {
	if (!isEnabled()) return;

	// Lazy-load canvas-confetti so it is never bundled in SSR paths.
	const { default: confetti } = await import('canvas-confetti');
	confetti({ ...PRESETS[kind], origin });
}

// ── Commit-verified helper ────────────────────────────────────────────────────

/**
 * Await a write facade promise; fire a dopamine explosion only after the
 * Firestore SDK confirms the write was accepted.
 *
 * Online path   → explosion fires immediately after `batch.commit()` resolves.
 * Offline path  → explosion deferred to `vanguard:sync-complete` DOM event,
 *                 which offlineSync.svelte.ts dispatches when all queued
 *                 batches are flushed to the server on reconnect.
 *
 * Returns the `BatchWriteResult` so callers can chain on it for UI updates.
 */
export async function dopamineOnCommit(
	writePromise: Promise<BatchWriteResult>,
	opts: DopamineOpts,
): Promise<BatchWriteResult> {
	const result = await writePromise;

	if (!result.committed) return result;

	if (!result.offlineQueued) {
		// Online: fire immediately.
		void dopamineExplosion(opts.kind, opts.origin);
	} else {
		// Offline: defer to server-confirmed sync event.
		if (typeof window !== 'undefined') {
			const handler = () => {
				void dopamineExplosion(opts.kind, opts.origin);
				window.removeEventListener('vanguard:sync-complete', handler);
			};
			window.addEventListener('vanguard:sync-complete', handler, { once: true });
		}
	}

	return result;
}

/**
 * Wrap a Cloud Function callable promise; fire a dopamine explosion only
 * after the server responds successfully.
 *
 * A resolved callable IS a server ack (unlike a local Firestore batch
 * commit which may be enqueued offline), so the explosion always fires
 * immediately on resolve — there is no offline-deferral path here.
 *
 * Reject path: no celebration, error re-thrown so the caller can handle it.
 *
 * Returns the callable result so callers can chain on it for UI updates.
 */
export async function dopamineOnCallable<T>(
	callablePromise: Promise<T>,
	opts: DopamineOpts,
): Promise<T> {
	const result = await callablePromise;
	void dopamineExplosion(opts.kind, opts.origin);
	return result;
}
