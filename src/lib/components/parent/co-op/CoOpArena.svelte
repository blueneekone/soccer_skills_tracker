<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import type { BountyDoc } from '$lib/types/bounty.js';
	import { BOOST_PRESETS } from '$lib/types/bounty.js';

	let { engine }: { engine: CoOpEngine } = $props();

	// Funding source link flow
	let availableSources = $state<Array<{ id: string; label: string; method: string }>>([]);
	let loadingSources = $state(false);
	let selectedSourceId = $state('');
	let linkingSource = $state(false);
	let linkError = $state('');

	async function fetchSources() {
		loadingSources = true;
		try {
			availableSources = await engine.listFundingSources();
		} finally {
			loadingSources = false;
		}
	}

	async function handleLinkSource() {
		if (!selectedSourceId || linkingSource) return;
		linkingSource = true;
		linkError = '';
		try {
			await engine.linkFundingSource(selectedSourceId);
			availableSources = [];
			selectedSourceId = '';
		} catch (e) {
			linkError = e instanceof Error ? e.message : 'LINK FAILED.';
		} finally {
			linkingSource = false;
		}
	}

	function statusColor(status: BountyDoc['status']): string {
		switch (status) {
			case 'active':
				return 'tw-text-[#14b8a6] tw-border-[#14b8a6]/40 tw-bg-[#14b8a6]/10';
			case 'verified':
				return 'tw-text-[#ffcc00] tw-border-[#ffcc00]/40 tw-bg-[#ffcc00]/10';
			case 'paid':
				return 'tw-text-[#00ff66] tw-border-[#00ff66]/40 tw-bg-[#00ff66]/10';
			case 'expired':
				return 'tw-text-[#888] tw-border-[#888]/30 tw-bg-[#888]/5';
			case 'voided':
				return 'tw-text-[#888] tw-border-[#888]/30 tw-bg-[#888]/5';
			case 'failed':
				return 'tw-text-[#ff0055] tw-border-[#ff0055]/40 tw-bg-[#ff0055]/10';
			default:
				return 'tw-text-[#aaa] tw-border-[#aaa]/20 tw-bg-transparent';
		}
	}

	function criterionBadgeColor(type: BountyDoc['criterion']['type']): string {
		switch (type) {
			case 'reps_count':
				return 'tw-text-[#14b8a6]/80 tw-border-[#14b8a6]/20 tw-bg-[#14b8a6]/5';
			case 'workout_volume_kj':
				return 'tw-text-[#a78bfa]/80 tw-border-[#a78bfa]/20 tw-bg-[#a78bfa]/5';
			case 'streak_length':
				return 'tw-text-[#fb923c]/80 tw-border-[#fb923c]/20 tw-bg-[#fb923c]/5';
			case 'gpa_threshold':
				return 'tw-text-[#34d399]/80 tw-border-[#34d399]/20 tw-bg-[#34d399]/5';
			case 'mastery_node_unlock':
				return 'tw-text-[#f472b6]/80 tw-border-[#f472b6]/20 tw-bg-[#f472b6]/5';
			default:
				return 'tw-text-[#aaa] tw-border-[#aaa]/20 tw-bg-transparent';
		}
	}

	function criterionLabel(type: BountyDoc['criterion']['type']): string {
		switch (type) {
			case 'reps_count':
				return 'REPS';
			case 'workout_volume_kj':
				return 'VOLUME';
			case 'streak_length':
				return 'STREAK';
			case 'gpa_threshold':
				return 'GPA';
			case 'mastery_node_unlock':
				return 'MASTERY';
			case 'cv_verified_drill':
				return 'CV-DRILL';
			default:
				return 'UNKNOWN';
		}
	}

	function formatExpiry(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
		} catch {
			return iso;
		}
	}

	const displayBounties = $derived([...engine.activeBounties, ...engine.verifiedBounties]);
</script>

<div
	class="tw-w-full tw-h-full tw-backdrop-blur-xl tw-bg-[#040f16]/70 tw-border tw-border-[#14b8a6]/15 tw-rounded-3xl tw-p-0 tw-overflow-hidden"
	style="box-shadow: 0 0 40px rgba(20, 184, 166,0.06), 0 0 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(20, 184, 166,0.08);"
>
	<!-- BENTO GRID -->
	<div
		class="tw-grid tw-h-full"
		style="grid-template-columns: clamp(320px, 65%, 820px) 1fr; grid-template-rows: 1fr 1fr; min-height: clamp(600px, 80vh, 960px);"
	>
		<!-- ─── CELL 1: BOUNTY BOARD (left, full height) ──────────────────── -->
		<div
			class="tw-row-span-2 tw-flex tw-flex-col tw-gap-0 tw-border-r tw-border-[#14b8a6]/10"
		>
			<!-- Cell header -->
			<div class="tw-px-6 tw-pt-6 tw-pb-4 tw-border-b tw-border-[#14b8a6]/10">
				<div class="tw-flex tw-items-center tw-gap-2">
					<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]/40 tw-tracking-widest">
						//
					</span>
					<span class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
						BOUNTY BOARD
					</span>
					<span
						class="tw-ml-auto tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase"
					>
						{displayBounties.length} ACTIVE
					</span>
				</div>
			</div>

			<!-- Bounty list -->
			<div class="tw-flex-1 tw-overflow-y-auto tw-flex tw-flex-col tw-gap-3 tw-p-6">
				{#if displayBounties.length === 0}
					<div
						class="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-dashed tw-border-[#14b8a6]/10 tw-py-16"
					>
						<div class="tw-flex tw-flex-col tw-items-center tw-gap-3">
							<div
								class="tw-w-8 tw-h-8 tw-rounded-full tw-border tw-border-[#14b8a6]/20 tw-flex tw-items-center tw-justify-center"
							>
								<span class="tw-font-mono tw-text-[14px] tw-text-[#14b8a6]/30">◎</span>
							</div>
							<span
								class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/25 tw-uppercase"
							>
								[ NO ACTIVE BOUNTIES — DEPLOY ONE ]
							</span>
						</div>
					</div>
				{:else}
					{#each displayBounties as bounty (bounty.id)}
						{@const progress = engine.bountyProgress(bounty)}
						{@const isActive = bounty.status === 'active'}
						<div
							class="tw-rounded-xl tw-bg-[#020202]/60 tw-border tw-border-[#14b8a6]/10 tw-p-4 tw-flex tw-flex-col tw-gap-3 tw-transition-all tw-duration-200 hover:tw-border-[#14b8a6]/25 hover:tw-shadow-[0_0_20px_rgba(20, 184, 166,0.06)]"
						>
							<!-- Bounty top row -->
							<div class="tw-flex tw-items-start tw-gap-3">
								<div class="tw-flex-1 tw-min-w-0 tw-flex tw-flex-col tw-gap-1">
									<span
										class="tw-font-mono tw-text-[12px] tw-tracking-wider tw-text-[#e0e0e0] tw-uppercase tw-leading-tight tw-truncate"
									>
										{bounty.title}
									</span>
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
									>
										→ {bounty.playerEmail}
									</span>
								</div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-flex-shrink-0">
									<!-- Criterion badge -->
									<span
										class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-uppercase tw-border tw-rounded tw-px-2 tw-py-0.5 {criterionBadgeColor(bounty.criterion.type)}"
									>
										{criterionLabel(bounty.criterion.type)}
									</span>
									<!-- Status badge -->
									<span
										class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-uppercase tw-border tw-rounded tw-px-2 tw-py-0.5 {statusColor(bounty.status)}"
									>
										{bounty.status}
									</span>
								</div>
							</div>

							<!-- Progress bar -->
							{#if bounty.progressTarget && bounty.progressTarget > 0}
								<div class="tw-flex tw-flex-col tw-gap-1">
									<div
										class="tw-w-full tw-h-1.5 tw-rounded-full tw-bg-[#14b8a6]/10 tw-overflow-hidden"
									>
										<div
											class="tw-h-full tw-rounded-full tw-bg-[#14b8a6] tw-transition-all tw-duration-500"
											style="width: {progress}%; box-shadow: 0 0 8px rgba(20, 184, 166,0.6);"
										></div>
									</div>
									<div class="tw-flex tw-justify-between tw-items-center">
										<span
											class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
										>
											{bounty.progressCurrent ?? 0} / {bounty.progressTarget}
											{bounty.progressUnit ?? ''}
										</span>
										<span
											class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/60"
										>
											{progress}%
										</span>
									</div>
								</div>
							{/if}

							<!-- Bottom row: reward + expiry + void -->
							<div class="tw-flex tw-items-center tw-gap-3 tw-pt-1 tw-border-t tw-border-[#14b8a6]/8">
								<span
									class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#ffcc00] tw-font-bold"
								>
									${((bounty.rewardCents ?? 0) / 100).toFixed(2)}
								</span>
								<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase">
									USD
								</span>
								<span class="tw-flex-1"></span>
								<span
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase"
								>
									EXP: {formatExpiry(bounty.expiresAt)}
								</span>
								{#if isActive}
									<button
										onclick={() => engine.voidBounty(bounty.id!)}
										disabled={engine.mutating}
										class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-uppercase tw-border tw-border-[#ff0055]/30 tw-text-[#ff0055]/70 tw-bg-[#ff0055]/5 tw-rounded tw-px-2.5 tw-py-1 tw-transition-all tw-duration-150 hover:tw-border-[#ff0055]/60 hover:tw-text-[#ff0055] hover:tw-bg-[#ff0055]/10 disabled:tw-opacity-30 disabled:tw-cursor-not-allowed"
									>
										VOID
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- ─── CELL 2: BOOST CONSOLE (right, top half) ────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-0 tw-border-b tw-border-[#14b8a6]/10">
			<!-- Cell header -->
			<div class="tw-px-5 tw-pt-5 tw-pb-4 tw-border-b tw-border-[#14b8a6]/10">
				<div class="tw-flex tw-items-center tw-gap-2">
					<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]/40 tw-tracking-widest">
						//
					</span>
					<span class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
						BOOST CONSOLE
					</span>
				</div>
			</div>

			<!-- Children list -->
			<div class="tw-flex-1 tw-overflow-y-auto tw-flex tw-flex-col tw-gap-3 tw-p-5">
				{#if engine.householdChildren.length === 0}
					<div class="tw-flex tw-items-center tw-justify-center tw-py-8">
						<span
							class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/25 tw-uppercase"
						>
							[ NO CHILDREN LINKED ]
						</span>
					</div>
				{:else}
					{#each engine.householdChildren as child (child.email)}
						<div
							class="tw-rounded-xl tw-bg-[#020202]/60 tw-border tw-border-[#14b8a6]/10 tw-p-4 tw-flex tw-flex-col tw-gap-3"
						>
							<!-- Child info row -->
							<div class="tw-flex tw-items-start tw-justify-between tw-gap-2">
								<div class="tw-flex tw-flex-col tw-gap-0.5 tw-min-w-0">
									<span
										class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-uppercase tw-truncate"
									>
										{child.displayName}
									</span>
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/35 tw-uppercase tw-truncate"
									>
										{child.email}
									</span>
								</div>
								<div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-flex-shrink-0">
									<span
										class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ffcc00] tw-uppercase"
									>
										{child.totalXP.toLocaleString()} XP
									</span>
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
									>
										🔥 {child.currentStreak}d
									</span>
								</div>
							</div>

							{#if child.boostAppliedToday}
								<div
									class="tw-rounded tw-bg-[#a78bfa]/10 tw-border tw-border-[#a78bfa]/25 tw-px-3 tw-py-1.5 tw-text-center"
								>
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a78bfa] tw-uppercase"
									>
										⚡ BOOST ACTIVE TODAY
									</span>
								</div>
							{/if}

							<!-- Boost preset buttons -->
							<div class="tw-grid tw-grid-cols-3 tw-gap-1.5">
								{#each BOOST_PRESETS as preset (preset.id)}
									<button
										onclick={() => engine.activateBoost(child.email, preset.id)}
										disabled={engine.mutating}
										class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-uppercase tw-border tw-border-[#a78bfa]/25 tw-text-[#a78bfa]/70 tw-bg-[#a78bfa]/5 tw-rounded-lg tw-px-1 tw-py-2 tw-transition-all tw-duration-150 hover:tw-border-[#a78bfa]/55 hover:tw-text-[#a78bfa] hover:tw-bg-[#a78bfa]/12 hover:tw-shadow-[0_0_8px_rgba(167,139,250,0.3)] disabled:tw-opacity-30 disabled:tw-cursor-not-allowed tw-leading-tight"
									>
										{preset.label}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- ─── CELL 3: FUNDING SOURCE (right, bottom half) ───────────────── -->
		<div id="parent-funding-source" class="tw-flex tw-flex-col tw-gap-0">
			<!-- Cell header -->
			<div class="tw-px-5 tw-pt-4 tw-pb-3 tw-border-b tw-border-[#14b8a6]/10">
				<div class="tw-flex tw-items-center tw-gap-2">
					<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]/40 tw-tracking-widest">
						//
					</span>
					<span class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
						FUNDING SOURCE
					</span>
				</div>
			</div>

			<div class="tw-flex-1 tw-flex tw-flex-col tw-gap-3 tw-p-5">
				{#if engine.hasFundingSource}
					<!-- Linked source display -->
					<div
						class="tw-flex tw-flex-col tw-gap-2 tw-rounded-xl tw-bg-[#00ff66]/5 tw-border tw-border-[#00ff66]/20 tw-p-4"
					>
						<div class="tw-flex tw-items-center tw-gap-2">
							<span class="tw-text-[#00ff66] tw-font-mono tw-text-[11px]">✓</span>
							<span
								class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00ff66] tw-uppercase"
							>
								LINKED
							</span>
						</div>
						{#if engine.fundingSource?.label}
							<span
								class="tw-font-mono tw-text-[12px] tw-tracking-wider tw-text-[#e0e0e0] tw-uppercase"
							>
								{engine.fundingSource.label}
							</span>
						{/if}
						{#if engine.fundingSource?.method}
							<span
								class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#00ff66]/50 tw-uppercase"
							>
								METHOD: {engine.fundingSource.method}
							</span>
						{/if}
					</div>
				{:else}
					<!-- Link funding source CTA -->
					<div class="tw-flex tw-flex-col tw-gap-3">
						{#if availableSources.length === 0 && !loadingSources}
							<div
								class="tw-rounded-xl tw-bg-[#020202]/60 tw-border tw-border-dashed tw-border-[#14b8a6]/15 tw-p-4 tw-flex tw-flex-col tw-items-center tw-gap-3"
							>
								<span
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase tw-text-center"
								>
									NO FUNDING SOURCE LINKED
								</span>
								<button
									onclick={fetchSources}
									disabled={loadingSources}
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-bg-[#14b8a6]/5 tw-rounded-lg tw-px-4 tw-py-2 tw-transition-all tw-duration-150 hover:tw-bg-[#14b8a6]/10 hover:tw-border-[#14b8a6]/70 hover:tw-shadow-[0_0_10px_rgba(20, 184, 166,0.25)] disabled:tw-opacity-40"
								>
									[ LINK FUNDING SOURCE ]
								</button>
							</div>
						{:else if loadingSources}
							<div class="tw-flex tw-items-center tw-justify-center tw-py-4">
								<span
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase tw-animate-pulse"
								>
									[ FETCHING SOURCES... ]
								</span>
							</div>
						{:else}
							<div class="tw-flex tw-flex-col tw-gap-2">
								<label
									for="source-select"
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
								>
									SELECT FUNDING SOURCE
								</label>
								<select
									id="source-select"
									bind:value={selectedSourceId}
									class="tw-w-full tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#e0e0e0] tw-uppercase tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-3 tw-py-2.5 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150 tw-appearance-none tw-cursor-pointer"
								>
									<option value="" disabled>— SELECT —</option>
									{#each availableSources as src (src.id)}
										<option value={src.id}
											>{src.label} ({src.method})</option
										>
									{/each}
								</select>
								{#if linkError}
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase"
									>
										[ {linkError} ]
									</span>
								{/if}
								<button
									onclick={handleLinkSource}
									disabled={!selectedSourceId || linkingSource || engine.mutating}
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-border tw-border-[#ffcc00]/40 tw-text-[#ffcc00] tw-bg-[#ffcc00]/5 tw-rounded-lg tw-px-4 tw-py-2 tw-transition-all tw-duration-150 hover:tw-bg-[#ffcc00]/10 hover:tw-border-[#ffcc00]/70 disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
								>
									{#if linkingSource}
										[ LINKING... ]
									{:else}
										[ CONFIRM LINK ]
									{/if}
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
