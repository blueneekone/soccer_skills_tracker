/**
 * IntentEngine.svelte.ts
 * ──────────────────────
 * Phase 3, Epic 8 — Intent-Based Homework Triggers
 *
 * Vanguard Trinity: The Brain.
 * Pure TypeScript Svelte 5 state machine — `$lib/coach/intent` (The Forge).
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
	doc,
	query,
	where,
	orderBy,
	onSnapshot,
	getDoc,
	getDocs,
	type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '$lib/firebase.js';
import { getRpgSportConfig } from '$lib/config/sports.js';
import type {
	IntentDoc,
	EnrichedIntent,
	IntentRosterRow,
	IntentScope,
	DeployIntentInput,
	DeployIntentResult,
	IntentPrescription,
	PrescriptionDrillEntry,
	CancelIntentInput,
	CancelIntentResult,
	ExtendIntentInput,
	ExtendIntentResult,
} from '$lib/types/intent.js';
import { INTENT_MIGRATION_DEFAULTS } from '$lib/types/intent.js';
import {
	loadTeamDrillsForIntent,
	type TeamDrillPickerRow,
} from '$lib/coach/teamDrillLibrary.js';
import { mergeAdminRoster } from '$lib/admin/rosterMerge.js';
import { dedupeRosterEntries } from '$lib/coach/rosterDisplayDedupe.js';
import {
	computeIntentEarnedXp,
	computeIntentProgressPct,
	resolveIntentBaselineXp,
	buildXpBaselineSnapshot,
	mergeIntentBaselines,
} from '$lib/coach/intent/intentProgress.js';

export type DeployPhase = 'idle' | 'saving' | 'success' | 'error';

/** A lightweight player row loaded from the users collection. */
export interface RosterEntry {
	/** Firebase Auth uid when known (may be empty on legacy parent-provisioned operatives). */
	uid: string;
	/** Selection key sent to secureDeployIntent — uid when known, else users/{email} doc id. */
	rosterKey: string;
	email: string;
	playerName: string;
	xpByAttribute: Record<string, number>;
	/** False for name-only roster strings without a linked account — not intent-targetable. */
	assignable: boolean;
	/** Roster row from `rosters/{teamId}.players[]` without email/account. */
	nameOnly?: boolean;
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
	rosterError = $state('');

	// ── Draft form state ────────────────────────────────────────────────────────
	draftAttributeId = $state('');
	draftRequiredXp = $state(150);
	draftDurationDays = $state(7);
	draftScope = $state<IntentScope>('team');
	draftTargetUids = $state<string[]>([]);
	/** Boolean priority toggle — high (10) vs normal (100) for orderBy priority asc. */
	draftPriorityMission = $state(false);
	draftPrescriptionSets = $state(3);
	draftPrescriptionRepsPerSet = $state(10);
	draftPrescriptionBilateral = $state(false);
	draftPrescriptionDurationMin = $state(0);
	draftPrescriptionTargetRpe = $state(0);
	/** 0 = absent (no cadence). 1–21 = sessions per 7-day window. */
	draftCadenceSessionsPerWindow = $state(0);
	draftDrillId = $state('');
	draftDrillTitle = $state('');
	availableDrills = $state<TeamDrillPickerRow[]>([]);
	isLoadingDrills = $state(false);
	/** B4a — coach opt-in: emit requiresParentVerification on prescription when true. Default off. */
	draftRequiresParentVerification = $state(false);
	/**
	 * B3 bundle drills: ordered array of draft entries. Empty = single-drill mode (unchanged).
	 * Each entry mirrors PrescriptionDrillEntry minus teamDrillId/clubDrillId (set at build time).
	 */
	draftBundleDrills = $state<Array<{
		drillId: string;
		drillTitle: string;
		sets: number;
		repsPerSet: number;
	}>>([]);

	// ── Mutation state ──────────────────────────────────────────────────────────
	deployPhase = $state<DeployPhase>('idle');
	deployError = $state('');
	mutationError = $state('');
	mutationSuccess = $state('');
	isRefreshing = $state(false);
	cancellingIntentIds = $state<string[]>([]);

	// ── Subscriptions ────────────────────────────────────────────────────────────
	private _unsubIntents: Unsubscribe | null = null;
	/** Synchronous guard — blocks double-invoke before deployPhase reactivity flushes. */
	private _deployInFlight = false;
	/** Client deploy cache until Firestore snapshot includes xpBaselineByUid. */
	private _deployBaselineByIntentId = new Map<string, Record<string, number>>();

	// ── Derived: enriched intents with per-player progress ────────────────────
	enrichedIntents = $derived.by((): EnrichedIntent[] => {
		const sportConfig = getRpgSportConfig(this._sportId);
		return this.intents.map((raw): EnrichedIntent => {
			const intent: IntentDoc = { ...INTENT_MIGRATION_DEFAULTS, ...raw } as IntentDoc;
			const intentKey = typeof intent.intentId === 'string' ? intent.intentId : '';
			const effectiveBaseline = mergeIntentBaselines(
				this._deployBaselineByIntentId.get(intentKey),
				intent.xpBaselineByUid,
			);
			const attr = sportConfig.attributes.find((a: { id: string }) => a.id === intent.targetAttributeId);
			const attributeName = attr?.name ?? intent.targetAttributeId;
			const attributeHexColor = attr?.hexColor ?? '#14b8a6';

			const scopedRoster: RosterEntry[] =
				intent.scope === 'team'
					? this.roster
					: this.roster.filter((r) => {
							const targets = intent.targetUids ?? [];
							return (
								targets.includes(r.uid)
								|| targets.includes(r.rosterKey)
								|| targets.includes(r.email)
							);
						});

			const rosterRows: IntentRosterRow[] = scopedRoster.map((r) => {
				const currentXp = Number(r.xpByAttribute?.[intent.targetAttributeId] ?? 0);
				const baselineXp = resolveIntentBaselineXp(effectiveBaseline, r);
				const earnedXp = computeIntentEarnedXp(currentXp, baselineXp);
				const progressPct = computeIntentProgressPct(earnedXp, intent.requiredXp);
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
					? (intent.expiresAt as unknown as { toMillis: () => number }).toMillis()
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

	assignableRosterCount = $derived(this.roster.filter((r) => r.assignable).length);

	nameOnlyRosterCount = $derived(
		this.roster.filter((r) => r.nameOnly || !r.assignable).length,
	);

	selectedAssignableCount = $derived(
		this.draftTargetUids.filter((key) =>
			this.roster.some((r) => r.rosterKey === key && r.assignable),
		).length,
	);

	/** True if draft is ready to deploy. */
	canDeploy = $derived(
		!!this.draftAttributeId &&
		this.draftRequiredXp >= 1 &&
		this.draftDurationDays >= 1 &&
		(this.draftScope === 'team' ?
			this.assignableRosterCount > 0
		:	this.selectedAssignableCount > 0) &&
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
		void this._loadDrillsForAttribute();

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
		const row = this.roster.find((r) => r.rosterKey === uid);
		if (row && !row.assignable) return;
		const idx = this.draftTargetUids.indexOf(uid);
		if (idx === -1) {
			this.draftTargetUids = [...this.draftTargetUids, uid];
		} else {
			this.draftTargetUids = this.draftTargetUids.filter((u) => u !== uid);
		}
	}

	selectAllRosterUids() {
		this.draftTargetUids = this.roster.filter((r) => r.assignable).map((r) => r.rosterKey);
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
		this.draftPriorityMission = false;
		this.draftPrescriptionSets = 3;
		this.draftPrescriptionRepsPerSet = 10;
		this.draftPrescriptionBilateral = false;
		this.draftPrescriptionDurationMin = 0;
		this.draftPrescriptionTargetRpe = 0;
		this.draftCadenceSessionsPerWindow = 0;
		this.draftDrillId = '';
		this.draftDrillTitle = '';
		this.draftBundleDrills = [];
		this.draftRequiresParentVerification = false;
		this.deployPhase = 'idle';
		this.deployError = '';
	}

	buildDeployPrescription(): IntentPrescription {
		const sets = Math.max(1, Math.min(99, Math.floor(Number(this.draftPrescriptionSets) || 1)));
		const repsRaw = Math.floor(Number(this.draftPrescriptionRepsPerSet) || 0);
		const rx: IntentPrescription = {
			sets,
			bilateral: this.draftPrescriptionBilateral === true,
		};
		if (repsRaw > 0) rx.repsPerSet = Math.min(999, repsRaw);
		const dur = Math.floor(Number(this.draftPrescriptionDurationMin) || 0);
		if (dur > 0) rx.targetDurationMin = Math.min(120, dur);
		const rpe = Math.floor(Number(this.draftPrescriptionTargetRpe) || 0);
		if (rpe >= 1 && rpe <= 10) rx.targetRpe = rpe;
		const drill = this.availableDrills.find((d) => d.id === this.draftDrillId);
		if (drill?.title) {
			rx.drillTitle = drill.title;
			if (drill.scope === 'club') {
				rx.clubDrillId = drill.id;
			} else {
				rx.teamDrillId = drill.id;
			}
			if (!rx.targetDurationMin && drill.durationMinutes > 0) {
				rx.targetDurationMin = Math.min(120, drill.durationMinutes);
			}
			if (drill.videoUrl) rx.videoUrl = drill.videoUrl;
			if (drill.cues) rx.cues = drill.cues;
		} else {
			const customTitle = this.draftDrillTitle.trim();
			if (customTitle) rx.drillTitle = customTitle.slice(0, 200);
		}
		const sessionsPerWindow = Math.floor(Number(this.draftCadenceSessionsPerWindow) || 0);
		if (sessionsPerWindow >= 1 && sessionsPerWindow <= 21) {
			rx.cadence = { sessionsPerWindow, windowDays: 7 };
		}
		// B4a: emit requiresParentVerification only when coach opts in.
		if (this.draftRequiresParentVerification === true) {
			rx.requiresParentVerification = true;
		}
		// B3: emit drills[] only when the coach has added bundle entries.
		if (this.draftBundleDrills.length > 0) {
			const drills: PrescriptionDrillEntry[] = this.draftBundleDrills
				.slice(0, 8)
				.map((entry) => {
					const entrySets = Math.max(1, Math.min(99, Math.floor(Number(entry.sets) || 1)));
					const entryReps = Math.floor(Number(entry.repsPerSet) || 0);
					const out: PrescriptionDrillEntry = { sets: entrySets };
					const matchedDrill = this.availableDrills.find((d) => d.id === entry.drillId);
					if (matchedDrill?.title) {
						out.drillTitle = matchedDrill.title.slice(0, 200);
						if (matchedDrill.scope === 'club') {
							out.clubDrillId = matchedDrill.id;
						} else {
							out.teamDrillId = matchedDrill.id;
						}
						if (matchedDrill.videoUrl) out.videoUrl = matchedDrill.videoUrl;
						if (matchedDrill.cues) out.cues = matchedDrill.cues;
					} else {
						const customTitle = (entry.drillTitle ?? '').trim();
						if (customTitle) out.drillTitle = customTitle.slice(0, 200);
					}
					if (entryReps > 0) out.repsPerSet = Math.min(999, entryReps);
					return out;
				});
			if (drills.length > 0) rx.drills = drills;
		}
		return rx;
	}

	/** B3: add a new blank bundle drill entry (max 8). */
	addBundleDrill() {
		if (this.draftBundleDrills.length >= 8) return;
		this.draftBundleDrills = [
			...this.draftBundleDrills,
			{ drillId: '', drillTitle: '', sets: 3, repsPerSet: 10 },
		];
	}

	/** B3: remove bundle drill entry at index. */
	removeBundleDrill(index: number) {
		this.draftBundleDrills = this.draftBundleDrills.filter((_, i) => i !== index);
	}

	/** B3: update a single field on a bundle entry (immutable replacement). */
	updateBundleDrill(index: number, patch: Partial<{ drillId: string; drillTitle: string; sets: number; repsPerSet: number }>) {
		this.draftBundleDrills = this.draftBundleDrills.map((entry, i) =>
			i === index ? { ...entry, ...patch } : entry,
		);
	}

	onAttributeChanged() {
		this.draftDrillId = '';
		void this._loadDrillsForAttribute();
	}

	async deployIntent() {
		if (this._deployInFlight || this.deployPhase !== 'idle') return;
		if (
			!this.draftAttributeId ||
			this.draftRequiredXp < 1 ||
			this.draftDurationDays < 1 ||
			(this.draftScope === 'team'
				? this.assignableRosterCount === 0
				: this.selectedAssignableCount === 0)
		) {
			return;
		}

		this._deployInFlight = true;
		this.deployPhase = 'saving';
		this.deployError = '';
		const clientDeployId = crypto.randomUUID();
		try {
			const scopedRoster =
				this.draftScope === 'team'
					? this.roster.filter((r) => r.assignable || r.uid || r.email)
					: this.roster.filter((r) =>
							this.draftTargetUids.some(
								(key) => key === r.rosterKey || key === r.uid || key === r.email,
							),
						);
			const deployBaselines = buildXpBaselineSnapshot(scopedRoster, this.draftAttributeId);
			const fn = httpsCallable<DeployIntentInput, DeployIntentResult>(
				functions,
				'secureDeployIntent',
			);
			const deployResult = await fn({
				teamId: this._teamId,
				tenantId: this._tenantId,
				clubId: this._clubId,
				targetAttributeId: this.draftAttributeId,
				requiredXp: this.draftRequiredXp,
				durationDays: this.draftDurationDays,
				scope: this.draftScope,
				targetUids:
					this.draftScope === 'players' ?
						this.draftTargetUids.filter((key) =>
							this.roster.some((r) => r.rosterKey === key && r.assignable),
						)
					:	[],
				priority: this.draftPriorityMission ? 10 : 100,
				prescription: this.buildDeployPrescription(),
				clientDeployId,
			});
			if (deployResult.data.intentId) {
				this._deployBaselineByIntentId.set(deployResult.data.intentId, deployBaselines);
			}
			this.deployPhase = 'success';
			setTimeout(() => this.resetDraft(), 2500);
		} catch (e) {
			this.deployPhase = 'error';
			this.deployError = (e as Error).message ?? 'Deploy failed.';
		} finally {
			this._deployInFlight = false;
		}
	}

	async cancelIntent(intentId: string) {
		if (!intentId || this.cancellingIntentIds.includes(intentId)) return;
		this.mutationError = '';
		this.mutationSuccess = '';
		this.cancellingIntentIds = [...this.cancellingIntentIds, intentId];
		try {
			const fn = httpsCallable<CancelIntentInput, CancelIntentResult>(
				functions,
				'secureCancelIntent',
			);
			await fn({ intentId, teamId: this._teamId, tenantId: this._tenantId });
			this._removeIntentFromList(intentId);
			this._subscribeIntents();
			this.mutationSuccess = 'Intent cancelled.';
			setTimeout(() => {
				if (this.mutationSuccess === 'Intent cancelled.') {
					this.mutationSuccess = '';
				}
			}, 4000);
		} catch (e) {
			if (this._isIntentAlreadyInactiveError(e)) {
				this._removeIntentFromList(intentId);
				this.mutationSuccess = 'Intent already inactive.';
				setTimeout(() => {
					if (this.mutationSuccess === 'Intent already inactive.') {
						this.mutationSuccess = '';
					}
				}, 4000);
				return;
			}
			this.mutationError = this._formatCallableError(e, 'Cancel failed.');
		} finally {
			this.cancellingIntentIds = this.cancellingIntentIds.filter((id) => id !== intentId);
		}
	}

	async refreshIntents() {
		if (!this._teamId || this.isRefreshing) return;
		this.mutationError = '';
		this.isRefreshing = true;
		try {
			const q = query(
				collection(db, 'team_assignments'),
				where('teamId', '==', this._teamId),
				where('status', '==', 'active'),
				orderBy('priority', 'asc'),
			);
			const snap = await getDocs(q);
			this._applyIntentSnapshot(snap.docs);
			this._subscribeIntents();
			await this.refreshRoster();
		} catch (e) {
			this.mutationError = this._formatCallableError(e, 'Refresh failed.');
		} finally {
			this.isRefreshing = false;
		}
	}

	async refreshRoster() {
		if (!this._teamId) return;
		await this._loadRoster();
	}

	async extendIntent(intentId: string, additionalDays: number) {
		this.mutationError = '';
		try {
			const fn = httpsCallable<ExtendIntentInput, ExtendIntentResult>(
				functions,
				'secureExtendIntent',
			);
			await fn({ intentId, teamId: this._teamId, tenantId: this._tenantId, additionalDays });
		} catch (e) {
			this.mutationError = (e as Error).message ?? 'Extend failed.';
		}
	}

	// ── Private ───────────────────────────────────────────────────────────────

	private _intentDocId(raw: IntentDoc): string {
		const withId = raw as IntentDoc & { intentId?: string };
		return withId.intentId?.trim() || '';
	}

	private _removeIntentFromList(intentId: string) {
		this.intents = this.intents.filter((raw) => this._intentDocId(raw) !== intentId);
	}

	private _applyIntentSnapshot(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
		this.intents = docs.map((d) => ({ ...d.data(), intentId: d.id }) as IntentDoc);
	}

	private _formatCallableError(e: unknown, fallback: string): string {
		if (e && typeof e === 'object') {
			const err = e as { code?: string; message?: string };
			const code = typeof err.code === 'string' ? err.code.replace(/^functions\//, '') : '';
			const message = typeof err.message === 'string' ? err.message.trim() : '';
			if (code === 'failed-precondition' && message) {
				return message;
			}
			if (message) return message;
		}
		return fallback;
	}

	private _isIntentAlreadyInactiveError(e: unknown): boolean {
		if (!e || typeof e !== 'object') return false;
		const code = (e as { code?: string }).code?.replace(/^functions\//, '') ?? '';
		return code === 'failed-precondition';
	}

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
				this._applyIntentSnapshot(snap.docs);
				this.isLoadingIntents = false;
				this.error = '';
			},
			(err) => {
				console.error('[IntentEngine] intents snapshot error:', err);
				this.error = err.message;
				this.isLoadingIntents = false;
			},
		);
	}

	private _userDocToRosterEntry(docId: string, x: Record<string, unknown>): RosterEntry {
		const authUid =
			typeof x.uid === 'string' && x.uid.trim() && !x.uid.includes('@') ?
				x.uid.trim()
			:	'';
		return {
			uid: authUid,
			rosterKey: authUid || docId,
			email: docId,
			playerName: typeof x.playerName === 'string' && x.playerName.trim()
				? x.playerName.trim()
				: docId,
			xpByAttribute: (x.xpByAttribute as Record<string, number>) || {},
			assignable: Boolean(authUid || docId.includes('@')),
			nameOnly: false,
		};
	}

	private _formatRosterError(e: unknown): string {
		const msg = e instanceof Error ? e.message : String(e);
		if (/index/i.test(msg)) {
			return `Roster load failed: ${msg}. Run firebase deploy --only firestore:indexes if this persists.`;
		}
		return `Roster load failed: ${msg}`;
	}

	private async _resolveRosterFallback(
		teamPlayerUids: string[],
		rows: RosterEntry[],
	): Promise<RosterEntry[]> {
		const claimedUids = new Set(rows.map((r) => r.uid).filter(Boolean));
		const existingEmails = new Set(rows.map((r) => r.email.toLowerCase()).filter(Boolean));
		const fallbackRows = [...rows];

		try {
			const linkSnap = await getDocs(
				query(collection(db, 'player_lookup'), where('teamId', '==', this._teamId)),
			);
			for (const linkDoc of linkSnap.docs) {
				const email = linkDoc.id;
				if (existingEmails.has(email.toLowerCase())) continue;
				const userSnap = await getDoc(doc(db, 'users', email));
				if (!userSnap.exists()) continue;
				const row = this._userDocToRosterEntry(email, userSnap.data());
				if (!row.assignable) continue;
				fallbackRows.push(row);
				existingEmails.add(email.toLowerCase());
				if (row.uid) claimedUids.add(row.uid);
			}
		} catch (e) {
			console.warn('[IntentEngine] player_lookup fallback error:', e);
		}

		const orphanUids = teamPlayerUids.filter((u) => !claimedUids.has(u));
		for (const playerUid of orphanUids) {
			try {
				const uidSnap = await getDocs(
					query(collection(db, 'users'), where('uid', '==', playerUid)),
				);
				for (const d of uidSnap.docs) {
					if (existingEmails.has(d.id.toLowerCase())) continue;
					const row = this._userDocToRosterEntry(d.id, d.data());
					if (!row.assignable) continue;
					fallbackRows.push(row);
					existingEmails.add(d.id.toLowerCase());
					claimedUids.add(playerUid);
				}
			} catch (e) {
				console.warn('[IntentEngine] uid fallback error for', playerUid, e);
			}
		}

		return fallbackRows;
	}

	private _finalizeRoster(rows: RosterEntry[], rosterNames: string[]) {
		const merged = mergeAdminRoster(
			rows.map((r) => ({
				email: r.email,
				playerName: r.playerName,
				ageGroup: null,
				teamId: this._teamId,
			})),
			rosterNames,
			this._teamId,
		);

		const byEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));
		const byName = new Map(rows.map((r) => [r.playerName.trim().toLowerCase(), r]));

		this.roster = dedupeRosterEntries(
			merged.map((m) => {
			if (m.nameOnly) {
				return {
					uid: '',
					rosterKey: m.key,
					email: '',
					playerName: m.playerName,
					xpByAttribute: {},
					assignable: false,
					nameOnly: true,
				};
			}
			const linked =
				(m.email && byEmail.get(m.email.toLowerCase())) ||
				byName.get(m.playerName.trim().toLowerCase());
			if (linked) {
				return { ...linked, assignable: Boolean(linked.uid || linked.email), nameOnly: false };
			}
			return {
				uid: '',
				rosterKey: m.email || m.key,
				email: m.email,
				playerName: m.playerName,
				xpByAttribute: {},
				assignable: Boolean(m.email),
				nameOnly: false,
			};
		}),
		);
	}

	private async _loadRoster() {
		if (!this._teamId) return;
		this.isLoadingRoster = true;
		this.rosterError = '';
		let teamPlayerUids: string[] = [];
		let rosterNames: string[] = [];
		let rows: RosterEntry[] = [];
		let queryFailed = false;

		try {
			const [teamSnap, rosterSnap] = await Promise.all([
				getDoc(doc(db, 'teams', this._teamId)),
				getDoc(doc(db, 'rosters', this._teamId)),
			]);
			teamPlayerUids = Array.isArray(teamSnap.data()?.playerUids)
				? teamSnap
						.data()!
						.playerUids.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
				: [];
			rosterNames =
				rosterSnap.exists() && Array.isArray(rosterSnap.data()?.players) ?
					rosterSnap.data()!.players
						.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
						.map((n) => n.trim())
				:	[];

			const snap = await getDocs(
				query(collection(db, 'users'), where('teamId', '==', this._teamId)),
			);
			rows = snap.docs
				.filter((d) => d.data().role === 'player')
				.map((d) => this._userDocToRosterEntry(d.id, d.data()));
			rows = dedupeRosterEntries(rows);

			const claimedUids = new Set(rows.map((r) => r.uid).filter(Boolean));
			const orphanUids = teamPlayerUids.filter((u) => !claimedUids.has(u));
			const missingUidRows = rows.filter((r) => !r.uid);
			if (missingUidRows.length === 1 && orphanUids.length === 1) {
				const resolvedUid = orphanUids[0];
				missingUidRows[0].uid = resolvedUid;
				missingUidRows[0].rosterKey = resolvedUid;
				missingUidRows[0].assignable = true;
			}
		} catch (e) {
			queryFailed = true;
			console.error('[IntentEngine] roster load error:', e);
			this.rosterError = this._formatRosterError(e);
			rows = [];
		}

		const assignableCount = rows.filter((r) => r.assignable).length;
		if ((queryFailed || assignableCount === 0) && teamPlayerUids.length > 0) {
			rows = await this._resolveRosterFallback(teamPlayerUids, rows);
			if (rows.some((r) => r.assignable)) {
				this.rosterError = '';
			}
		}

		try {
			this._finalizeRoster(rows, rosterNames);
		} catch (e) {
			console.error('[IntentEngine] roster merge error:', e);
			this.roster = [];
			this.rosterError = this._formatRosterError(e);
		} finally {
			this.isLoadingRoster = false;
		}
	}

	private async _loadDrillsForAttribute() {
		if (!this._teamId) {
			this.availableDrills = [];
			return;
		}
		this.isLoadingDrills = true;
		try {
			this.availableDrills = await loadTeamDrillsForIntent(db, this._teamId, {
				attributeId: this.draftAttributeId.trim() || undefined,
				clubId: this._clubId.trim() || undefined,
			});
		} catch (e) {
			console.error('[IntentEngine] team drill load error:', e);
			this.availableDrills = [];
		} finally {
			this.isLoadingDrills = false;
		}
	}
}
