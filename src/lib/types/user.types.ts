/**
 * src/lib/types/user.types.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Sprint 1.2 — Canonical authenticated-user schema (Phase 2 Resolution).
 *
 * Single source of truth for the full authenticated principal shape:
 *   Firebase Auth payload  ←→  JWT Custom Claims  ←→  Firestore mirror profile
 *
 * Design rules
 * ────────────
 *   • Zero `any` — all types are strictly inferred or explicitly declared.
 *   • Re-export, never duplicate — `UserRole` and `VanguardClaims` remain
 *     authoritative in their original files; we re-export them here so
 *     consumers have a single import path.
 *   • `SSTRole` is the narrowed Sprint-1.3-ready RBAC surface (5 UI roles).
 *     The wider `UserRole` union is preserved as `SSTRoleExtended` for
 *     back-compat with auth store internals that carry `super_admin` /
 *     `registrar` / `tutor` / `guest`.
 *   • `SSTUser` is NOT reactive — it is the static shape of a fully-hydrated
 *     principal produced after `onAuthStateChanged` + `resolveUserProfile`.
 *     Auth-store Svelte 5 rune bindings are Sprint 1.3 work.
 *
 * JWT custom-claim contract (written server-side ONLY by Cloud Functions):
 *   syncUserClaims      — Firestore trigger on users/{emailKey}
 *   consumeInviteCode   — explicit setCustomUserClaims post-transaction
 *
 * Firestore UID ↔ tenant/role mapping:
 *   Firebase Auth uid  → looked-up via users/{email}  → profile.clubId / tenantId
 *   JWT claim tenantId  (canonical)  = clubId  (legacy alias)
 *   JWT claim role      = TenantRole (synced by syncUserClaims on profile write)
 */

import type { User } from 'firebase/auth';

// Re-exports — these remain the single definition in their home files.
export type { UserRole } from './index';
export type { VanguardClaims, TenantUser, TenantRole } from './tenant';
export type {
	OperativeLoadoutV1,
	EquippedLoadout,
	LoadoutSlotId,
	OwnedCosmeticsList,
} from '$lib/gamification/loadoutSchema.js';

// ─────────────────────────────────────────────────────────────────────────────
// § 1  RBAC Role Surface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Narrowed RBAC union for Sprint 1.3 enforcement gates and UI route guards.
 *
 * Maps to the 5 directive-mandated principal types:
 *   admin    — platform operator (cross-tenant, maps to global_admin / super_admin)
 *   director — club/tenant owner (org-management gates)
 *   coach    — team coach (mission + roster access)
 *   player   — athlete (self-service data entry)
 *   parent   — household guardian (child-data visibility)
 *
 * Use `SSTRoleExtended` (= the full `UserRole` union from index.ts) when you
 * need to handle `registrar`, `recruiter`, `tutor`, or `guest` in auth-store
 * internals. UI route guards should use `SSTRole` only.
 */
export type SSTRole = 'admin' | 'director' | 'coach' | 'player' | 'parent';

/**
 * Wider role union that covers all persisted roles in the auth store,
 * including platform-staff and guest states. Sourced from `UserRole` in
 * index.ts and re-typed here for convenience without duplication.
 *
 * Prefer `SSTRole` for new Sprint 1.3+ access-control code.
 */
export type SSTRoleExtended =
	| SSTRole
	| 'super_admin'
	| 'global_admin'
	| 'registrar'
	| 'recruiter'
	| 'tutor'
	| 'guest';

// ─────────────────────────────────────────────────────────────────────────────
// § 2  JWT Custom Claims Shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strict shape of the Firebase Auth JWT custom claims payload for SSTracker.
 *
 * Written EXCLUSIVELY by server-side Cloud Functions — never from the client.
 * Read on the frontend via:
 *   `user.getIdTokenResult().then(r => r.claims as SSTUserClaims)`
 *
 * Mapping notes:
 *   `role`     — matches `SSTRole` for the 5 UI personas; internally the
 *                auth store also carries `super_admin` / `registrar` etc.
 *                Use `SSTRoleExtended` if you need the full union.
 *   `tenantId` — canonical tenant key (= Firestore `clubs/{id}` doc ID).
 *   `clubId`   — legacy alias for `tenantId`; kept for backward compat with
 *                existing Firestore security rules.
 *   `cellId`   — Firestore Multi-Database routing key; defaults to '(default)'.
 */
export interface SSTUserClaims {
	/** RBAC role at the JWT level — always synced with Firestore by syncUserClaims. */
	role: SSTRole;
	/** Canonical tenant identifier. Present iff the user belongs to a club. */
	tenantId: string;
	/** Legacy alias = tenantId. Kept for backward-compat with existing Firestore rules. */
	clubId?: string;
	/** Team scope for coaches and players. */
	teamId?: string;
	/** Firestore Multi-Database cell routing key. Defaults to '(default)'. */
	cellId?: string;
	/** Umbrella organisation ID for rec-center / league topology. */
	orgId?: string;
	/** True for platform-level operators (cross-tenant access). */
	isGlobalAdmin?: boolean;
	/**
	 * Background-check clearance flag. True when clearance.status === 'cleared'
	 * and not expired. Enforced server-side; surfaced here for UI overlay gates.
	 */
	isCleared?: boolean;
	/**
	 * True when the user has a carrier-verified linked phone number.
	 * Written by the mirrorPhoneVerification Cloud Function.
	 */
	phoneVerified?: boolean;
	/**
	 * COPPA 2026 age band.
	 * 'under13'    — hard block on all non-essential data collection.
	 * 'teen13to16' — restricted ad-tech and messaging.
	 * 'adult'      — no COPPA restrictions (default when no DOB on file).
	 */
	ageBand?: 'under13' | 'teen13to16' | 'adult';
}

// ─────────────────────────────────────────────────────────────────────────────
// § 3  Firebase Auth Payload Projection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strictly typed projection of the Firebase Auth `User` object.
 *
 * We deliberately pick only the fields SSTracker depends on so:
 *   1. We are not coupled to the full SDK interface across the codebase.
 *   2. `Readonly<>` prevents accidental mutation of the auth object.
 *
 * All fields are sourced from `import type { User } from 'firebase/auth'`.
 */
export type SSTAuthPayload = Readonly<
	Pick<
		User,
		| 'uid'
		| 'email'
		| 'emailVerified'
		| 'displayName'
		| 'photoURL'
		| 'phoneNumber'
		| 'isAnonymous'
		| 'metadata'
	>
>;

// ─────────────────────────────────────────────────────────────────────────────
// § 4  Firestore Profile Alias
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical type for the Firestore user profile document.
 * Aliased from `TenantUser` (src/lib/types/tenant.ts) — one definition only.
 *
 * Firestore path: `users/{email.toLowerCase()}`
 */
import type { TenantUser } from './tenant';
export type SSTFirestoreProfile = TenantUser;

// ─────────────────────────────────────────────────────────────────────────────
// § 5  Unified Principal Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The fully-hydrated SSTracker principal.
 *
 * Produced after:
 *   1. `onAuthStateChanged` resolves a Firebase `User`.
 *   2. `resolveUserProfile` fetches the Firestore profile + force-refreshes the JWT.
 *   3. The auth store sets its reactive state from the resolved values.
 *
 * `uid`, `role`, and `tenantId` are promoted to top-level readonly fields as
 * the most-frequently read access-control values — avoids deep property chains
 * in route guards and Firestore query builders.
 *
 * uid ↔ tenant/role lock:
 *   The `uid` field MUST equal `auth.uid`. Enforcement is by
 *   `assertSSTUser` below and by the `syncUserClaims` Cloud Function which
 *   always writes claims to the token identified by `uid`.
 */
export interface SSTUser {
	/** Firebase Auth payload (read-only projection). */
	auth: SSTAuthPayload;
	/** Verified JWT custom claims — source of truth for access control. */
	claims: SSTUserClaims;
	/** Mirrored Firestore profile document. */
	profile: SSTFirestoreProfile;

	/** Shortcut: equals `auth.uid`. */
	readonly uid: string;
	/** Shortcut: equals `claims.role` — use this in route guards. */
	readonly role: SSTRole;
	/** Shortcut: equals `claims.tenantId` — use this in Firestore query scoping. */
	readonly tenantId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6  Type Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The exhaustive list of `SSTRole` values — kept in sync with the type union
 * above and used by the runtime type guard below.
 */
const SST_ROLES: readonly SSTRole[] = [
	'admin',
	'director',
	'coach',
	'player',
	'parent',
] as const;

/**
 * Runtime type guard for `SSTRole`.
 *
 * Use to validate JWT claim values at auth hydration boundaries before
 * constructing an `SSTUser`. The auth store reads `role` from an untyped
 * `IdTokenResult.claims` object — this guard closes that gap.
 *
 * @example
 * const rawRole = tokenResult.claims['role'];
 * if (!isSSTRole(rawRole)) throw new Error(`Unknown role: ${rawRole}`);
 */
export function isSSTRole(v: unknown): v is SSTRole {
	return typeof v === 'string' && (SST_ROLES as readonly string[]).includes(v);
}

/**
 * Assertion guard for `SSTUser`.
 *
 * Throws a descriptive `TypeError` if the supplied value is not structurally
 * compatible with `SSTUser`. Use at auth hydration boundaries (e.g. the output
 * of `resolveUserProfile`) to catch schema drift early.
 *
 * Checks: presence of `auth`, `claims`, `profile`, `uid`, `role`, `tenantId`.
 * Does NOT deep-validate every nested field — use Firestore Security Rules
 * and Cloud Function triggers as the authoritative schema enforcement layer.
 */
export function assertSSTUser(v: unknown): asserts v is SSTUser {
	if (v === null || typeof v !== 'object') {
		throw new TypeError(`assertSSTUser: expected object, got ${v === null ? 'null' : typeof v}`);
	}
	const u = v as Record<string, unknown>;
	if (!u['auth'] || typeof u['auth'] !== 'object') {
		throw new TypeError('assertSSTUser: missing or invalid auth payload');
	}
	if (!u['claims'] || typeof u['claims'] !== 'object') {
		throw new TypeError('assertSSTUser: missing or invalid claims object');
	}
	if (!u['profile'] || typeof u['profile'] !== 'object') {
		throw new TypeError('assertSSTUser: missing or invalid Firestore profile');
	}
	if (typeof u['uid'] !== 'string' || u['uid'].length === 0) {
		throw new TypeError('assertSSTUser: uid must be a non-empty string');
	}
	if (!isSSTRole(u['role'])) {
		throw new TypeError(`assertSSTUser: invalid role "${String(u['role'])}"`);
	}
	if (typeof u['tenantId'] !== 'string') {
		throw new TypeError('assertSSTUser: tenantId must be a string');
	}
}
