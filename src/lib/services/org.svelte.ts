/**
 * org.svelte.ts
 * ─────────────
 * OrgManager — Svelte 5 reactive engine for the Director's Mission Control.
 *
 * Trinity role: ENGINE (logic only — no HTML)
 *
 * Data owned by this service
 * ──────────────────────────
 *   clubs/{tenantId}                    → OrganizationDoc  (org name, plan)
 *   teams where clubId == tenantId      → TenantTeam[]
 *   active_missions where tenantId == … → ActiveMissionDoc[]
 *   invites where tenantId == …         → InviteDoc[]
 *   users where tenantId == …           → player count (aggregation)
 *   player_stats where tenantId == …    → avg vanRating
 *
 * Zero-Trust enforcement
 * ──────────────────────
 *   tenantId is sourced exclusively from authStore (JWT claim).
 *   Every Firestore query includes .where('tenantId'/'clubId', '==', tenantId).
 *   The service refuses to connect without a verified tenantId.
 *
 * Usage
 * ─────
 *   const org = new OrgManager();
 *   // auto-connects when authStore.tenantId is available
 *   onDestroy(() => org.destroy());
 */

import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { generateInviteCode } from '$lib/services/inviteService.js';
import {
	addDoc,
	collection,
	doc,
	getCountFromServer,
	getDocs,
	onSnapshot,
	query,
	serverTimestamp,
	updateDoc,
	where,
	type QuerySnapshot,
} from 'firebase/firestore';
import type {
	OrganizationDoc,
	TenantTeam,
	ActiveMissionDoc,
	InviteDoc,
	TenantRole,
} from '$lib/types/tenant';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreateTeamInput {
	name: string;
	ageGroup?: string;
	season?: string;
}

export interface AssignCoachInput {
	teamId: string;
	coachEmail: string;
}

export interface OrgMetrics {
	totalAthletes: number;
	totalSquads: number;
	activeMissions: number;
	avgVanRating: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// OrgManager
// ═══════════════════════════════════════════════════════════════════════════

export class OrgManager {
	// ── Reactive state ────────────────────────────────────────────────────────

	/** Top-level organization document from clubs/{tenantId}. */
	org = $state<OrganizationDoc | null>(null);

	/** All teams under this club, sorted by name. */
	teams = $state<TenantTeam[]>([]);

	/** All currently active/pending missions across all teams. */
	activeMissions = $state<ActiveMissionDoc[]>([]);

	/**
	 * All non-expired invite codes for this tenant.
	 * Includes both pending (usageCount < usageLimit) and consumed codes.
	 */
	invites = $state<InviteDoc[]>([]);

	/** Total number of users with role 'player' in this org. */
	playerCount = $state(0);

	/** Average vanRating across all players in this org (0 if no data). */
	avgVanRating = $state(0);

	loading = $state(true);
	error = $state('');

	/** Last mutation error (shown in modals without replacing the global error). */
	mutationError = $state('');

	// ── Derived metrics ───────────────────────────────────────────────────────

	/** Primary dashboard metric tiles — fully reactive. */
	readonly metrics = $derived<OrgMetrics>({
		totalAthletes: this.playerCount,
		totalSquads: this.teams.length,
		activeMissions: this.activeMissions.length,
		avgVanRating: this.avgVanRating,
	});

	/** Active invite codes only (usageCount < usageLimit, not expired). */
	readonly activeInvites = $derived(
		this.invites.filter((inv) => inv.status === 'pending'),
	);

	/** Coach-role invites. */
	readonly coachInvites = $derived(
		this.activeInvites.filter((inv) => inv.targetRole === 'coach'),
	);

	/** Player-role invites. */
	readonly playerInvites = $derived(
		this.activeInvites.filter((inv) => inv.targetRole === 'player'),
	);

	/** True while loading org + teams (the two that block the UI skeleton). */
	readonly initializing = $derived(this.loading && !this.org && this.teams.length === 0);

	// ── Private ───────────────────────────────────────────────────────────────

	private _tenantId = '';
	private _unsubs: (() => void)[] = [];
	private _effectCleanup: (() => void) | null = null;

	// ── Constructor ───────────────────────────────────────────────────────────

	constructor() {
		if (!browser) return;

		// Auto-connect when the JWT claim is available or changes.
		this._effectCleanup = $effect.root(() => {
			$effect(() => {
				const tid = authStore.tenantId || authStore.currentTenantId;
				if (tid) {
					this.connect(tid);
				} else {
					this._detach();
					this.loading = false;
				}
				return () => this._detach();
			});
		});
	}

	// ── connect ───────────────────────────────────────────────────────────────

	/**
	 * Start real-time Firestore subscriptions for the given tenant.
	 * Idempotent — calling again with the same tenantId is a no-op.
	 * MUST be sourced from authStore — never from user input.
	 */
	connect(tenantId: string) {
		if (!browser || !tenantId || tenantId === this._tenantId) return;

		this._tenantId = tenantId;
		this._detach();

		this.loading = true;
		this.error = '';

		// ── 1. clubs/{tenantId} ───────────────────────────────────────────────
		this._unsubs.push(
			onSnapshot(
				doc(db, 'clubs', tenantId),
				(snap) => {
					this.org = snap.exists()
						? ({ id: snap.id, ...snap.data() } as OrganizationDoc)
						: null;
					this.loading = false;
				},
				(err) => {
					console.warn('[OrgManager] org snapshot error:', err);
					this.error = 'Failed to load organization data.';
					this.loading = false;
				},
			),
		);

		// ── 2. teams where clubId == tenantId (legacy alias) ──────────────────
		this._unsubs.push(
			onSnapshot(
				query(collection(db, 'teams'), where('clubId', '==', tenantId)),
				(snap: QuerySnapshot) => {
					this.teams = snap.docs
						.map((d) => ({ id: d.id, ...d.data() }) as TenantTeam)
						.sort((a, b) => a.name.localeCompare(b.name));
				},
				(err) => {
					console.warn('[OrgManager] teams snapshot error:', err);
					this.error = 'Failed to load teams.';
				},
			),
		);

		// ── 3. active_missions where tenantId == tenantId ─────────────────────
		this._unsubs.push(
			onSnapshot(
				query(
					collection(db, 'active_missions'),
					where('tenantId', '==', tenantId),
					where('status', '==', 'pending'),
				),
				(snap: QuerySnapshot) => {
					this.activeMissions = snap.docs.map(
						(d) => ({ id: d.id, ...d.data() }) as ActiveMissionDoc,
					);
				},
				(err) => console.warn('[OrgManager] missions snapshot error:', err),
			),
		);

		// ── 4. invites where tenantId == tenantId ─────────────────────────────
		this._unsubs.push(
			onSnapshot(
				query(collection(db, 'invites'), where('tenantId', '==', tenantId)),
				(snap: QuerySnapshot) => {
					this.invites = snap.docs.map(
						(d) => ({ id: d.id, code: d.id, ...d.data() }) as InviteDoc,
					);
				},
				(err) => console.warn('[OrgManager] invites snapshot error:', err),
			),
		);

		// ── 5. Aggregate: player count + avg vanRating ────────────────────────
		this._refreshAggregates(tenantId);
	}

	// ── Aggregates (non-reactive; called once per connect + after mutations) ──

	private async _refreshAggregates(tenantId: string) {
		try {
			// Player count — uses getCountFromServer for efficiency (no doc reads).
			const countSnap = await getCountFromServer(
				query(
					collection(db, 'users'),
					where('tenantId', '==', tenantId),
					where('role', '==', 'player'),
				),
			);
			this.playerCount = countSnap.data().count;

			// Avg vanRating — reads player_stats documents for this tenant.
			// Falls back gracefully if the collection doesn't exist or has no ratings.
			const statsSnap = await getDocs(
				query(
					collection(db, 'player_stats'),
					where('tenantId', '==', tenantId),
				),
			);

			if (!statsSnap.empty) {
				const ratings = statsSnap.docs
					.map((d) => {
						const data = d.data() as Record<string, unknown>;
						return typeof data.vanRating === 'number' ? data.vanRating : null;
					})
					.filter((r): r is number => r !== null);

				this.avgVanRating =
					ratings.length > 0
						? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
						: 0;
			}
		} catch (err) {
			console.warn('[OrgManager] aggregate refresh error:', err);
		}
	}

	// ── createTeam ────────────────────────────────────────────────────────────

	/**
	 * Create a new team document under this organization.
	 * Returns the new Firestore document ID.
	 *
	 * @throws if no tenantId is set (not connected).
	 */
	async createTeam(input: CreateTeamInput): Promise<string> {
		if (!this._tenantId) throw new Error('[OrgManager] Not connected — no tenantId.');
		if (!input.name?.trim()) throw new Error('Team name is required.');

		const ref = await addDoc(collection(db, 'teams'), {
			name: input.name.trim(),
			ageGroup: input.ageGroup?.trim() ?? '',
			season: input.season?.trim() ?? '',
			clubId: this._tenantId,   // legacy alias used by existing queries
			tenantId: this._tenantId, // canonical field
			playerCount: 0,
			coachEmail: null,
			createdAt: serverTimestamp(),
		});

		return ref.id;
	}

	// ── assignCoach ───────────────────────────────────────────────────────────

	/**
	 * Link a user (by email) to a team as head coach.
	 * Updates teams/{teamId}.coachEmail.
	 *
	 * Note: The actual JWT role assignment for the coach is handled by
	 * the consumeInviteCode Cloud Function — this is just a display link.
	 */
	async assignCoach({ teamId, coachEmail }: AssignCoachInput): Promise<void> {
		if (!this._tenantId) throw new Error('[OrgManager] Not connected — no tenantId.');
		if (!coachEmail?.trim()) throw new Error('Coach email is required.');

		await updateDoc(doc(db, 'teams', teamId), {
			coachEmail: coachEmail.trim().toLowerCase(),
			updatedAt: serverTimestamp(),
		});
	}

	// ── generateInvite ────────────────────────────────────────────────────────

	/**
	 * Generate an invite code for a given role.
	 * Delegates to `generateInviteCode` from inviteService.ts.
	 *
	 * @param targetRole  'coach' | 'player'
	 * @param teamId      Optional team scope for the invite.
	 * @param usageLimit  How many times the code can be used (default: 1).
	 */
	async generateInvite(
		targetRole: TenantRole,
		teamId?: string,
		usageLimit = 1,
	): Promise<{ code: string; expiresAt: Date }> {
		if (!this._tenantId) throw new Error('[OrgManager] Not connected — no tenantId.');

		return generateInviteCode(targetRole, this._tenantId, teamId, usageLimit);
	}

	// ── destroy ───────────────────────────────────────────────────────────────

	/** Tear down all subscriptions and the auto-connect effect. */
	destroy() {
		this._effectCleanup?.();
		this._effectCleanup = null;
		this._detach();
	}

	private _detach() {
		this._unsubs.forEach((fn) => fn());
		this._unsubs = [];
	}
}
