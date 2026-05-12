/**
 * RlPolicyEngine.svelte.ts
 * ─────────────────────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S10)
 *
 * Svelte 5 class-based brain for the /admin/rl-policy Vanguard Trinity.
 * Manages state for:
 *   • rl_policy_state/current    — live deployment switch
 *   • rl_training_runs/{date}    — paginated nightly run history (latest 30)
 *   • rl_safety_overrides         — count last 7 days
 *   • Super-admin callables: setPolicyAbPercent, freezeRlPolicy, rollbackRlPolicy
 */

import {
	collection,
	doc,
	onSnapshot,
	query,
	orderBy,
	limit,
	where,
	Timestamp,
	type Unsubscribe
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '$lib/firebase.js';
import type {
	RlPolicyStateDoc,
	RlTrainingRunDoc,
	SetPolicyAbPercentInput,
	SetPolicyAbPercentResult,
	FreezeRlPolicyInput,
	FreezeRlPolicyResult,
	RollbackRlPolicyInput,
	RollbackRlPolicyResult
} from '$lib/types/rlPolicy.js';

export type SaveState = 'idle' | 'saving' | 'success' | 'error';

export class RlPolicyEngine {
	// ── Reactive state ─────────────────────────────────────────────────────────
	policyState = $state<RlPolicyStateDoc | null>(null);
	trainingRuns = $state<RlTrainingRunDoc[]>([]);
	safetyOverrideCount7d = $state(0);
	isLoading = $state(false);
	saveState = $state<SaveState>('idle');
	saveError = $state('');

	// Editable fields bound to the UI controls
	draftAbPercent = $state(0);
	draftRollbackVersion = $state(1);

	// ── Firestore subscriptions ────────────────────────────────────────────────
	private _unsubPolicy: Unsubscribe | null = null;
	private _unsubRuns: Unsubscribe | null = null;
	private _unsubOverrides: Unsubscribe | null = null;

	// ── Derived ────────────────────────────────────────────────────────────────
	frozen = $derived(this.policyState?.frozen ?? false);
	abPercent = $derived(this.policyState?.abPercent ?? 0);
	policyVersion = $derived(this.policyState?.policyVersion ?? 0);

	// ── Subscriptions setup ────────────────────────────────────────────────────

	subscribe() {
		this.isLoading = true;

		// rl_policy_state/current — live
		this._unsubPolicy = onSnapshot(
			doc(db, 'rl_policy_state', 'current'),
			(snap) => {
				this.policyState = snap.exists() ? (snap.data() as RlPolicyStateDoc) : null;
				this.draftAbPercent = this.policyState?.abPercent ?? 0;
				this.isLoading = false;
			},
			(err) => {
				console.error('[RlPolicyEngine] policy state snapshot error:', err);
				this.isLoading = false;
			}
		);

		// rl_training_runs — latest 30, ordered by runDate desc
		this._unsubRuns = onSnapshot(
			query(
				collection(db, 'rl_training_runs'),
				orderBy('runDate', 'desc'),
				limit(30)
			),
			(snap) => {
				this.trainingRuns = snap.docs.map((d) => d.data() as RlTrainingRunDoc);
			},
			(err) => console.error('[RlPolicyEngine] training runs snapshot error:', err)
		);

		// rl_safety_overrides — count last 7 days
		const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 86_400_000);
		this._unsubOverrides = onSnapshot(
			query(
				collection(db, 'rl_safety_overrides'),
				where('createdAt', '>=', sevenDaysAgo)
			),
			(snap) => {
				this.safetyOverrideCount7d = snap.size;
			},
			(err) => console.error('[RlPolicyEngine] safety overrides snapshot error:', err)
		);
	}

	unsubscribe() {
		this._unsubPolicy?.();
		this._unsubRuns?.();
		this._unsubOverrides?.();
	}

	// ── Callables ──────────────────────────────────────────────────────────────

	async setAbPercent(abPercent: number) {
		this.saveState = 'saving';
		this.saveError = '';
		try {
			const fn = httpsCallable<SetPolicyAbPercentInput, SetPolicyAbPercentResult>(
				getFunctions(),
				'setPolicyAbPercent'
			);
			await fn({ abPercent });
			this.saveState = 'success';
			setTimeout(() => { this.saveState = 'idle'; }, 2000);
		} catch (err) {
			this.saveState = 'error';
			this.saveError = (err as Error).message ?? 'Failed to update A/B percent.';
		}
	}

	async toggleFreeze() {
		this.saveState = 'saving';
		this.saveError = '';
		try {
			const fn = httpsCallable<FreezeRlPolicyInput, FreezeRlPolicyResult>(
				getFunctions(),
				'freezeRlPolicy'
			);
			await fn({ frozen: !this.frozen });
			this.saveState = 'success';
			setTimeout(() => { this.saveState = 'idle'; }, 2000);
		} catch (err) {
			this.saveState = 'error';
			this.saveError = (err as Error).message ?? 'Failed to toggle freeze.';
		}
	}

	async rollback(targetVersion: number) {
		this.saveState = 'saving';
		this.saveError = '';
		try {
			const fn = httpsCallable<RollbackRlPolicyInput, RollbackRlPolicyResult>(
				getFunctions(),
				'rollbackRlPolicy'
			);
			await fn({ targetVersion });
			this.saveState = 'success';
			setTimeout(() => { this.saveState = 'idle'; }, 2000);
		} catch (err) {
			this.saveState = 'error';
			this.saveError = (err as Error).message ?? 'Rollback failed.';
		}
	}
}
