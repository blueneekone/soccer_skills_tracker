/**
 * tournamentEvent.ts
 * ───────────────────
 * Phase 2, Epic 2 — Embedded Finance Integration.
 * Canonical types for tournament events and ticket tiers.
 *
 * Data model
 * ─────────────────────────────────────────────────────
 * • `tournament_events/{eventId}` — created/updated by director via
 *   `upsertTournamentEvent` onCall; never written directly by clients.
 *
 * • Ticket tiers are embedded in the event doc as a map (`ticketTiers`)
 *   so a single snapshot gives buyer pages everything they need.
 *   The embedded `soldCount` is incremented atomically by
 *   `handleTicketingWebhook` (Phase 2 Session H) inside the same
 *   writeBatch that marks the ticket paid — no eventual consistency lag.
 *
 * • Gate-scan state (`checkedInAt`) lives on `tickets/{ticketId}`, not
 *   on the event doc, to keep the event doc append-friendly at scale.
 *
 * Lifecycle
 * ─────────────────────────────────────────────────────
 *   draft → published → concluded → archived
 *
 * Only `published` events are visible to buyers on the public route
 * (`/events/{eventId}`).  Directors can read all statuses for the event
 * builder.  `archived` events are retained for the fee ledger but
 * suppressed from buyer listings.
 */

// ── Ticket tier ───────────────────────────────────────────────────────────

/**
 * One ticket category within an event.  Keys in `TicketTierMap` are
 * short, URL-safe identifiers chosen by the director (e.g. `'general'`,
 * `'vip'`, `'staff'`).
 *
 * Invariants enforced by `upsertTournamentEvent`:
 *   - `unitPriceCents >= 0` (0 is a valid free tier)
 *   - `capacity >= 1`
 *   - `soldCount` is server-side only (initialised to 0, incremented by
 *     the webhook handler)
 */
export interface TicketTier {
	/** Cents — non-negative integer. 0 = free admission. */
	unitPriceCents: number;
	/** Hard cap on this tier.  Gate scanner uses this for capacity warnings. */
	capacity: number;
	/**
	 * Denormalized counter incremented by the webhook handler.
	 * Directors cannot set this via the event builder.
	 */
	soldCount: number;
	/** Human-readable label shown on buyer page and boarding pass. */
	label: string;
	/** Optional one-liner shown below the label on the buyer page. */
	description?: string;
	/**
	 * UTC ISO-8601 timestamp.  Scanner warns if entry attempt is more than
	 * 30 minutes before this value.  Optional — open entry if absent.
	 */
	gateOpensAt?: string;
}

/** Map of tier ID → tier config embedded in the event doc. */
export type TicketTierMap = Record<string, TicketTier>;

// ── Event lifecycle ───────────────────────────────────────────────────────

export type TournamentEventStatus = 'draft' | 'published' | 'concluded' | 'archived';

// ── Event document ────────────────────────────────────────────────────────

/**
 * Shape of `tournament_events/{eventId}`.
 *
 * Rule for consumers:
 *   - Server writes: `upsertTournamentEvent`, `publishTournamentEvent`, and
 *     `handleTicketingWebhook` (which increments `ticketTiers.*.soldCount`
 *     and writes `lastTicketSaleAt`).
 *   - Client reads: buyer page, Director event-builder, gate scanner.
 */
export interface TournamentEventDoc {
	/** Document ID — same as the Firestore path segment. */
	id: string;
	/** Display name shown on buyer pages and tickets. */
	name: string;
	/** Short description / tagline, rendered in the event hero section. */
	description?: string;
	/** Club / NGB that owns and profits from this event. */
	hostClubId: string;
	/** Physical or virtual venue name. */
	venue?: string;
	/**
	 * UTC ISO-8601 datetime — used for sorting buyer listings and for
	 * the "Gate opens" counter on the buyer page.
	 */
	eventStartAt: string;
	eventEndAt?: string;
	status: TournamentEventStatus;
	/** Embedded tier map — the single source of truth for prices and capacity. */
	ticketTiers: TicketTierMap;
	/**
	 * Denormalized total of all tier sold counts.
	 * Updated atomically alongside `ticketTiers.*.soldCount` by the webhook.
	 * Used by Director reconciliation panel without summing tiers client-side.
	 */
	totalSold: number;
	/** Server timestamp of the most recent ticket sale.  Used by reconciliation sort. */
	lastTicketSaleAt?: unknown;
	/**
	 * Hotel rebate linkage (Session B6).  Each element is a summary of one
	 * `hotel_rebates` doc that was filed against this event.  Written by
	 * `submitHotelRebateRecord` when `linkedEventId` is supplied.
	 * Capped at 50 elements via `arrayUnion` to prevent unbounded growth.
	 */
	hotelRebates?: HotelRebateSummary[];
	createdAt?: unknown;
	updatedAt?: unknown;
	/** UID of the director who last published the event. */
	publishedByUid?: string;
}

/**
 * Compact summary embedded in `tournament_events/{eventId}.hotelRebates[]`.
 * Full doc lives in `hotel_rebates/{rebateId}`.
 */
export interface HotelRebateSummary {
	rebateId: string;
	partnerId: string;
	ngbCreditCents: number;
	roomNights?: number;
	recordedAt: unknown;
}

// ── Form payloads (used by the Director event builder) ────────────────────

/**
 * Subset of `TournamentEventDoc` the director supplies when creating or
 * updating an event.  Server fills `soldCount`, `totalSold`,
 * `lastTicketSaleAt`, `createdAt`, `updatedAt`.
 */
export interface UpsertTournamentEventPayload {
	eventId?: string; // absent = create new
	name: string;
	description?: string;
	venue?: string;
	eventStartAt: string;
	eventEndAt?: string;
	/** Director sets each tier's label, price, capacity.  soldCount is ignored. */
	ticketTiers: Record<string, Omit<TicketTier, 'soldCount'>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Compute total remaining seats across ALL tiers.
 */
export function totalRemainingCapacity(event: TournamentEventDoc): number {
	return Object.values(event.ticketTiers).reduce(
		(acc, tier) => acc + Math.max(0, tier.capacity - tier.soldCount),
		0,
	);
}

/**
 * True when any tier still has seats available AND the event is published.
 */
export function isEventOpen(event: TournamentEventDoc): boolean {
	return event.status === 'published' && totalRemainingCapacity(event) > 0;
}

/**
 * Derive a URL-safe tier ID from a human label.
 * Used by the event builder to auto-populate the tier map key.
 */
export function labelToTierId(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 32);
}
