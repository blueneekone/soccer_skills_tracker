<script>
	import {
		collection,
		query,
		where,
		onSnapshot,
		getDocs,
		orderBy,
		doc,
		setDoc
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { getRpgSportConfig } from '$lib/config/sports.js';
	import TacticalDrillBoard from '$lib/components/tactical/TacticalDrillBoard.svelte';

	/** @typedef {{ id: string; targetAttributeId: string; requiredXp: number; teamId: string }} Assignment */
	/** @typedef {{ id: string; title: string; attributeId: string; tier: string; mediaType: string; payload?: string }} Drill */

	/** @type {Assignment[]} */
	let assignments = $state([]);
	/** @type {Drill | null} */
	let suggestedDrill = $state(null);
	let isLoading = $state(true);

	const playerProfile = $derived(/** @type {Record<string, unknown>} */ (authStore.userProfile));
	const playerTeamId = $derived(String(playerProfile?.teamId ?? ''));
	const recentFrustration = $derived(String(playerProfile?.recentFrustration ?? 'low'));
	const playerTier = $derived(playerProfile?.calculatedTier ? String(playerProfile.calculatedTier) : 'beginner');

	const activeAssignment = $derived(/** @type {Assignment | null} */ (assignments[0] ?? null));

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

	// Lazy migration write-back: if calculatedTier is missing, patch Firestore non-blocking
	$effect(() => {
		const profile = playerProfile;
		const uid = authStore.user?.uid;
		if (!profile || !uid || profile.calculatedTier) return;
		setDoc(doc(db, 'users', uid), { calculatedTier: 'beginner' }, { merge: true }).catch(() => {});
	});

	// Real-time subscription to active team assignments
	$effect(() => {
		const teamId = playerTeamId;
		if (!teamId) {
			assignments = [];
			isLoading = false;
			return;
		}

		isLoading = true;
		const q = query(collection(db, 'team_assignments'), where('teamId', '==', teamId));

		const unsub = onSnapshot(
			q,
			(snap) => {
				assignments = snap.docs.map((d) => ({ id: d.id, .../** @type {any} */ (d.data()) }));
				isLoading = false;
			},
			(err) => {
				console.error('[AdaptiveHomework] assignments snapshot error:', err);
				isLoading = false;
			}
		);

		return unsub;
	});

	// Query global_drills when active assignment or frustration changes
	$effect(() => {
		const assignment = activeAssignment;
		const frustration = recentFrustration;

		if (!assignment) {
			suggestedDrill = null;
			return;
		}

		let cancelled = false;

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
</script>

<div
	class="vanguard-surface tw-flex tw-flex-col tw-gap-5 tw-p-6"
>
	<!-- Header -->
	<div class="tw-flex tw-flex-col tw-gap-0.5">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/60">
			[ // ADAPTIVE HOMEWORK ]
		</span>
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/30">
			[ EQ-SCAFFOLDED DRILL QUEUE ]
		</span>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-[#00f0ff]/10"></div>

	{#if isLoading}
		<div class="tw-flex tw-items-center tw-justify-center tw-py-10">
			<span
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-animate-pulse"
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
					class="tw-w-full tw-py-1.5 tw-px-3 tw-rounded-lg tw-border tw-border-[#9d00ff]/40 tw-bg-[#9d00ff]/10"
				>
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#9d00ff]">
						[ SCAFFOLDING ACTIVE: EQ PROTECTION MODE ]
					</span>
				</div>
			{/if}

			<!-- Suggested drill card -->
			{#if suggestedDrill}
				<div
					class="tw-flex tw-flex-col tw-gap-3 tw-p-4 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-[#00f0ff]/10"
				>
					<div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
						<span class="tw-font-mono tw-text-xs tw-text-white/70 tw-leading-relaxed">
							{suggestedDrill.title}
						</span>
						<div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-shrink-0">
							<span
								class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-px-1.5 tw-py-0.5 tw-rounded tw-bg-[#00f0ff]/10 tw-text-[#00f0ff]/60 tw-border tw-border-[#00f0ff]/20"
							>
								{suggestedDrill.mediaType === 'tactical_svg' ? '[ SVG ]' : '[ YT ]'}
							</span>
							<span class="tw-font-mono tw-text-[9px] tw-text-white/30 tw-uppercase tw-tracking-wider">
								{suggestedDrill.tier}
							</span>
						</div>
					</div>

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

			<!-- XP progress bar -->
			<div class="tw-flex tw-flex-col tw-gap-1.5">
				<div class="tw-flex tw-justify-between tw-items-center">
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30">
						XP PROGRESS
					</span>
					<span class="tw-font-mono tw-text-[9px] tw-text-[#00f0ff]/60">{xpProgressPct}%</span>
				</div>
				<div class="tw-w-full tw-h-1 tw-bg-[#00f0ff]/20 tw-rounded-full tw-overflow-hidden">
					<div
						class="tw-h-full tw-bg-[#00f0ff] tw-rounded-full tw-transition-all tw-duration-700"
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
