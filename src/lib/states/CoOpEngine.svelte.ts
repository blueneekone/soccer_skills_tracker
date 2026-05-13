/**
 * CoOpEngine.svelte.ts
 * ─────────────────────
 * Phase 3, Epic 5.4 — Parent Co-Op Brain.
 *
 * Vanguard Trinity pattern:
 *   Shell  → src/routes/(app)/parent/dashboard/+page.svelte
 *   Brain  → THIS FILE
 *   Glass  → src/lib/components/parent/co-op/CoOpArena.svelte
 *   HUD    → src/lib/components/parent/co-op/CoOpHUD.svelte
 *
 * Architecture:
 *   - All mutations (create bounty, void bounty, activate boost, link
 *     funding source) are routed through Firebase Cloud Function callables.
 *     NO direct `addDoc` / `setDoc` writes from the client.
 *   - Reads subscribe to `bounties` filtered by `householdId` for real-time
 *     progress updates.
 *   - Child armory data is read from `users/{childEmail}` using the same
 *     email-key convention as `ArmoryEngine`.
 *   - Tenant isolation is enforced by the Cloud Functions; the client only
 *     reads docs where `householdId == token.householdId` (Firestore rules).
 */

import { browser } from '$app/environment';
import { db, functions } from '$lib/firebase.js';
import {
	collection,
	doc,
	getDoc,
	onSnapshot,
	query,
	where,
	type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type {
	BountyDoc,
	BountyStatus,
	BountyCriterion,
	TelemetryBoostDoc,
	TremendousFundingSourceDoc,
	BoostPreset,
	BOOST_PRESETS,
} from '$lib/types/bounty.js';

// ── Child armory snapshot (read-only) ────────────────────────────────────────

export interface ChildArmorySnapshot {
	email: string;
	displayName: string;
	totalXP: number;
	currentStreak: number;
	lastActiveUtc: string;
	/** True when a parent-boosted XP event happened today. */
	boostAppliedToday: boolean;
}

// ── Callable input types ─────────────────────────────────────────────────────

export interface CreateBountyInput {
	playerEmail: string;
	title: string;
	description?: string;
	criterion: BountyCriterion;
	rewardCents: number;
	currency?: string;
	expiresAt: string;
}

export interface ActivateBoostInput {
	playerEmail: string;
	presetId: string;
}

// ── CoOpEngine ───────────────────────────────────────────────────────────────

export class CoOpEngine {
	// ── State ─────────────────────────────────────────────────────────────

	/** All bounties visible to this parent (real-time subscription). */
	bounties = $state<BountyDoc[]>([]);

	/** Tremendous funding source linked to this household (if any). */
	fundingSource = $state<TremendousFundingSourceDoc | null>(null);

	/** Armory snapshots for each linked child player. */
	householdChildren = $state<ChildArmorySnapshot[]>([]);

	/** True while initial data is loading. */
	loading = $state(true);

	/** Error message for UI display (null = no error). */
	error = $state<string | null>(null);

	/** True while a mutation (create/void/boost/link) is in flight. */
	mutating = $state(false);

	/** The parent's household document ID (from JWT claims). */
	householdId = $state<string>('');

	/** The parent's email key. */
	parentEmail = $state<string>('');

	// ── Private ───────────────────────────────────────────────────────────

	#bountyUnsub: Unsubscribe | null = null;

	// ── Derived ───────────────────────────────────────────────────────────

	get activeBounties(): BountyDoc[] {
		return this.bounties.filter((b) => b.status === 'active');
	}

	get verifiedBounties(): BountyDoc[] {
		return this.bounties.filter((b) => b.status === 'verified');
	}

	get paidBounties(): BountyDoc[] {
		return this.bounties.filter((b) => b.status === 'paid');
	}

	get hasFundingSource(): boolean {
		return !!this.fundingSource?.fundingSourceId;
	}

	/** Total value of all active bounties in cents. */
	get totalActiveCents(): number {
		return this.activeBounties.reduce((acc, b) => acc + (b.rewardCents ?? 0), 0);
	}

	/** Progress percentage (0-100) for a given bounty. */
	bountyProgress(b: BountyDoc): number {
		if (!b.progressTarget || b.progressTarget <= 0) return 0;
		return Math.min(100, Math.round(((b.progressCurrent ?? 0) / b.progressTarget) * 100));
	}

	// ── Initialisation ────────────────────────────────────────────────────

	/**
	 * Initialise the engine for a logged-in parent.
	 *
	 * @param parentEmail  Lowercase email key.
	 * @param householdId  From JWT custom claims (`token.householdId`).
	 * @param childEmails  Array of child player emails in this household.
	 */
	async init(parentEmail: string, householdId: string, childEmails: string[]): Promise<void> {
		if (!browser) return;

		this.parentEmail = parentEmail;
		this.householdId = householdId;
		this.loading = true;
		this.error = null;

		try {
			// Subscribe to bounties for this household.
			this.#subscribeToBounties();

			// Load household funding source config.
			await this.#loadHousehold(householdId);

			// Load child armory snapshots.
			await this.#loadChildArmory(childEmails);
		} catch (err) {
			this.error = 'Failed to load Co-Op data.';
			console.error('[CoOpEngine] init error:', err);
		} finally {
			this.loading = false;
		}
	}

	/** Tear down Firestore listeners. Call in onDestroy. */
	destroy(): void {
		this.#bountyUnsub?.();
		this.#bountyUnsub = null;
	}

	// ── Private: subscriptions & loads ────────────────────────────────────

	#subscribeToBounties(): void {
		if (!browser || !this.householdId) return;

		const q = query(
			collection(db, 'bounties'),
			where('householdId', '==', this.householdId),
		);

		this.#bountyUnsub = onSnapshot(
			q,
			(snap) => {
				this.bounties = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BountyDoc);
			},
			(err) => {
				console.error('[CoOpEngine] bounties subscription error:', err);
				this.error = 'Real-time bounty sync failed.';
			},
		);
	}

	async #loadHousehold(householdId: string): Promise<void> {
		try {
			const snap = await getDoc(doc(db, 'households', householdId));
			if (!snap.exists()) return;
			const data = snap.data();
			const coOp = data?.coOp || {};
			this.fundingSource = coOp.tremendous ?? null;
		} catch (err) {
			console.warn('[CoOpEngine] loadHousehold failed:', err);
		}
	}

	async #loadChildArmory(childEmails: string[]): Promise<void> {
		const snapshots: ChildArmorySnapshot[] = [];

		await Promise.all(
			childEmails.map(async (email) => {
				try {
					const snap = await getDoc(doc(db, 'users', email));
					if (!snap.exists()) {
						snapshots.push({
							email,
							displayName: email,
							totalXP: 0,
							currentStreak: 0,
							lastActiveUtc: '',
							boostAppliedToday: false,
						});
						return;
					}
					const d = snap.data();
					const armory = d?.armory ?? {};
					const today = new Date().toISOString().slice(0, 10);
					snapshots.push({
						email,
						displayName: d?.playerName || email,
						totalXP: armory.totalXP ?? 0,
						currentStreak: d?.currentStreak ?? 0,
						lastActiveUtc: armory.lastActiveUtc ?? '',
						boostAppliedToday:
							typeof armory.lastBoostAt === 'string' && armory.lastBoostAt >= today,
					});
				} catch (_) {
					snapshots.push({
						email,
						displayName: email,
						totalXP: 0,
						currentStreak: 0,
						lastActiveUtc: '',
						boostAppliedToday: false,
					});
				}
			}),
		);

		this.householdChildren = snapshots;
	}

	// ── Mutations (callable-only) ─────────────────────────────────────────

	/**
	 * Link a Tremendous funding source to this household.
	 * Returns the linked source details.
	 */
	async linkFundingSource(fundingSourceId: string): Promise<TremendousFundingSourceDoc> {
		this.mutating = true;
		this.error = null;
		try {
			const fn = httpsCallable<{ fundingSourceId: string }, TremendousFundingSourceDoc>(
				functions,
				'linkTremendousFundingSource',
			);
			const result = await fn({ fundingSourceId });
			// Re-load household to get the updated funding source.
			await this.#loadHousehold(this.householdId);
			return result.data;
		} catch (err) {
			this.error = 'Failed to link funding source.';
			throw err;
		} finally {
			this.mutating = false;
		}
	}

	/**
	 * Create an escrow bounty for a child player.
	 * Returns the new bounty document ID.
	 */
	async createBounty(input: CreateBountyInput): Promise<string> {
		this.mutating = true;
		this.error = null;
		try {
			const fn = httpsCallable<CreateBountyInput, { bountyId: string }>(
				functions,
				'createBountyEscrow',
			);
			const result = await fn(input);
			return result.data.bountyId;
		} catch (err) {
			this.error = 'Failed to create bounty.';
			throw err;
		} finally {
			this.mutating = false;
		}
	}

	/**
	 * Void an active or verified bounty.
	 */
	async voidBounty(bountyId: string): Promise<void> {
		this.mutating = true;
		this.error = null;
		try {
			const fn = httpsCallable<{ bountyId: string }, { success: boolean }>(
				functions,
				'voidBounty',
			);
			await fn({ bountyId });
		} catch (err) {
			this.error = 'Failed to void bounty.';
			throw err;
		} finally {
			this.mutating = false;
		}
	}

	/**
	 * Activate a time-bounded XP multiplier boost for a child player.
	 * Returns the boost expiry and multiplier.
	 */
	async activateBoost(
		playerEmail: string,
		presetId: string,
	): Promise<{ boostId: string; expiresAt: string; multiplier: number; label: string }> {
		this.mutating = true;
		this.error = null;
		try {
			const fn = httpsCallable<
				{ playerEmail: string; presetId: string },
				{ boostId: string; expiresAt: string; multiplier: number; label: string }
			>(functions, 'activateTelemetryBoost');
			const result = await fn({ playerEmail, presetId });
			// Refresh child armory to reflect boost indicator.
			await this.#loadChildArmory(this.householdChildren.map((c) => c.email));
			return result.data;
		} catch (err) {
			this.error = 'Failed to activate boost.';
			throw err;
		} finally {
			this.mutating = false;
		}
	}

	/**
	 * Fetch available Tremendous funding sources (for the selection UI).
	 */
	async listFundingSources(): Promise<Array<{ id: string; label: string; method: string }>> {
		try {
			const fn = httpsCallable<
				Record<string, never>,
				{ fundingSources: Array<{ id: string; label: string; method: string }> }
			>(functions, 'listTremendousFundingSources');
			const result = await fn({});
			return result.data.fundingSources;
		} catch (err) {
			console.error('[CoOpEngine] listFundingSources failed:', err);
			return [];
		}
	}
}
