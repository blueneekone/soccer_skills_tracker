<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import type { BountyDoc } from '$lib/types/bounty.js';
	import { BOOST_PRESETS } from '$lib/types/bounty.js';

	let { engine }: { engine: CoOpEngine } = $props();

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

	function statusChipClass(status: BountyDoc['status']): string {
		switch (status) {
			case 'active':
				return 'tw-bg-[#14b8a6]/20 tw-text-[#14b8a6] tw-border-[#14b8a6]/50';
			case 'verified':
			case 'paid':
				return 'tw-bg-[#f59e0b]/20 tw-text-[#f59e0b] tw-border-[#f59e0b]/50';
			case 'failed':
				return 'tw-bg-red-500/20 tw-text-red-500 tw-border-red-500/50';
			case 'expired':
			case 'voided':
				return 'tw-bg-[#334155] tw-text-[#94a3b8] tw-border-[#475569]';
			default:
				return 'tw-bg-[#334155] tw-text-[#94a3b8] tw-border-[#475569]';
		}
	}

	function criterionLabel(type: BountyDoc['criterion']['type']): string {
		switch (type) {
			case 'reps_count': return 'REPS';
			case 'workout_volume_kj': return 'VOLUME';
			case 'streak_length': return 'STREAK';
			case 'gpa_threshold': return 'GPA';
			case 'mastery_node_unlock': return 'MASTERY';
			case 'cv_verified_drill': return 'CV-DRILL';
			default: return 'UNKNOWN';
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

<div class="tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-8">
	<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
		<h2 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-[#14b8a6]">●</span> Co-Op Arena
		</h2>
		<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">FUNDING MANAGEMENT</span>
	</div>

	<!-- Stripe Billing Interface Section -->
	<section>
		<h3 class="tw-text-white tw-font-bold tw-text-md tw-mb-4 tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-[#334155]">#</span> Stripe Billing Metrics
		</h3>
		<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155]">
			{#if engine.hasFundingSource}
				<div class="tw-flex tw-justify-between tw-items-center">
					<div>
						<p class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-mb-1">LINKED ACCOUNT</p>
						<p class="tw-text-white tw-font-bold">{engine.fundingSource?.label || 'Active Source'}</p>
						<p class="tw-text-[#64748b] tw-text-sm">Method: {engine.fundingSource?.method || 'N/A'}</p>
					</div>
					<div class="tw-px-3 tw-py-1 tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-rounded-full tw-text-xs tw-font-bold">VERIFIED</div>
				</div>
			{:else}
				<div class="tw-flex tw-flex-col tw-gap-3">
					<p class="tw-text-[#94a3b8] tw-text-sm">No primary funding source linked. Link an account to fund bounties.</p>
					{#if availableSources.length === 0 && !loadingSources}
						<button class="tw-bg-white tw-text-black tw-font-bold tw-px-4 tw-py-2 tw-rounded-lg tw-hover:bg-gray-200 tw-transition-colors tw-w-fit" onclick={fetchSources} disabled={loadingSources}>
							Fetch Stripe Sources
						</button>
					{:else if loadingSources}
						<p class="tw-text-white tw-font-mono tw-text-sm tw-animate-pulse">FETCHING_SOURCES...</p>
					{:else}
						<div class="tw-flex tw-gap-2">
							<select bind:value={selectedSourceId} class="tw-flex-1 tw-bg-[#0f172a] tw-text-white tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-font-mono focus:tw-outline-none focus:tw-border-[#14b8a6]">
								<option value="" disabled>Select Source</option>
								{#each availableSources as src (src.id)}
									<option value={src.id}>{src.label} ({src.method})</option>
								{/each}
							</select>
							<button class="tw-bg-[#14b8a6] tw-text-[#0f172a] tw-font-bold tw-px-4 tw-py-2 tw-rounded-lg tw-hover:bg-[#0d9488]" onclick={handleLinkSource} disabled={!selectedSourceId || linkingSource || engine.mutating}>
								{linkingSource ? 'LINKING...' : 'LINK SOURCE'}
							</button>
						</div>
						{#if linkError}
							<p class="tw-text-red-400 tw-text-sm tw-mt-2">{linkError}</p>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Bounties Section -->
	<section class="tw-flex tw-flex-col">
		<h3 class="tw-text-white tw-font-bold tw-text-md tw-mb-4 tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-[#334155]">#</span> Active Objectives
		</h3>
		
		<div class="tw-flex tw-flex-col tw-gap-3">
			{#if displayBounties.length === 0}
				<div class="tw-py-8 tw-flex tw-items-center tw-justify-center tw-border tw-border-dashed tw-border-[#334155] tw-rounded-xl">
					<span class="tw-text-[#64748b] tw-font-mono tw-text-sm">NO_ACTIVE_BOUNTIES</span>
				</div>
			{:else}
				{#each displayBounties as bounty (bounty.id)}
					{@const progress = engine.bountyProgress(bounty)}
					<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155]">
						<div class="tw-flex tw-justify-between tw-items-start tw-mb-3">
							<div>
								<h4 class="tw-text-white tw-font-bold">{bounty.title}</h4>
								<p class="tw-text-[#94a3b8] tw-text-xs tw-font-mono">→ {bounty.playerEmail}</p>
							</div>
							<div class="tw-flex tw-gap-2">
								<span class="tw-px-2 tw-py-1 tw-rounded tw-bg-[#334155] tw-text-white tw-text-xs tw-font-mono tw-border tw-border-[#475569]">
									{criterionLabel(bounty.criterion.type)}
								</span>
								<span class={`tw-px-2 tw-py-1 tw-rounded tw-text-xs tw-font-mono tw-border ${statusChipClass(bounty.status)}`}>
									{bounty.status.toUpperCase()}
								</span>
							</div>
						</div>

						{#if bounty.progressTarget && bounty.progressTarget > 0}
							<div class="tw-mb-3">
								<div class="tw-h-1.5 tw-w-full tw-bg-[#0f172a] tw-rounded-full tw-overflow-hidden tw-mb-1">
									<div class="tw-h-full tw-bg-[#14b8a6] tw-transition-all tw-duration-500" style="width: {progress}%"></div>
								</div>
								<div class="tw-flex tw-justify-between tw-text-[10px] tw-font-mono tw-text-[#94a3b8]">
									<span>{bounty.progressCurrent ?? 0} / {bounty.progressTarget} {bounty.progressUnit ?? ''}</span>
									<span>{progress}%</span>
								</div>
							</div>
						{/if}

						<div class="tw-flex tw-items-center tw-justify-between tw-pt-3 tw-border-t tw-border-[#334155]">
							<div class="tw-flex tw-items-end tw-gap-1">
								<span class="tw-text-white tw-font-bold tw-text-lg">${((bounty.rewardCents ?? 0) / 100).toFixed(2)}</span>
								<span class="tw-text-[#64748b] tw-text-xs tw-pb-1">USD</span>
							</div>
							<div class="tw-flex tw-items-center tw-gap-3">
								<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono">EXP: {formatExpiry(bounty.expiresAt)}</span>
								{#if bounty.status === 'active'}
									<button class="tw-text-[#ef4444] tw-text-xs tw-font-bold tw-hover:text-red-400 tw-transition-colors" onclick={() => engine.voidBounty(bounty.id!)} disabled={engine.mutating}>
										VOID
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</div>
