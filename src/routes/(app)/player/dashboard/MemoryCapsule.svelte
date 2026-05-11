<script>
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { DEFAULT_SPORT_CONFIG } from '$lib/config/sports.js';

	/**
	 * @typedef {{
	 *   attributeId: string,
	 *   label: string,
	 *   hexColor: string,
	 *   currentCount: number,
	 *   pastCount: number,
	 *   delta: number,
	 *   positive: boolean
	 * }} DeltaRow
	 */

	/** @type {DeltaRow[] | null} */
	let capsuleData = $state(null);
	let isLoading = $state(true);
	/** @type {string | null} */
	let error = $state(null);

	$effect(() => {
		const uid = authStore.user?.uid;
		if (!uid) {
			isLoading = false;
			return;
		}

		let cancelled = false;

		async function fetchData() {
			isLoading = true;
			error = null;

			try {
				const now = new Date();
				const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				const thirtyThreeDaysAgo = new Date(now.getTime() - 33 * 24 * 60 * 60 * 1000);
				const twentySevenDaysAgo = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000);

				const baseRef = collection(db, 'drill_completions');

				const [recentSnap, pastSnap] = await Promise.all([
					getDocs(
						query(
							baseRef,
							where('playerUid', '==', uid),
							where('loggedAt', '>=', sevenDaysAgo)
						)
					),
					getDocs(
						query(
							baseRef,
							where('playerUid', '==', uid),
							where('loggedAt', '>=', thirtyThreeDaysAgo),
							where('loggedAt', '<=', twentySevenDaysAgo)
						)
					),
				]);

				if (cancelled) return;

				/** @type {Record<string, number>} */
				const currentCounts = {};
				/** @type {Record<string, number>} */
				const pastCounts = {};

				recentSnap.docs.forEach((d) => {
					const attrId = String(d.data().attributeId ?? '');
					if (attrId) currentCounts[attrId] = (currentCounts[attrId] ?? 0) + 1;
				});

				pastSnap.docs.forEach((d) => {
					const attrId = String(d.data().attributeId ?? '');
					if (attrId) pastCounts[attrId] = (pastCounts[attrId] ?? 0) + 1;
				});

				/** @type {DeltaRow[]} */
				const deltaSummary = DEFAULT_SPORT_CONFIG.attributes.map((attr) => {
					const currentCount = currentCounts[attr.id] ?? 0;
					const pastCount = pastCounts[attr.id] ?? 0;
					const delta = currentCount - pastCount;
					return {
						attributeId: attr.id,
						label: attr.name,
						hexColor: attr.hexColor,
						currentCount,
						pastCount,
						delta,
						positive: delta > 0,
					};
				});

				capsuleData = deltaSummary;
			} catch (err) {
				if (!cancelled) {
					console.error('[MemoryCapsule] fetch error:', err);
					error = 'QUERY FAILED';
				}
			} finally {
				if (!cancelled) isLoading = false;
			}
		}

		fetchData();
		return () => {
			cancelled = true;
		};
	});

	const hasData = $derived(
		capsuleData !== null && capsuleData.some((r) => r.currentCount > 0 || r.pastCount > 0)
	);
</script>

<div
	class="tw-flex tw-flex-col tw-gap-5 tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#00f0ff]/20 tw-rounded-xl tw-p-6"
>
	<!-- Header -->
	<div class="tw-flex tw-flex-col tw-gap-1">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/60">
			[ // 30-DAY MEMORY CAPSULE ]
		</span>
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ffcc00]/60">
			[ VERTICAL TRAJECTORY ANALYSIS — PAST SELF ONLY ]
		</span>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-[#00f0ff]/10"></div>

	{#if isLoading}
		<div class="tw-flex tw-items-center tw-justify-center tw-py-10">
			<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-w-full">
				<div
					class="tw-w-full tw-h-1 tw-bg-[#00f0ff]/10 tw-rounded-full tw-overflow-hidden tw-relative"
				>
					<div class="scan-bar tw-absolute tw-inset-y-0 tw-w-1/3 tw-bg-[#00f0ff]/60 tw-rounded-full">
					</div>
				</div>
				<span
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-animate-pulse"
				>
					[ SCANNING TEMPORAL ARCHIVE... ]
				</span>
			</div>
		</div>
	{:else if error}
		<div class="tw-flex tw-items-center tw-justify-center tw-py-8">
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-red-400/60">
				[ ⚠ {error} ]
			</span>
		</div>
	{:else if !hasData}
		<div
			class="tw-flex tw-items-center tw-justify-center tw-py-8 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-white/5"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/20">
				[ NO HISTORICAL DATA — KEEP TRAINING ]
			</span>
		</div>
	{:else}
		<div class="tw-grid tw-grid-cols-1 tw-gap-3">
			{#each capsuleData ?? [] as row (row.attributeId)}
				<div
					class="tw-flex tw-flex-col tw-gap-2 tw-p-3 tw-rounded-xl tw-bg-[#020202] tw-border tw-border-white/5"
				>
					<!-- Attribute Name -->
					<span
						class="tw-font-mono tw-text-[10px] tw-tracking-widest"
						style="color: {row.hexColor}"
					>
						{row.label.toUpperCase()}
					</span>

					<!-- Rep Counts -->
					<div class="tw-flex tw-gap-4 tw-flex-wrap">
						<span class="tw-font-mono tw-text-[9px] tw-text-white/40">
							30 DAYS AGO:&nbsp;<span class="tw-text-white/60">{row.pastCount} REPS</span>
						</span>
						<span class="tw-font-mono tw-text-[9px] tw-text-white/40">
							RECENT:&nbsp;<span class="tw-text-white/60">{row.currentCount} REPS</span>
						</span>
					</div>

					<!-- Delta Badge -->
					{#if row.delta > 0}
						<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#00ff66]">
							[▲ +{row.delta} VERTICAL POSITIVE]
						</span>
					{:else if row.delta < 0}
						<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-red-400">
							[▼ {row.delta}]
						</span>
					{:else}
						<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/50">
							[→ STEADY]
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Privacy Lockout Footer -->
	<div class="tw-pt-2 tw-border-t tw-border-white/5">
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/20">
			[ ⚠ PEER COMPARISON DISABLED — NEXUS COMMAND PROTOCOL ]
		</span>
	</div>
</div>

<style>
	@keyframes scan {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	.scan-bar {
		animation: scan 1.5s ease-in-out infinite;
	}
</style>
