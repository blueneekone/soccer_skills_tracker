<script lang="ts">
	interface RosterRow {
		uid: string;
		playerName: string;
		email: string;
		currentXp: number;
		progressPct: number;
		fulfilled: boolean;
	}

	interface EnrichedIntent {
		intentId: string;
		targetAttributeId: string;
		requiredXp: number;
		attributeName: string;
		attributeHexColor: string;
		scope: 'team' | 'players';
		status: string;
		priority: number;
		daysRemaining: number;
		overallProgressPct: number;
		fulfilledCount: number;
		targetCount: number;
		rosterRows: RosterRow[];
	}

	let {
		intents = [] as EnrichedIntent[],
		isLoading = false,
		isRefreshing = false,
		cancellingIntentIds = [] as string[],
		mutationError = '',
		mutationSuccess = '',
		onCancel = (_intentId: string) => {},
		onExtend = (_intentId: string, _days: number) => {},
		onRefresh = () => {},
	} = $props();

	const MAX_PILLS = 12;

	const duplicateAttributeWarnings = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const intent of intents) {
			const id = intent.targetAttributeId?.trim();
			if (!id) continue;
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		return [...counts.entries()]
			.filter(([, count]) => count > 1)
			.map(([attributeId, count]) => ({
				attributeId,
				count,
				label:
					intents.find((i) => i.targetAttributeId === attributeId)?.attributeName ?? attributeId,
			}));
	});
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-w-full tw-font-mono">
	<!-- Toolbar / Live Radar Header -->
	<div class="tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-3.5">
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-w-2 tw-h-2 tw-bg-[#daff0a] tw-shadow-[0_0_8px_#daff0a]"></span>
			<span class="tw-text-xs tw-font-black tw-tracking-widest tw-text-white tw-uppercase">
				ACTIVE TACTICAL CARTRIDGES ({intents.length})
			</span>
		</div>
		<button
			type="button"
			class="tw-px-3 tw-py-1 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-xs tw-font-bold tw-text-[#14b8a6] hover:tw-border-[#14b8a6] tw-transition-all active:tw-scale-95 disabled:tw-opacity-40"
			disabled={isRefreshing || isLoading}
			onclick={() => onRefresh()}
		>
			{isRefreshing ? 'SYNCING RADAR…' : '↻ REFRESH INTENTS'}
		</button>
	</div>

	<!-- Duplicate attribute warning -->
	{#if duplicateAttributeWarnings.length > 0}
		<div
			class="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-[#fbbf24] tw-bg-[#fbbf24]/10 tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-uppercase"
			role="status"
		>
			{#each duplicateAttributeWarnings as dup (dup.attributeId)}
				<p class="tw-m-0">[ WARN ] {dup.count} active intents target {dup.label} — players see separate mission rows.</p>
			{/each}
		</div>
	{/if}

	<!-- Mutation error banner -->
	{#if mutationError}
		<div
			class="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-red-500 tw-bg-red-950/60 tw-text-xs tw-text-red-300 tw-font-bold tw-uppercase"
			role="alert"
		>
			[ ERR ] {mutationError}
		</div>
	{/if}

	<!-- Cancel / mutation success toast -->
	{#if mutationSuccess}
		<div
			class="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-emerald-500 tw-bg-emerald-950/60 tw-text-xs tw-text-emerald-300 tw-font-bold tw-uppercase"
			role="status"
		>
			[ OK ] {mutationSuccess}
		</div>
	{/if}

	<!-- Loading pulse -->
	{#if isLoading && intents.length === 0}
		<div class="tw-flex tw-flex-col tw-gap-3 tw-w-full">
			{#each [0, 1, 2] as i (i)}
				<div class="tw-w-full tw-h-36 tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-animate-pulse"></div>
			{/each}
		</div>

	<!-- Empty state -->
	{:else if !isLoading && intents.length === 0}
		<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-16 tw-px-6 tw-bg-[#0f172a] tw-border tw-border-dashed tw-border-[#334155] tw-text-center">
			<span class="tw-text-sm tw-font-black tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">
				NO ACTIVE TACTICAL INTENTS
			</span>
			<p class="tw-text-xs tw-text-slate-500 tw-max-w-md tw-m-0">
				Use the dispatch workbench on the left to deploy homework assignments or combine test bounties to your squad.
			</p>
		</div>

	<!-- Intent card list -->
	{:else}
		{#each intents as intent (intent.intentId)}
			{@const scopeLabel = intent.scope === 'team' ? 'FULL SQUAD' : 'TARGETED ATHLETES'}
			{@const visibleRows = intent.rosterRows.slice(0, MAX_PILLS)}
			{@const extraCount = Math.max(0, intent.rosterRows.length - MAX_PILLS)}

			<div class="tw-w-full tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-5 tw-shadow-xl tw-space-y-4">
				<!-- Header row -->
				<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-flex-wrap tw-gap-2">
					<div class="tw-flex tw-items-center tw-gap-2.5">
						<span
							class="tw-w-3 tw-h-3 tw-rounded-full tw-shrink-0"
							style="background: {intent.attributeHexColor || '#14b8a6'}; box-shadow: 0 0 8px {intent.attributeHexColor || '#14b8a6'};"
						></span>
						<span class="tw-text-sm tw-font-black tw-tracking-wider tw-text-white tw-uppercase">
							{intent.attributeName}
						</span>
						<span class="tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#14b8a6]">
							{scopeLabel}
						</span>
					</div>

					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-text-xs tw-font-bold tw-text-[#daff0a]">
							{intent.daysRemaining}D REMAINING
						</span>
						<span class="tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5 tw-bg-[#020617] tw-border tw-border-purple-500/40 tw-text-purple-400">
							P{intent.priority}
						</span>
					</div>
				</div>

				<!-- Progress bar with Geist Mono readout -->
				<div class="tw-space-y-1.5">
					<div class="tw-flex tw-items-center tw-justify-between tw-text-xs">
						<span class="tw-text-slate-400 tw-uppercase">Squad Fulfillment Progress</span>
						<span class="tw-text-sm tw-font-black tw-text-[#daff0a]">{intent.overallProgressPct}%</span>
					</div>
					<div class="tw-w-full tw-h-2 tw-bg-[#000000] tw-border tw-border-[#334155]">
						<div
							class="tw-h-full tw-bg-[#daff0a] tw-shadow-[0_0_10px_#daff0a] tw-transition-all tw-duration-500"
							style="width: {intent.overallProgressPct}%;"
						></div>
					</div>
				</div>

				<!-- Fulfillment count -->
				<div class="tw-text-xs tw-font-bold tw-uppercase">
					{#if intent.fulfilledCount > 0}
						<span class="tw-text-emerald-400">
							✓ {intent.fulfilledCount} OF {intent.targetCount} OPERATIVES COMPLETED
						</span>
					{:else}
						<span class="tw-text-slate-400">
							0 OF {intent.targetCount} OPERATIVES COMPLETED
						</span>
					{/if}
				</div>

				<!-- Roster heat-map pills -->
				{#if intent.rosterRows.length > 0}
					<div class="tw-flex tw-flex-wrap tw-gap-1.5 tw-pt-1">
						{#each visibleRows as row (row.uid)}
							<div
								class="tw-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-1 tw-border tw-text-xs tw-uppercase {row.fulfilled ? 'tw-bg-emerald-950/40 tw-border-emerald-500 tw-text-emerald-300' : 'tw-bg-[#020617] tw-border-[#334155] tw-text-slate-400'}"
							>
								<span class="tw-font-bold">{row.playerName.split(' ')[0]}</span>
								<span class="tw-text-[10px] tw-opacity-80">{row.progressPct}%</span>
							</div>
						{/each}
						{#if extraCount > 0}
							<div class="tw-flex tw-items-center tw-px-2.5 tw-py-1 tw-border tw-border-[#334155] tw-bg-[#020617] tw-text-xs tw-text-slate-500">
								+{extraCount} more
							</div>
						{/if}
					</div>
				{/if}

				<!-- Footer actions -->
				<div class="tw-flex tw-items-center tw-justify-between tw-pt-3 tw-border-t tw-border-[#334155]">
					<button
						type="button"
						class="tw-px-3 tw-py-1.5 tw-bg-[#020617] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6] hover:tw-text-black tw-text-xs tw-font-bold tw-uppercase tw-transition-all active:tw-scale-95"
						onclick={() => onExtend(intent.intentId, 7)}
					>
						+ EXTEND 7 DAYS
					</button>

					<button
						type="button"
						class="tw-px-3 tw-py-1.5 tw-bg-red-950/40 tw-border tw-border-red-600/60 tw-text-red-300 hover:tw-bg-red-600 hover:tw-text-white tw-text-xs tw-font-bold tw-uppercase tw-transition-all active:tw-scale-95 disabled:tw-opacity-40"
						disabled={cancellingIntentIds.includes(intent.intentId)}
						onclick={() => onCancel(intent.intentId)}
					>
						{cancellingIntentIds.includes(intent.intentId) ? 'CANCELLING…' : '✕ CANCEL INTENT'}
					</button>
				</div>
			</div>
		{/each}
	{/if}
</div>
