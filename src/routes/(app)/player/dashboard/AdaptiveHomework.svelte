<script lang="ts">
	import {
		collection,
		query,
		where,
		onSnapshot,
		getDocs,
		orderBy,
		doc,
		getDoc,
		setDoc,
	} from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { db } from '$lib/firebase.js';
	import { stashCoachIntentHandoffForAssignment, buildPolicyHintsFromResult } from '$lib/player/workout/coachMissionFlow.js';
	import { ensureRlPolicyCached, readRlPolicyCache } from '$lib/player/workout/rlPolicyCache.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { getRpgSportConfig } from '$lib/config/sports.js';
	import TacticalDrillBoard from '$lib/components/tactical/TacticalDrillBoard.svelte';
	import MorningReadinessCard from '$lib/components/player/MorningReadinessCard.svelte';

	/** @typedef {{ id: string; targetAttributeId: string; requiredXp: number; teamId: string; scope?: string; targetUids?: string[]; priority?: number; status?: string; prescription?: Record<string, unknown> }} Assignment */
	/** @typedef {{ id: string; title: string; attributeId: string; tier: string; mediaType: string; payload?: string }} Drill */

	/**
	 * @typedef {{
	 *   mode: 'policy'|'heuristic';
	 *   recommendedDrillId: string|null;
	 *   recommendedDurationMinutes: number|null;
	 *   recommendedTargetRpe: number|null;
	 *   policyVersion: number|null;
	 *   explorationFlag: boolean;
	 *   explanationCode: string|null;
	 *   explanationText: string|null;
	 * }} PolicyResult
	 */

	/** @type {Assignment[]} */
	let assignments = $state([]);
	/** @type {Drill | null} */
	let suggestedDrill = $state(null);
	let isLoading = $state(true);

	// RL policy state
	/** @type {PolicyResult | null} */
	let policyResult = $state(null);
	let showTooltip = $state(false);

	// Morning Readiness Card — shown once per UTC day until player submits.
	let showReadinessCard = $state(false);

	$effect(() => {
		const uid = authStore.user?.uid;
		if (!uid) { showReadinessCard = false; return; }
		const dateUtc = new Date().toISOString().slice(0, 10);
		const ref = doc(db, 'physio_self_reports', uid, 'daily', dateUtc);
		getDoc(ref)
			.then((snap) => { showReadinessCard = !snap.exists(); })
			.catch(() => { showReadinessCard = false; });
	});

	const playerProfile = $derived(/** @type {Record<string, unknown>} */ (authStore.userProfile));
	const playerTeamId = $derived(String(playerProfile?.teamId ?? ''));
	const recentFrustration = $derived(String(playerProfile?.recentFrustration ?? 'low'));
	const playerTier = $derived(playerProfile?.calculatedTier ? String(playerProfile.calculatedTier) : 'beginner');

	// Highest-priority intent (lowest priority number wins — already sorted asc by onSnapshot query).
	const activeAssignment = $derived(/** @type {Assignment | null} */ (assignments[0] ?? null));
	// Queue depth: remaining intents after the active one.
	const queueCount = $derived(Math.max(0, assignments.length - 1));

	const activeAttribute = $derived.by(() => {
		if (!activeAssignment) return null;
		const rpgCfg = getRpgSportConfig(sportsConfigStore.currentSportConfig?.sportId);
		return rpgCfg.attributes.find((a) => a.id === activeAssignment.targetAttributeId) ?? null;
	});

	const playerAttributeXp = $derived.by(() => {
		if (!activeAssignment || !playerProfile) return 0;
		const xpMap = /** @type {Record<string, number>} */ (playerProfile.xpByAttribute ?? {});
		return Number(xpMap[activeAssignment.targetAttributeId] ?? 0);
	});

	const xpProgressPct = $derived.by(() => {
		if (!activeAssignment || activeAssignment.requiredXp <= 0) return 0;
		return Math.min(100, Math.round((playerAttributeXp / activeAssignment.requiredXp) * 100));
	});

	// Whether to show the policy-recommended drill or fall back to heuristic
	const isPolicyMode = $derived(policyResult?.mode === 'policy' && !!policyResult.recommendedDrillId);

	// Lazy migration write-back: if calculatedTier is missing, patch Firestore non-blocking
	$effect(() => {
		const profile = playerProfile;
		const uid = authStore.user?.uid;
		if (!profile || !uid || profile.calculatedTier) return;
		setDoc(doc(db, 'users', uid), { calculatedTier: 'beginner' }, { merge: true }).catch(() => {});
	});

	// Epic 8: uid for scope filtering
	const playerUid = $derived(authStore.user?.uid ?? '');

	// Real-time subscription to ALL active intents this player is scoped into.
	// Filters: status==='active', scope==='team' OR uid in targetUids.
	// Sorted client-side by priority asc (lowest priority number = highest priority).
	$effect(() => {
		const teamId = playerTeamId;
		const uid = playerUid;
		if (!teamId) {
			assignments = [];
			isLoading = false;
			return;
		}

		isLoading = true;
		const q = query(
			collection(db, 'team_assignments'),
			where('teamId', '==', teamId),
			where('status', '==', 'active'),
			orderBy('priority', 'asc'),
		);

		const unsub = onSnapshot(
			q,
			(snap) => {
				/** @type {Assignment[]} */
				const all = snap.docs.map((d) => ({ id: d.id, .../** @type {any} */ (d.data()) }));
				// Scope-filter: keep team-wide intents and player-scoped ones that include this uid.
				assignments = all.filter((a) => {
					if (!a.scope || a.scope === 'team') return true;
					return Array.isArray(a.targetUids) && uid && a.targetUids.includes(uid);
				});
				isLoading = false;
			},
			(err) => {
				console.error('[AdaptiveHomework] assignments snapshot error:', err);
				isLoading = false;
			}
		);

		return unsub;
	});

	// Call getAdaptiveWorkoutPolicy on mount / assignment change — shared 24h session cache.
	$effect(() => {
		const _assignment = activeAssignment;
		const sportId = sportsConfigStore.currentSportConfig?.sportId ?? 'soccer';
		let cancelled = false;

		async function loadPolicy() {
			const cached = readRlPolicyCache(sportId);
			if (cached) {
				if (!cancelled) policyResult = cached;
				return;
			}
			try {
				const result = await ensureRlPolicyCached({
					sportId,
					fetchPolicy: async (sid) => {
						const fns = getFunctions();
						const getPolicy = httpsCallable(fns, 'getAdaptiveWorkoutPolicy');
						const res = await getPolicy({ sportId: sid });
						return res.data;
					},
				});
				if (!cancelled) policyResult = result;
			} catch {
				if (!cancelled) policyResult = null;
			}
		}

		loadPolicy();
		return () => { cancelled = true; };
	});

	// Fetch the policy-recommended drill from global_drills when in policy mode.
	// Falls through to heuristic when policy recommends null or lookup fails.
	$effect(() => {
		const policy = policyResult;
		const assignment = activeAssignment;
		const frustration = recentFrustration;
		let cancelled = false;

		// Policy mode: fetch the specific recommended drill
		if (policy?.mode === 'policy' && policy.recommendedDrillId) {
			getDoc(doc(db, 'global_drills', policy.recommendedDrillId))
				.then((snap) => {
					if (cancelled) return;
					if (snap.exists()) {
						suggestedDrill = { id: snap.id, .../** @type {any} */ (snap.data()) };
					} else {
						// Recommended drill not found — fall through to heuristic
						policyResult = null;
					}
				})
				.catch(() => {
					if (!cancelled) policyResult = null;
				});
			return () => { cancelled = true; };
		}

		// Heuristic mode (existing logic)
		if (!assignment) {
			suggestedDrill = null;
			return;
		}

		async function fetchDrill() {
			try {
				/** @type {import('firebase/firestore').QueryConstraint[]} */
				const constraints = [where('attributeId', '==', assignment.targetAttributeId)];
				if (frustration === 'high') {
					constraints.push(where('tier', '==', 'beginner'));
				}

				const q = query(collection(db, 'global_drills'), ...constraints);
				const snap = await getDocs(q);

				if (cancelled) return;

				/** @type {Drill[]} */
				const drills = snap.docs.map((d) => ({ id: d.id, .../** @type {any} */ (d.data()) }));

				drills.sort((a, b) => {
					if (a.mediaType === 'tactical_svg' && b.mediaType !== 'tactical_svg') return -1;
					if (b.mediaType === 'tactical_svg' && a.mediaType !== 'tactical_svg') return 1;
					return 0;
				});

				suggestedDrill = drills[0] ?? null;
			} catch (err) {
				console.error('[AdaptiveHomework] drills query error:', err);
				if (!cancelled) suggestedDrill = null;
			}
		}

		fetchDrill();
		return () => { cancelled = true; };
	});

	function logOnTrain() {
		const assignment = activeAssignment;
		if (!assignment) return;
		stashCoachIntentHandoffForAssignment({
			missionId: assignment.id,
			targetAttributeId: assignment.targetAttributeId,
			requiredXp: assignment.requiredXp,
			prescription: assignment.prescription,
			drill: suggestedDrill ?
				{ id: suggestedDrill.id, title: suggestedDrill.title }
			:	null,
			policyHints: buildPolicyHintsFromResult(policyResult),
		});
		void goto(resolve('/player/workout'));
	}
</script>

<div
	class="vanguard-surface tw-flex tw-flex-col tw-gap-5 tw-p-6"
>
	<!-- Morning Readiness Card (Phase 3, Epic 4 — RL S2) -->
	{#if showReadinessCard}
		<MorningReadinessCard onSubmitted={() => { showReadinessCard = false; }} />
		<div class="tw-w-full tw-h-px tw-bg-slate-800/60"></div>
	{/if}

	<!-- Header -->
	<div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
		<div class="tw-flex tw-flex-col tw-gap-0.5">
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-teal-400/60">
				[ // ADAPTIVE HOMEWORK ]
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/30">
				[ EQ-SCAFFOLDED DRILL QUEUE ]
			</span>
		</div>
		<!-- Queue depth pill: shows remaining intents behind the active one -->
		{#if queueCount > 0}
			<span
				class="tw-shrink-0 tw-font-mono tw-text-[9px] tw-tracking-widest tw-px-2 tw-py-0.5 tw-rounded tw-bg-[#6366f1]/15 tw-text-[#6366f1] tw-border tw-border-[#6366f1]/30"
				title="{queueCount} more intent{queueCount === 1 ? '' : 's'} queued"
			>
				+{queueCount} QUEUED
			</span>
		{/if}
	</div>

	<div class="tw-w-full tw-h-px tw-bg-slate-800/60"></div>

	{#if isLoading}
		<div class="tw-flex tw-items-center tw-justify-center tw-py-10">
			<span
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-teal-500/40 tw-animate-pulse"
			>
				[ SYNCING TACTICAL DATA... ]
			</span>
		</div>
	{:else if !activeAssignment}
		<div
			class="tw-w-full tw-py-8 tw-px-4 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-white/5 tw-text-center"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/20">
				[ NO ACTIVE TACTICAL INTENTS ]
			</span>
		</div>
	{:else}
		<div class="tw-flex tw-flex-col tw-gap-4">
			<!-- Assignment target: attribute name + XP badge -->
			<div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
				<span class="tw-font-mono tw-text-xs tw-text-white/60 tw-tracking-wider">
					{activeAttribute?.name ?? activeAssignment.targetAttributeId}
				</span>
				{#if activeAttribute}
					<span
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-px-2 tw-py-0.5 tw-rounded tw-shrink-0"
						style="color:{activeAttribute.hexColor}; border: 1px solid {activeAttribute.hexColor}40; background: {activeAttribute.hexColor}10"
					>
						{activeAssignment.requiredXp} XP
					</span>
				{/if}
			</div>

			<!-- EQ scaffolding protection mode banner -->
			{#if recentFrustration === 'high'}
				<div
					class="tw-w-full tw-py-1.5 tw-px-3 tw-rounded-lg tw-border tw-border-slate-700/70 tw-bg-slate-800"
				>
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400">
						[ SCAFFOLDING ACTIVE: EQ PROTECTION MODE ]
					</span>
				</div>
			{/if}

			<!-- Suggested drill card -->
			{#if suggestedDrill}
				<div
					class="tw-flex tw-flex-col tw-gap-3 tw-p-4 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-slate-800/60"
				>
					<div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
						<span class="tw-font-mono tw-text-xs tw-text-white/70 tw-leading-relaxed">
							{suggestedDrill.title}
						</span>
						<div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-shrink-0">
							<!-- AI pill (policy mode only) -->
							{#if isPolicyMode}
								<button
									type="button"
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-px-1.5 tw-py-0.5 tw-rounded tw-bg-[#a855f7]/15 tw-text-[#a855f7] tw-border tw-border-[#a855f7]/30 tw-cursor-pointer"
									onclick={() => { showTooltip = !showTooltip; }}
									aria-label="View AI explanation"
								>
									[ SUGGESTED BY AI ✦ ]
								</button>
							{/if}
							<span
								class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-px-1.5 tw-py-0.5 tw-rounded tw-bg-slate-800/60 tw-text-teal-400/60 tw-border tw-border-slate-700/60"
							>
								{suggestedDrill.mediaType === 'tactical_svg' ? '[ SVG ]' : '[ YT ]'}
							</span>
							<span class="tw-font-mono tw-text-[9px] tw-text-white/30 tw-uppercase tw-tracking-wider">
								{suggestedDrill.tier}
							</span>
						</div>
					</div>

					<!-- Explanation tooltip (policy mode) -->
					{#if isPolicyMode && showTooltip && policyResult?.explanationText}
						<div
							class="tw-w-full tw-p-3 tw-rounded-lg tw-bg-[#a855f7]/8 tw-border tw-border-[#a855f7]/20"
						>
							<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a855f7]/80 tw-m-0 tw-leading-relaxed">
								[ {policyResult.explanationCode} ] {policyResult.explanationText}
							</p>
							{#if policyResult.recommendedDurationMinutes}
								<p class="tw-font-mono tw-text-[9px] tw-text-white/30 tw-m-0 tw-mt-1">
									RECOMMENDED: {policyResult.recommendedDurationMinutes}min · RPE {policyResult.recommendedTargetRpe}
								</p>
							{/if}
						</div>
					{/if}

					{#if suggestedDrill.mediaType === 'tactical_svg' && suggestedDrill.payload}
						<TacticalDrillBoard
							payload={/** @type {any} */ (suggestedDrill.payload)}
							title={suggestedDrill.title}
							tier={/** @type {any} */ (suggestedDrill.tier)}
						/>
					{/if}
				</div>
			{:else}
				<div
					class="tw-w-full tw-py-4 tw-px-4 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-white/5 tw-text-center"
				>
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/20">
						[ NO DRILLS FOUND FOR TARGET ]
					</span>
				</div>
			{/if}

			<button
				type="button"
				class="tw-w-full tw-py-2.5 tw-rounded-xl tw-font-mono tw-text-[10px] tw-tracking-widest
				       tw-uppercase tw-border tw-border-teal-500/35 tw-text-teal-400 tw-bg-teal-500/10
				       hover:tw-bg-teal-500/20 tw-transition-colors"
				onclick={logOnTrain}
			>
				Log on Train
			</button>

			<!-- XP progress bar -->
			<div class="tw-flex tw-flex-col tw-gap-1.5">
				<div class="tw-flex tw-justify-between tw-items-center">
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30">
						XP PROGRESS
					</span>
					<span class="tw-font-mono tw-text-[9px] tw-text-teal-400/60">{xpProgressPct}%</span>
				</div>
				<div class="tw-w-full tw-h-1 tw-bg-slate-700/60 tw-rounded-full tw-overflow-hidden">
					<div
						class="tw-h-full tw-bg-teal-500 tw-rounded-full tw-transition-all tw-duration-700"
						style="width:{xpProgressPct}%"
					></div>
				</div>
				<div class="tw-flex tw-justify-between">
					<span class="tw-font-mono tw-text-[9px] tw-text-white/20">{playerAttributeXp} XP</span>
					<span class="tw-font-mono tw-text-[9px] tw-text-white/20">
						{activeAssignment.requiredXp} REQ
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
