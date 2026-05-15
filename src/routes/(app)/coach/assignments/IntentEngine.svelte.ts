/**
 * IntentEngine.svelte.ts
 * ──────────────────────
 * Phase 3, Epic 8 — Intent-Based Homework Triggers
 *
 * Vanguard Trinity: The Brain.
 * Pure TypeScript Svelte 5 state machine for the /coach/assignments route.
 *
 * Manages:
 *   • Live onSnapshot of team_assignments (active intents for the coach's team)
 *   • Roster load (players on the team with their xpByAttribute)
 *   • Draft intent form state
 *   • Fulfilment metrics derived from live intent + roster data
 *   • Callable wrappers: deployIntent / cancelIntent / extendIntent
 */

import {
	collection,
	query,
	where,
	orderBy,
	onSnapshot,
	getDocs,
	type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '$lib/firebase.js';
import { getRpgSportConfig } from '$lib/config/sports.js';
import type {
	IntentDoc,
	EnrichedIntent,
	IntentRosterRow,
	IntentScope,
	DeployIntentInput,
	DeployIntentResult,
	CancelIntentInput,
	CancelIntentResult,
	ExtendIntentInput,
	ExtendIntentResult,
} from '$lib/types/intent.js';
import { INTENT_MIGRATION_DEFAULTS } from '$lib/types/intent.js';

export type DeployPhase = 'idle' | 'saving' | 'success' | 'error';

/** A lightweight player row loaded from the users collection. */
export interface RosterEntry {
	uid: string;
	email: string;
	playerName: string;
	xpByAttribute: Record<string, number>;
}

export class IntentEngine {
	// ── Connection context ──────────────────────────────────────────────────────
	private _teamId = $state('');
	private _tenantId = $state('');
	private _clubId = $state('');
	private _sportId = $state('soccer');

	// ── Live data ────────────────────────────────────────────────────────────────
	intents = $state<IntentDoc[]>([]);
	roster = $state<RosterEntry[]>([]);
	isLoadingIntents = $state(false);
	isLoadingRoster = $state(false);
	error = $state('');

	// ── Draft form state ────────────────────────────────────────────────────────
	draftAttributeId = $state('');
	draftRequiredXp = $state(150);
	draftDurationDays = $state(7);
	draftScope = $state<IntentScope>('team');
	draftTargetUids = $state<string[]>([]);
	draftPriority = $state(100);

	// ── Mutation state ──────────────────────────────────────────────────────────
	deployPhase = $state<DeployPhase>('idle');
	deployError = $state('');
	mutationError = $state('');

	// ── Subscriptions ────────────────────────────────────────────────────────────
	private _unsubIntents: Unsubscribe | null = null;

	// ── Derived: enriched intents with per-player progress ────────────────────
	enrichedIntents = $derived.by((): EnrichedIntent[] => {
		const sportConfig = getRpgSportConfig(this._sportId);
		return this.intents.map((raw): EnrichedIntent => {
			const intent: IntentDoc = { ...INTENT_MIGRATION_DEFAULTS, ...raw } as IntentDoc;
			const attr = sportConfig.attributes.find((a: { id: string }) => a.id === intent.targetAttributeId);
			const attributeName = attr?.name ?? intent.targetAttributeId;
			const attributeHexColor = attr?.hexColor ?? '#14b8a6';

			const scopedRoster: RosterEntry[] =
				intent.scope === 'team'
					? this.roster
					: this.roster.filter((r) => (intent.targetUids ?? []).includes(r.uid));

			const rosterRows: IntentRosterRow[] = scopedRoster.map((r) => {
				const currentXp = Number(r.xpByAttribute?.[intent.targetAttributeId] ?? 0);
				const progressPct = intent.requiredXp > 0
					? Math.min(100, Math.round((currentXp / intent.requiredXp) * 100))
					: 0;
				return {
					uid: r.uid,
					playerName: r.playerName,
					email: r.email,
					currentXp,
					progressPct,
					fulfilled: (intent.fulfilledByUids ?? []).includes(r.uid),
				};
			});

			const fulfilledCount = rosterRows.filter((r) => r.fulfilled).length;
			const targetCount = rosterRows.length;
			const overallProgressPct = targetCount > 0
				? Math.round(rosterRows.reduce((s, r) => s + r.progressPct, 0) / targetCount)
				: 0;

			const expiresMs = intent.expiresAt
				? (typeof (intent.expiresAt as { toMillis?: () => number }).toMillis === 'function'
					? (intent.expiresAt as { toMillis: () => number }).toMillis()
					: new Date(intent.expiresAt as string).getTime())
				: 0;
			const daysRemaining = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86_400_000));
			const isExpired = expiresMs > 0 && expiresMs < Date.now();

			return {
				...intent,
				intentId: (intent as IntentDoc & { intentId?: string }).intentId ?? '',
				attributeName,
				attributeHexColor,
				rosterRows,
				fulfilledCount,
				targetCount,
				overallProgressPct,
				daysRemaining,
				isExpired,
			};
		});
	});

	/** True if draft is ready to deploy. */
	canDeploy = $derived(
		!!this.draftAttributeId &&
		this.draftRequiredXp >= 1 &&
		this.draftDurationDays >= 1 &&
		(this.draftScope === 'team' || this.draftTargetUids.length > 0) &&
		this.deployPhase === 'idle',
	);

	/** Attributes from the sport config for the attribute picker. */
	attributes = $derived(getRpgSportConfig(this._sportId).attributes as Array<{ id: string; name: string; hexColor: string }>);

	// ── Public interface ──────────────────────────────────────────────────────

	connect(teamId: string, tenantId: string, clubId: string, sportId: string) {
		this._teamId = teamId;
		this._tenantId = tenantId;
		this._clubId = clubId;
		this._sportId = sportId || 'soccer';

		this._subscribeIntents();
		void this._loadRoster();

		// Seed draft attribute if not yet set.
		if (!this.draftAttributeId && this.attributes.length > 0) {
			this.draftAttributeId = this.attributes[0].id;
		}
	}

	destroy() {
		this._unsubIntents?.();
		this._unsubIntents = null;
	}

	toggleDraftUid(uid: string) {
		const idx = this.draftTargetUids.indexOf(uid);
		if (idx === -1) {
			this.draftTargetUids = [...this.draftTargetUids, uid];
		} else {
			this.draftTargetUids = this.draftTargetUids.filter((u) => u !== uid);
		}
	}

	selectAllRosterUids() {
		this.draftTargetUids = this.roster.map((r) => r.uid);
	}

	clearRosterSelection() {
		this.draftTargetUids = [];
	}

	resetDraft() {
		this.draftAttributeId = this.attributes[0]?.id ?? '';
		this.draftRequiredXp = 150;
		this.draftDurationDays = 7;
		this.draftScope = 'team';
		this.draftTargetUids = [];
		this.draftPriority = 100;
		this.deployPhase = 'idle';
		this.deployError = '';
	}

	async deployIntent() {
		if (!this.canDeploy) return;
		this.deployPhase = 'saving';
		this.deployError = '';
		try {
			const fn = httpsCallable<DeployIntentInput, DeployIntentResult>(
				getFunctions(),
				'secureDeployIntent',
			);
			await fn({
				teamId: this._teamId,
				tenantId: this._tenantId,
				clubId: this._clubId,
				targetAttributeId: this.draftAttributeId,
				requiredXp: this.draftRequiredXp,
				durationDays: this.draftDurationDays,
				scope: this.draftScope,
				targetUids: this.draftScope === 'players' ? [...this.draftTargetUids] : [],
				priority: this.draftPriority,
			});
			this.deployPhase = 'success';
			setTimeout(() => this.resetDraft(), 2500);
		} catch (e) {
			this.deployPhase = 'error';
			this.deployError = (e as Error).message ?? 'Deploy failed.';
		}
	}

	async cancelIntent(intentId: string) {
		this.mutationError = '';
		try {
			const fn = httpsCallable<CancelIntentInput, CancelIntentResult>(
				getFunctions(),
				'secureCancelIntent',
			);
			await fn({ intentId, teamId: this._teamId, tenantId: this._tenantId });
		} catch (e) {
			this.mutationError = (e as Error).message ?? 'Cancel failed.';
		}
	}

	async extendIntent(intentId: string, additionalDays: number) {
		this.mutationError = '';
		try {
			const fn = httpsCallable<ExtendIntentInput, ExtendIntentResult>(
				getFunctions(),
				'secureExtendIntent',
			);
			await fn({ intentId, teamId: this._teamId, tenantId: this._tenantId, additionalDays });
		} catch (e) {
			this.mutationError = (e as Error).message ?? 'Extend failed.';
		}
	}

	// ── Private ───────────────────────────────────────────────────────────────

	private _subscribeIntents() {
		this._unsubIntents?.();
		if (!this._teamId) return;

		this.isLoadingIntents = true;
		const q = query(
			collection(db, 'team_assignments'),
			where('teamId', '==', this._teamId),
			where('status', '==', 'active'),
			orderBy('priority', 'asc'),
		);

		this._unsubIntents = onSnapshot(
			q,
			(snap) => {
				this.intents = snap.docs.map((d) => ({ intentId: d.id, ...d.data() }) as IntentDoc);
				this.isLoadingIntents = false;
			},
			(err) => {
				console.error('[IntentEngine] intents snapshot error:', err);
				this.error = err.message;
				this.isLoadingIntents = false;
			},
		);
	}

	private async _loadRoster() {
		if (!this._teamId) return;
		this.isLoadingRoster = true;
		try {
			const snap = await getDocs(
				query(
					collection(db, 'users'),
					where('teamId', '==', this._teamId),
					where('role', '==', 'player'),
				),
			);
			const rows: RosterEntry[] = snap.docs
				.map((d) => {
					const x = d.data();
					return {
						uid: (x.uid as string) || d.id,
						email: d.id,
						playerName: typeof x.playerName === 'string' && x.playerName.trim()
							? x.playerName.trim()
							: d.id,
						xpByAttribute: (x.xpByAttribute as Record<string, number>) || {},
					};
				})
				.sort((a, b) => a.playerName.localeCompare(b.playerName));
			this.roster = rows;
		} catch (e) {
			console.error('[IntentEngine] roster load error:', e);
			this.roster = [];
		} finally {
			this.isLoadingRoster = false;
		}
	}
}
