/**
 * cells.ts
 * ─────────
 * Cell-Based Routing — canonical types and constants.
 *
 * Phase 1, Epic 1 — "Architect the backend API gateways to support
 * routing ultra-large state governing bodies to isolated, dedicated
 * database cells to prevent noisy neighbor throttling."
 *
 * Concepts
 * ─────────
 * • A "cell" is one Firebase Multi-Database Firestore instance.  Today
 *   every tenant lives on the (default) cell.  An ultra-large NGB (state
 *   association, etc.) gets promoted to a dedicated cell so its bulk
 *   writes can never throttle another tenant.
 *
 * • Routing decision is driven by `organizations/{tenantId}.cellId`,
 *   mirrored into the JWT custom claim `cellId` by syncUserClaims.
 *
 * • The (default) cell is Firebase's reserved name for the original
 *   database — the literal string '(default)' MUST be used as the cell
 *   identifier when no dedicated cell is assigned.  Never substitute
 *   null / undefined / empty string for it.
 *
 * Naming convention
 * ─────────────────
 *   '(default)'          — the shared cell every tenant starts on
 *   'cell-{region}-{nn}' — a dedicated cell, e.g. 'cell-use1-001'
 *
 * Region codes mirror gcloud short forms (`use1` = us-east1, `usc1` =
 * us-central1) — kept short so cell IDs stay legible in dashboards.
 */

// ── Reserved identifiers ─────────────────────────────────────────────────────

/**
 * The canonical default cell ID.  ALL absent / null / empty cell
 * references in code MUST normalize to this value before any routing
 * decision is made.  Firebase Admin and Web SDKs both accept the literal
 * string '(default)' as the third positional arg to getFirestore().
 */
export const DEFAULT_CELL_ID = '(default)' as const;

/**
 * Firebase region every cell currently lives in.  Future cells in other
 * regions (e.g. 'usc1') will use distinct cellId prefixes — the routing
 * table is the source of truth, but this constant documents today's reality.
 */
export const PRIMARY_REGION = 'us-east1' as const;

// ── Cell lifecycle ───────────────────────────────────────────────────────────

/**
 * Lifecycle states a cell document moves through.
 *
 *   • provisioning — Cell is being created or its first migration is in flight.
 *                    Reject any new tenant assignments until 'active'.
 *   • active       — Cell is healthy and accepting new tenant assignments
 *                    (subject to capacity policy).
 *   • draining     — No NEW tenant assignments allowed; existing tenants are
 *                    being migrated out.  Cell will retire when tenantCount = 0.
 *   • retired      — Cell is empty and queued for deletion.  Routing layer must
 *                    treat this as "do not route here".
 */
export type CellStatus = 'provisioning' | 'active' | 'draining' | 'retired';

/**
 * Quota tiers determine the kind of Firestore database (single-region,
 * multi-region, dedicated reserved capacity) the cell is provisioned as.
 *
 *   • shared              — The (default) cell only.  Long tail of small
 *                           tenants.  No SLA above Firestore's standard.
 *   • dedicated-standard  — Per-NGB single-region database.  Default for any
 *                           promotion out of the shared cell.
 *   • dedicated-large     — Multi-region or reserved-capacity database for
 *                           top-five NGBs (state federations w/ > 50k roster).
 */
export type CellQuotaProfile = 'shared' | 'dedicated-standard' | 'dedicated-large';

// ── Document shapes ──────────────────────────────────────────────────────────

/**
 * Shape of a `cells/{cellId}` registry document.
 *
 * The registry lives ON the (default) cell — it is the control plane.
 * Never replicate it across cells; that would create split-brain routing.
 */
export interface CellDoc {
	/** Document ID — same as the Firestore databaseId. */
	id: string;
	/** Always the same as `id`; explicit for callers that want both. */
	databaseId: string;
	region: string;
	status: CellStatus;
	quotaProfile: CellQuotaProfile;
	/** Denormalized counter, updated via `increment()` on tenant assignment. */
	tenantCount: number;
	/** Created server-side at provisioning. */
	createdAt?: unknown;
	/** Updated by `provisionTenantCell` on every successful assignment. */
	lastTenantMigratedAt?: unknown;
}

/**
 * Shape of the `cells/_policy` document — the capacity & promotion rules
 * that drive Session I's automated noisy-neighbor detection.
 *
 * Stored as a single doc (not a collection) so the Director OS dashboard
 * can render it as a form with one snapshot listener.
 */
export interface CellPolicyDoc {
	/**
	 * A tenant is eligible for promotion off the shared cell when its
	 * roster (count of users with role='player' in its tenantId) exceeds
	 * this number.
	 */
	rosterPromoteThreshold: number;
	/**
	 * A tenant is eligible for promotion when its sustained Firestore
	 * doc reads/day exceeds this for `readSustainedDays` consecutive days.
	 */
	readsPerDayPromoteThreshold: number;
	readSustainedDays: number;
	/**
	 * Maximum number of tenants allowed on the shared (default) cell
	 * before the auto-promotion queue becomes urgent.  Cosmetic — used to
	 * color-code the ops dashboard, not enforced as a hard cap.
	 */
	sharedCellSoftCap: number;
	/** Default quota profile assigned to a freshly-provisioned dedicated cell. */
	defaultPromotionProfile: CellQuotaProfile;
}

/**
 * Shape of an entry in the `cell_promotion_queue/{tenantId}` collection.
 * One doc per tenant flagged for promotion; deleted after migration.
 */
export interface CellPromotionQueueDoc {
	tenantId: string;
	/** What signal triggered the queue entry. */
	trigger: 'roster_size' | 'sustained_reads' | 'manual';
	rosterSize?: number;
	rollingDailyReads?: number;
	flaggedAt: unknown;
	/** Set by an admin acknowledging the queue entry to suppress dashboard noise. */
	acknowledgedAt?: unknown;
	acknowledgedBy?: string;
	/** Filled in after a successful migration; the queue entry is then archived. */
	migratedAt?: unknown;
	targetCellId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Coerce any cell-id-like value (claim string, organization doc field,
 * URL param) to a non-empty cell ID, falling back to (default).
 *
 * Centralised here so no caller ever has to remember the `|| DEFAULT_CELL_ID`
 * pattern individually.  Whitespace-only inputs are treated as empty.
 */
export function resolveCellId(raw: unknown): string {
	if (typeof raw !== 'string') return DEFAULT_CELL_ID;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : DEFAULT_CELL_ID;
}

/**
 * Is this the shared default cell?  Use everywhere the code branches on
 * "is this tenant on a dedicated cell" so the literal string '(default)'
 * never has to appear in product code.
 */
export function isDefaultCell(cellId: string): boolean {
	return resolveCellId(cellId) === DEFAULT_CELL_ID;
}
