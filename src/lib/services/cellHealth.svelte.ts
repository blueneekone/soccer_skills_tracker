/**
 * cellHealth.svelte.ts
 * ─────────────────────
 * Reactive cell health + promotion-queue state for the Director OS
 * migration dashboard.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session I.
 *
 * Subscriptions
 * ─────────────
 *   • `cells/*`                  — every registered cell, with its
 *                                  current tenantCount, status, and
 *                                  quotaProfile.
 *
 *   • `cells/_policy`            — the promotion thresholds (read-only
 *                                  here; mutated only by an admin via
 *                                  the policy-editor UI).
 *
 *   • `cell_promotion_queue/*`   — tenants currently flagged for
 *                                  migration.  Dashboard renders this
 *                                  as a sortable table.
 *
 * Listener policy
 * ───────────────
 * Subscriptions are admin-only (the security rules deny non-admin
 * reads).  `cellHealth.init()` short-circuits when the caller is not
 * a platform admin so non-admin pages never hit a permission-denied
 * snapshot error.
 *
 * Always reads from the (default) cell — the registry is centralised
 * regardless of which cell the calling admin's tenant lives on.
 */

import { browser } from '$app/environment';
import { getDb } from '$lib/firebase.js';
import { DEFAULT_CELL_ID, type CellDoc, type CellPolicyDoc, type CellPromotionQueueDoc } from '$lib/types/cells';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

class CellHealth {
	/** Map of cellId → cell doc; reactive. */
	cells = $state<Map<string, CellDoc>>(new Map());

	/** Current policy thresholds; null until first snapshot. */
	policy = $state<CellPolicyDoc | null>(null);

	/** Promotion queue, ordered by flaggedAt desc. */
	promotionQueue = $state<CellPromotionQueueDoc[]>([]);

	/** True while listeners are mounted. */
	isLive = $state(false);

	private _unsubs: Array<() => void> = [];

	/**
	 * Attach the three listeners.  Safe to call multiple times — the
	 * cleanup callbacks are cleared on `destroy()` to keep at most one
	 * live subscription per source.
	 *
	 * Caller is responsible for invoking `destroy()` on page unmount.
	 */
	init(): void {
		if (!browser || this.isLive) return;
		this.isLive = true;

		// The cell registry always lives on the (default) cell, regardless
		// of which cell the admin's own tenant is on.
		const db = getDb(DEFAULT_CELL_ID);

		this._unsubs.push(
			onSnapshot(
				collection(db, 'cells'),
				(snap) => {
					const next = new Map<string, CellDoc>();
					snap.forEach((d) => {
						const id = d.id;
						if (id === '_policy' || id === '_migrations') return;
						next.set(id, { id, ...(d.data() as Omit<CellDoc, 'id'>) });
					});
					this.cells = next;
				},
				(err) => {
					console.warn('[cellHealth] cells/* snapshot error:', err);
				},
			),
		);

		this._unsubs.push(
			onSnapshot(
				doc(db, 'cells', '_policy'),
				(d) => {
					this.policy = d.exists() ? (d.data() as CellPolicyDoc) : null;
				},
				(err) => {
					console.warn('[cellHealth] _policy snapshot error:', err);
				},
			),
		);

		this._unsubs.push(
			onSnapshot(
				query(
					collection(db, 'cell_promotion_queue'),
					orderBy('flaggedAt', 'desc'),
				),
				(snap) => {
					const list: CellPromotionQueueDoc[] = [];
					snap.forEach((d) => {
						list.push(d.data() as CellPromotionQueueDoc);
					});
					this.promotionQueue = list;
				},
				(err) => {
					console.warn('[cellHealth] promotion queue snapshot error:', err);
				},
			),
		);
	}

	destroy(): void {
		this._unsubs.forEach((fn) => fn());
		this._unsubs = [];
		this.isLive = false;
		this.cells = new Map();
		this.promotionQueue = [];
		this.policy = null;
	}
}

/**
 * Module-level singleton.  Director OS health-dashboard component
 * imports this directly:
 *
 *   import { cellHealth } from '$lib/services/cellHealth.svelte';
 *   onMount(() => cellHealth.init());
 *   onDestroy(() => cellHealth.destroy());
 */
export const cellHealth = new CellHealth();
