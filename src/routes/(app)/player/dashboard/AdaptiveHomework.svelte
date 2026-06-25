<script lang="ts">
	import { doc, setDoc } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import {
		buildPolicyHintsFromResult,
		pickWeakestAttributeId,
		resolveAdaptiveDrill,
		stashAdaptiveHomeworkHandoff,
	} from '$lib/player/workout/coachMissionFlow.js';
	import { ensureRlPolicyCached, readRlPolicyCache } from '$lib/player/workout/rlPolicyCache.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { getRpgSportConfig } from '$lib/config/sports.js';
	import TacticalDrillBoard from '$lib/components/tactical/TacticalDrillBoard.svelte';

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

	type PolicyResult = {
		mode: 'policy' | 'heuristic';
		recommendedDrillId: string | null;
		recommendedDurationMinutes: number | null;
		recommendedTargetRpe: number | null;
		policyVersion: number | null;
		explorationFlag: boolean;
		explanationCode: string | null;
		explanationText: string | null;
	};

	let suggestedDrill = $state<Drill | null>(null);
	let isLoading = $state(true);
	let focusAttributeId = $state<string | null>(null);

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

	const activeAttribute = $derived.by(() => {
		if (!focusAttributeId) return null;
		const rpgCfg = getRpgSportConfig(sportId);
		return rpgCfg.attributes.find((a) => a.id === focusAttributeId) ?? null;
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

	$effect(() => {
		const profile = playerProfile;
		const sid = sportId;
		const rpgCfg = getRpgSportConfig(sid);
		const attrIds = rpgCfg.attributes.map((a) => a.id);
		const xpMap = /** @type {Record<string, number>} */ (profile?.xpByAttribute ?? {});
		focusAttributeId = pickWeakestAttributeId(xpMap, attrIds);
	});

	$effect(() => {
		const sid = sportId;
		let cancelled = false;

		async function loadPolicy() {
			isLoading = true;
			const cached = readRlPolicyCache(sid);
			if (cached) {
				if (!cancelled) {
					policyResult = cached;
					isLoading = false;
				}
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
			} finally {
				if (!cancelled) isLoading = false;
			}
		}

		loadPolicy();
		return () => { cancelled = true; };
	});

	$effect(() => {
		const targetAttr = focusAttributeId;
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
					prescription: null,
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
		if (!focusAttributeId || !suggestedDrill) return;
		const navHandoff = stashAdaptiveHomeworkHandoff({
			targetAttributeId: focusAttributeId,
			drill: { id: suggestedDrill.id, title: suggestedDrill.title },
			policyHints: buildPolicyHintsFromResult(policyResult),
		});
		void goto(resolveAppPath('/player/workout'), {
			state: { missionHandoff: navHandoff },
		});
	}
</script>

<section
	class="adaptive-homework pd-os-deck bento-span-12 tw-min-w-0 tw-max-w-full"
	aria-label="Adaptive homework"
	data-region="adaptive-homework"
>
	<header class="pd-hq-section-head adaptive-homework__head">
		<div class="adaptive-homework__id tw-min-w-0">
			<h2 class="pd-hq-section-head__title adaptive-homework__title">Adaptive homework</h2>
			<p class="pd-hq-section-head__eyebrow pd-label adaptive-homework__eyebrow">
				EQ-scaffolded drill queue
			</p>
		</div>
	</header>

	<div class="pd-os-deck__well adaptive-homework__body tw-flex tw-min-w-0 tw-flex-col tw-gap-4">
	{#if isLoading}
		<div class="adaptive-homework__status tw-flex tw-items-center tw-justify-center tw-py-8" role="status">
			<span
				class="tw-font-mono tw-text-[10px] tw-tracking-wide tw-text-teal-500/40 tw-animate-pulse"
			>
				[ SYNCING TACTICAL DATA... ]
			</span>
		</div>
	{:else if !focusAttributeId}
		<div class="adaptive-homework__status tw-py-6 tw-text-center" role="status">
			<p class="adaptive-homework__status-msg tw-m-0 tw-font-mono tw-text-[10px] tw-tracking-wide tw-text-white/20">
				[ AWAITING PLAYER PROFILE ]
			</p>
		</div>
	{:else}
			<p class="tw-m-0 tw-min-w-0 tw-font-mono tw-text-[9px] tw-leading-relaxed tw-tracking-wide tw-text-teal-400/50 tw-break-words">
				[ ADAPTIVE FOCUS · NOT A COACH CHALLENGE ]
			</p>

			<div class="tw-flex tw-min-w-0 tw-items-center tw-justify-between tw-gap-3">
				<span class="tw-min-w-0 tw-truncate tw-font-mono tw-text-xs tw-text-white/60 tw-tracking-wide">
					{activeAttribute?.name ?? focusAttributeId}
				</span>
				<span class="tw-shrink-0 tw-font-mono tw-text-[9px] tw-text-white/30 tw-tracking-wide">
					Weakest attribute
				</span>
			</div>

			{#if recentFrustration === 'high'}
				<div
					class="tw-min-w-0 tw-rounded-lg tw-border tw-border-slate-700/70 tw-bg-slate-800 tw-py-1.5 tw-px-3"
				>
					<p class="tw-m-0 tw-font-mono tw-text-[9px] tw-leading-relaxed tw-tracking-wide tw-text-slate-400 tw-break-words">
						[ SCAFFOLDING ACTIVE: EQ PROTECTION MODE ]
					</p>
				</div>
			{/if}

			{#if suggestedDrill}
				<div
					class="tw-flex tw-min-w-0 tw-max-w-full tw-flex-col tw-gap-3 tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-800/60 tw-bg-[#020202] tw-p-4"
				>
					<div class="tw-flex tw-min-w-0 tw-items-start tw-justify-between tw-gap-3">
						<span class="tw-min-w-0 tw-font-mono tw-text-xs tw-text-white/70 tw-leading-relaxed tw-break-words">
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
				<div class="adaptive-homework__status tw-py-6 tw-text-center" role="status">
					<p class="adaptive-homework__status-msg tw-m-0 tw-font-mono tw-text-[10px] tw-leading-relaxed tw-tracking-wide tw-text-white/20">
						[ NO DRILLS FOUND FOR TARGET ]
					</p>
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
				Log on Train
			</button>
	{/if}
	</div>
</section>
