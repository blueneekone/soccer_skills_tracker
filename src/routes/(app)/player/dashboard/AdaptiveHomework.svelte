<script lang="ts">
	import {
		collection,
		query,
		where,
		onSnapshot,
		orderBy,
		doc,
		setDoc,
	} from 'firebase/firestore';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import {
		buildPolicyHintsFromResult,
		pickWeakestAttributeId,
		resolveAdaptiveDrill,
		stashCoachIntentHandoffForAssignment,
	} from '$lib/player/workout/coachMissionFlow.js';
	import { repairIntentPrescription } from '$lib/types/intent.js';
	import { ensureRlPolicyCached, readRlPolicyCache } from '$lib/player/workout/rlPolicyCache.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { getRpgSportConfig } from '$lib/config/sports.js';
	import TacticalDrillBoard from '$lib/components/tactical/TacticalDrillBoard.svelte';

	interface Assignment {
		id: string;
		targetAttributeId: string;
		requiredXp: number;
		teamId: string;
		scope?: string;
		targetUids?: string[];
		priority?: number;
		status?: string;
		prescription?: Record<string, unknown>;
	}

	interface Drill {
		id: string;
		title: string;
		attributeId: string;
		tier: string;
		mediaType: string;
		payload?: string;
	}

	type TacticalPayloadKey =
		| 'svg_sole_taps'
		| 'svg_inside_outside_cut'
		| 'svg_speed_ladder'
		| 'svg_shoulder_check';
	type TacticalTierKey = 'beginner' | 'intermediate' | 'advanced';

	interface PolicyResult {
		mode: 'policy' | 'heuristic';
		recommendedDrillId: string | null;
		recommendedDurationMinutes: number | null;
		recommendedTargetRpe: number | null;
		policyVersion: number | null;
		explorationFlag: boolean;
		explanationCode: string | null;
		explanationText: string | null;
	}

	let assignments = $state<Assignment[]>([]);
	let suggestedDrill = $state<Drill | null>(null);
	let isLoading = $state(true);
	let soloTargetAttributeId = $state<string | null>(null);

	let policyResult = $state<PolicyResult | null>(null);
	let showTooltip = $state(false);

	const playerProfile = $derived(/** @type {Record<string, unknown>} */ (authStore.userProfile));
	const playerTeamId = $derived(String(playerProfile?.teamId ?? ''));
	const playerClubId = $derived(
		typeof playerProfile?.clubId === 'string' && playerProfile.clubId.trim() ?
			playerProfile.clubId.trim()
		: typeof authStore.tenantId === 'string' ?
			authStore.tenantId
		: '',
	);
	const recentFrustration = $derived(String(playerProfile?.recentFrustration ?? 'low'));
	const playerTier = $derived(playerProfile?.calculatedTier ? String(playerProfile.calculatedTier) : 'beginner');
	const sportId = $derived(sportsConfigStore.currentSportConfig?.sportId ?? 'soccer');

	const activeAssignment = $derived(/** @type {Assignment | null} */ (assignments[0] ?? null));
	const queueCount = $derived(Math.max(0, assignments.length - 1));
	const isSoloMode = $derived(!activeAssignment && !!soloTargetAttributeId);

	const displayAttributeId = $derived(
		activeAssignment?.targetAttributeId ?? soloTargetAttributeId ?? '',
	);

	const activeAttribute = $derived.by(() => {
		if (!displayAttributeId) return null;
		const rpgCfg = getRpgSportConfig(sportId);
		return rpgCfg.attributes.find((a) => a.id === displayAttributeId) ?? null;
	});

	const playerAttributeXp = $derived.by(() => {
		if (!displayAttributeId || !playerProfile) return 0;
		const xpMap = /** @type {Record<string, number>} */ (playerProfile.xpByAttribute ?? {});
		return Number(xpMap[displayAttributeId] ?? 0);
	});

	const xpProgressPct = $derived.by(() => {
		if (!activeAssignment || activeAssignment.requiredXp <= 0) return 0;
		return Math.min(100, Math.round((playerAttributeXp / activeAssignment.requiredXp) * 100));
	});

	const isPolicyMode = $derived(policyResult?.mode === 'policy' && !!policyResult.recommendedDrillId);

	$effect(() => {
		const profile = playerProfile;
		const email = authStore.user?.email?.toLowerCase();
		if (!profile || !email || profile.calculatedTier) return;
		setDoc(doc(db, 'users', email), { calculatedTier: 'beginner' }, { merge: true }).catch((err) => {
			console.error('[AdaptiveHomework] tier migration write failed', err);
		});
	});

	const playerUid = $derived(authStore.user?.uid ?? '');

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
				const all: Assignment[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
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

	$effect(() => {
		const profile = playerProfile;
		const sid = sportId;
		if (activeAssignment) {
			soloTargetAttributeId = null;
			return;
		}
		const rpgCfg = getRpgSportConfig(sid);
		const attrIds = rpgCfg.attributes.map((a) => a.id);
		const xpMap = /** @type {Record<string, number>} */ (profile?.xpByAttribute ?? {});
		soloTargetAttributeId = pickWeakestAttributeId(xpMap, attrIds);
	});

	$effect(() => {
		const _assignment = activeAssignment;
		const sid = sportId;
		let cancelled = false;

		async function loadPolicy() {
			const cached = readRlPolicyCache(sid);
			if (cached) {
				if (!cancelled) policyResult = cached;
				return;
			}
			try {
				const result = await ensureRlPolicyCached({
					sportId: sid,
					fetchPolicy: async (sport) => {
						const getPolicy = httpsCallable(functions, 'getAdaptiveWorkoutPolicy');
						const res = await getPolicy({ sportId: sport });
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

	$effect(() => {
		const assignment = activeAssignment;
		const soloAttr = soloTargetAttributeId;
		const targetAttr = assignment?.targetAttributeId ?? soloAttr;
		const policy = policyResult;
		const frustration = recentFrustration;
		const teamId = playerTeamId;
		const clubId = playerClubId;
		const sid = sportId;
		let cancelled = false;

		if (!targetAttr) {
			suggestedDrill = null;
			return;
		}

		async function fetchDrill() {
			try {
				const resolved = await resolveAdaptiveDrill(db, {
					teamId,
					clubId,
					targetAttributeId: targetAttr,
					prescription: repairIntentPrescription(assignment?.prescription),
					recentFrustration: frustration,
					sportId: sid,
					recommendedDrillId:
						policy?.mode === 'policy' ? policy.recommendedDrillId : null,
				});
				if (cancelled) return;
				if (resolved) {
					suggestedDrill = {
						id: resolved.id,
						title: resolved.title,
						attributeId: resolved.attributeId,
						tier: resolved.tier ?? playerTier,
						mediaType: resolved.mediaType ?? 'text',
					};
				} else {
					suggestedDrill = null;
				}
			} catch (err) {
				console.error('[AdaptiveHomework] adaptive drill resolve error:', err);
				if (!cancelled) suggestedDrill = null;
			}
		}

		fetchDrill();
		return () => { cancelled = true; };
	});

	function logOnTrain() {
		let navHandoff = null;
		if (activeAssignment) {
			navHandoff = stashCoachIntentHandoffForAssignment({
				missionId: activeAssignment.id,
				targetAttributeId: activeAssignment.targetAttributeId,
				requiredXp: activeAssignment.requiredXp,
				prescription: activeAssignment.prescription,
				drill: suggestedDrill ?
					{ id: suggestedDrill.id, title: suggestedDrill.title }
				:	null,
				policyHints: buildPolicyHintsFromResult(policyResult),
				armExplicit: true,
			});
		} else if (soloTargetAttributeId && suggestedDrill) {
			navHandoff = stashCoachIntentHandoffForAssignment({
				missionId: `solo-focus-${soloTargetAttributeId}`,
				targetAttributeId: soloTargetAttributeId,
				drill: { id: suggestedDrill.id, title: suggestedDrill.title },
				policyHints: buildPolicyHintsFromResult(policyResult),
				armExplicit: true,
			});
		} else {
			return;
		}
		void goto(resolveAppPath('/player/workout'), {
			state: navHandoff ? { missionHandoff: navHandoff } : undefined,
		});
	}
</script>

<div
	class="vanguard-surface tw-flex tw-flex-col tw-gap-5 tw-p-6"
>
	<div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
		<div class="tw-flex tw-flex-col tw-gap-0.5">
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-teal-400/60">
				[ // ADAPTIVE HOMEWORK ]
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/30">
				[ EQ-SCAFFOLDED DRILL QUEUE ]
			</span>
		</div>
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
	{:else if !activeAssignment && !isSoloMode}
		<div
			class="tw-w-full tw-py-8 tw-px-4 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-white/5 tw-text-center"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/20">
				[ NO ACTIVE TACTICAL INTENTS ]
			</span>
		</div>
	{:else}
		<div class="tw-flex tw-flex-col tw-gap-4">
			{#if isSoloMode}
				<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-teal-400/50">
					[ SOLO FOCUS · NO COACH INTENT ]
				</p>
			{/if}

			<div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
				<span class="tw-font-mono tw-text-xs tw-text-white/60 tw-tracking-wider">
					{activeAttribute?.name ?? displayAttributeId}
				</span>
				{#if activeAssignment && activeAttribute}
					<span
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-px-2 tw-py-0.5 tw-rounded tw-shrink-0"
						style="color:{activeAttribute.hexColor}; border: 1px solid {activeAttribute.hexColor}40; background: {activeAttribute.hexColor}10"
					>
						{activeAssignment.requiredXp} XP
					</span>
				{:else if isSoloMode}
					<span class="tw-font-mono tw-text-[9px] tw-text-white/30 tw-tracking-wider">
						Weakest attribute
					</span>
				{/if}
			</div>

			{#if recentFrustration === 'high'}
				<div
					class="tw-w-full tw-py-1.5 tw-px-3 tw-rounded-lg tw-border tw-border-slate-700/70 tw-bg-slate-800"
				>
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400">
						[ SCAFFOLDING ACTIVE: EQ PROTECTION MODE ]
					</span>
				</div>
			{/if}

			{#if suggestedDrill}
				<div
					class="tw-flex tw-flex-col tw-gap-3 tw-p-4 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-slate-800/60"
				>
					<div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
						<span class="tw-font-mono tw-text-xs tw-text-white/70 tw-leading-relaxed">
							{suggestedDrill.title}
						</span>
						<div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-shrink-0">
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
							payload={suggestedDrill.payload as TacticalPayloadKey}
							title={suggestedDrill.title}
							tier={suggestedDrill.tier as TacticalTierKey}
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
				disabled={!suggestedDrill}
				onclick={logOnTrain}
			>
				{isSoloMode ? 'Train solo focus' : 'Log on Train'}
			</button>

			{#if activeAssignment}
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
			{/if}
		</div>
	{/if}
</div>
