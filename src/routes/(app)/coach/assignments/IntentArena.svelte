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
		mutationError = '',
		onCancel = (_intentId: string) => {},
		onExtend = (_intentId: string, _days: number) => {},
	} = $props();

	const MAX_PILLS = 12;
</script>

<div class="tw-flex tw-flex-col tw-gap-3 tw-w-full">

	<!-- Mutation error banner -->
	{#if mutationError}
		<div
			class="tw-w-full tw-px-4 tw-py-2 tw-rounded-lg tw-border tw-border-[#ff3040]/40 tw-bg-[#ff3040]/10
			       tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff3040] tw-uppercase"
		>
			[ ERR ] {mutationError}
		</div>
	{/if}

	<!-- Loading pulse -->
	{#if isLoading && intents.length === 0}
		<div class="tw-flex tw-flex-col tw-gap-2 tw-w-full">
			{#each [0, 1, 2] as i (i)}
				<div
					class="tw-w-full tw-h-28 tw-rounded-xl tw-border tw-border-[#00f0ff]/10 tw-bg-[#05050a]
					       tw-animate-pulse"
				></div>
			{/each}
		</div>

	<!-- Empty state -->
	{:else if !isLoading && intents.length === 0}
		<div
			class="tw-w-full tw-flex tw-items-center tw-justify-center tw-py-16
			       tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/30 tw-uppercase"
		>
			[ NO ACTIVE TACTICAL INTENTS ]
		</div>

	<!-- Intent card list -->
	{:else}
		{#each intents as intent (intent.intentId)}
			{@const scopeLabel = intent.scope === 'team' ? 'SQUAD' : 'PLAYERS'}
			{@const visibleRows = intent.rosterRows.slice(0, MAX_PILLS)}
			{@const extraCount = Math.max(0, intent.rosterRows.length - MAX_PILLS)}

			<div
				class="tw-w-full tw-rounded-xl tw-border tw-flex tw-flex-col tw-gap-3 tw-p-4"
				style="background:#05050a; border-color:rgba(0,240,255,0.12);"
			>
				<!-- Header row -->
				<div class="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
					<!-- Attribute name -->
					<span
						class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-font-bold tw-uppercase"
						style="color:{intent.attributeHexColor};"
					>
						{intent.attributeName}
					</span>

					<!-- Scope pill -->
					<span
						class="tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase
						       tw-border tw-border-[#00f0ff]/25 tw-text-[#00f0ff]/70"
					>
						{scopeLabel}
					</span>

					<!-- Days remaining -->
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase tw-ml-auto">
						{intent.daysRemaining}d remaining
					</span>

					<!-- Priority badge -->
					<span
						class="tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase
						       tw-border tw-border-[#a855f7]/30 tw-text-[#a855f7]/70"
					>
						P{intent.priority}
					</span>
				</div>

				<!-- Progress bar -->
				<div class="tw-w-full tw-flex tw-flex-col tw-gap-1">
					<div class="tw-flex tw-items-center tw-justify-between">
						<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase">
							overall progress
						</span>
						<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]">
							{intent.overallProgressPct}%
						</span>
					</div>
					<div
						class="tw-w-full tw-h-1.5 tw-rounded-full tw-overflow-hidden"
						style="background:rgba(0,240,255,0.15);"
					>
						<div
							class="tw-h-full tw-rounded-full tw-transition-all tw-duration-500"
							style="width:{intent.overallProgressPct}%; background:#00f0ff;"
						></div>
					</div>
				</div>

				<!-- Fulfillment stat -->
				<div class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase">
					{#if intent.fulfilledCount > 0}
						<span style="color:#39ff14;">
							{intent.fulfilledCount} / {intent.targetCount} OPERATIVES FULFILLED
						</span>
					{:else}
						<span class="tw-text-[#00f0ff]/25">
							0 / {intent.targetCount} OPERATIVES FULFILLED
						</span>
					{/if}
				</div>

				<!-- Roster heat-map pills -->
				{#if intent.rosterRows.length > 0}
					<div class="tw-flex tw-flex-wrap tw-gap-1.5">
						{#each visibleRows as row (row.uid)}
							<div
								class="tw-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-rounded
								       tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase"
								style={row.fulfilled
									? 'border:1px solid #39ff14; color:#39ff14; box-shadow:0 0 6px rgba(57,255,20,0.35);'
									: 'border:1px solid rgba(0,240,255,0.15); color:rgba(0,240,255,0.4);'}
							>
								<span>{row.playerName.split(' ')[0]}</span>
								<span class="tw-opacity-60">{row.progressPct}%</span>
							</div>
						{/each}
						{#if extraCount > 0}
							<div
								class="tw-flex tw-items-center tw-px-2 tw-py-0.5 tw-rounded
								       tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase
								       tw-border tw-border-[#00f0ff]/10 tw-text-[#00f0ff]/30"
							>
								+{extraCount} more
							</div>
						{/if}
					</div>
				{/if}

				<!-- Footer actions -->
				<div class="tw-flex tw-items-center tw-gap-2 tw-pt-1 tw-border-t tw-border-[#00f0ff]/8">
					<button
						class="tw-pointer-events-auto tw-px-3 tw-py-1 tw-rounded tw-font-mono tw-text-[9px]
						       tw-tracking-widest tw-uppercase tw-border tw-border-[#ff3040]/30 tw-text-[#ff3040]/70
						       tw-transition-all hover:tw-border-[#ff3040]/60 hover:tw-text-[#ff3040]
						       hover:tw-bg-[#ff3040]/10 active:tw-scale-95"
						onclick={() => onCancel(intent.intentId)}
					>
						CANCEL
					</button>
					<button
						class="tw-pointer-events-auto tw-px-3 tw-py-1 tw-rounded tw-font-mono tw-text-[9px]
						       tw-tracking-widest tw-uppercase tw-border tw-border-[#00f0ff]/25 tw-text-[#00f0ff]/60
						       tw-transition-all hover:tw-border-[#00f0ff]/60 hover:tw-text-[#00f0ff]
						       hover:tw-bg-[#00f0ff]/8 active:tw-scale-95"
						onclick={() => onExtend(intent.intentId, 7)}
					>
						EXTEND +7d
					</button>
				</div>
			</div>
		{/each}
	{/if}

</div>
