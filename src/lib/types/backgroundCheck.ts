/**
 * backgroundCheck.ts
 * ───────────────────
 * Phase 2, Epic 2, Session K — Vanguard Clearance Protocol type contract.
 *
 * The existing Checkr integration (Epic 14 / `functions/compliance.js`) stores
 * clearance state under `users/{email}.clearance`.  This module is the
 * canonical TypeScript shape so client code (`/clearance` route, Director OS
 * IntakePanopticon, recruiter onboarding) can read the field with strong types.
 *
 * Wire contract — NEVER change without updating `functions/compliance.js`:
 *
 *   users/{email}.clearance: {
 *     status: 'pending' | 'cleared' | 'flagged' | 'expired',
 *     checkrCandidateId?: string | null,
 *     ankoredId?: string | null,
 *     thirdPartyRef?: string | null,
 *     source?: 'checkr' | 'ankored' | 'manual_override' | 'org_vault_propagation',
 *     lastVerified?: Timestamp,
 *     clearedAt?: Timestamp,
 *     expiresAt?: Timestamp,
 *   }
 *
 * The JWT custom claim `isCleared` (boolean) is recomputed from `status` by
 * `stampClearanceClaim()` after every write.  Firestore rules consult
 * `isCleared()` (rules helper at line 94 of firestore.rules), not the doc
 * field, so claim sync is on the critical path.
 *
 * Adult roles in scope
 * ─────────────────────
 *   coach, recruiter, director, tutor
 * These are the roles that can touch minor PII.  Players + parents
 * self-manage and never sit behind this gate.
 */

/** Clearance providers we have plumbing for today. */
export type BackgroundCheckProvider =
	| 'checkr'
	| 'ankored'
	| 'qa_simulate'
	| 'manual_override'
	| 'org_vault_propagation';

/**
 * Vanguard-side clearance status.  Mapping from raw Checkr report status is
 * done by `functions/compliance.js#_checkrWebhookHandler`:
 *
 *   Checkr 'clear'      → 'cleared'
 *   Checkr 'consider'   → 'flagged'
 *   Checkr 'suspended'  → 'flagged'
 *   anything else       → 'pending'
 *   (daily sweep)       → 'expired'   (cleared past 365d validity)
 */
export type BackgroundCheckStatus = 'pending' | 'cleared' | 'flagged' | 'expired';

/** Clearance validity window.  Mirrored on the server in `clearanceExpiry.js`. */
export const CLEARANCE_VALIDITY_DAYS = 365 as const;

/** Adult roles that must hold a clearance before reading minor PII. */
export const CLEARANCE_REQUIRED_ROLES = Object.freeze<
	ReadonlyArray<'coach' | 'recruiter' | 'director' | 'tutor'>
>(['coach', 'recruiter', 'director', 'tutor']);

/**
 * Shape of the `clearance` field on `users/{email}`.  All fields except
 * `status` are optional — a freshly-invited coach has only `status: 'pending'`.
 */
export interface ClearanceDoc {
	status: BackgroundCheckStatus;
	checkrCandidateId?: string | null;
	invitationId?: string | null;
	invitationUrl?: string | null;
	ankoredId?: string | null;
	thirdPartyRef?: string | null;
	source?: BackgroundCheckProvider;
	lastVerified?: unknown;
	clearedAt?: unknown;
	expiresAt?: unknown;
}

/**
 * Type guard — does this role need to pass through the clearance gate?
 *
 * Use this everywhere a role string flows in (JWT claim, user doc field) to
 * avoid stringly-typed checks scattered across the codebase.
 */
export function requiresClearance(role: unknown): boolean {
	if (typeof role !== 'string') return false;
	return (CLEARANCE_REQUIRED_ROLES as readonly string[]).includes(role);
}

/**
 * Resolve a clearance doc to a UI-friendly state.  Used by the `/clearance`
 * onboarding page and the Director IntakePanopticon to render a consistent
 * label without each consumer reimplementing the status switch.
 */
export function clearanceLabel(c?: ClearanceDoc | null): {
	label: string;
	tone: 'pending' | 'cleared' | 'flagged' | 'expired' | 'none';
} {
	if (!c) return { label: 'Not started', tone: 'none' };
	switch (c.status) {
		case 'cleared':
			return { label: 'Cleared', tone: 'cleared' };
		case 'flagged':
			return { label: 'Flagged for review', tone: 'flagged' };
		case 'expired':
			return { label: 'Expired — re-verify', tone: 'expired' };
		case 'pending':
		default:
			return { label: 'Pending', tone: 'pending' };
	}
}
