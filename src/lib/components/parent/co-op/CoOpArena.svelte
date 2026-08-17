<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import type { BountyDoc } from '$lib/types/bounty.js';
	import { BOOST_PRESETS } from '$lib/types/bounty.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

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
				return 'tw-bg-amber-500/15 tw-text-amber-500 tw-border-amber-500/40';
			case 'verified':
			case 'paid':
				return 'tw-bg-emerald-500/20 tw-text-emerald-400 tw-border-emerald-500/40';
			case 'failed':
				return 'tw-bg-red-500/20 tw-text-red-400 tw-border-red-500/40';
			case 'expired':
			case 'voided':
				return 'tw-bg-[#1E293B] tw-text-slate-400 tw-border-[#334155]';
			default:
				return 'tw-bg-[#1E293B] tw-text-slate-400 tw-border-[#334155]';
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

<div class="tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-flex tw-flex-col tw-gap-6 tw-rounded-none">
	<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1E293B] tw-pb-4">
		<h2 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2.5 tw-m-0">
			<Icon name={"sys.escrow" as IconName} size={20} class="tw-text-amber-500" />
			<span>Co-Op Arena</span>
		</h2>
		<span class="tw-px-2 tw-py-0.5 tw-bg-amber-500/10 tw-border tw-border-amber-500/40 tw-text-amber-500 tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded-none font-bold">
			ESCROW TELEMETRY
		</span>
	</div>

	<!-- Stripe Billing Interface Section -->
	<section>
		<h3 class="tw-text-slate-300 tw-font-bold tw-text-sm tw-mb-3 tw-flex tw-items-center tw-gap-2 tw-font-mono tw-uppercase">
			<Icon name={"sys.credit-card" as IconName} size={16} class="tw-text-[#14b8a6]" />
			<span>Stripe Billing & Funding Source</span>
		</h3>
		<div class="tw-bg-[#0B0F19] tw-p-4 tw-border tw-border-[#1E293B] tw-rounded-none">
			{#if engine.hasFundingSource}
				<div class="tw-flex tw-justify-between tw-items-center">
					<div>
						<p class="tw-text-slate-400 tw-text-xs tw-font-mono tw-tracking-widest tw-mb-1">LINKED ACCOUNT</p>
						<p class="tw-text-white tw-font-bold tw-text-sm">{engine.fundingSource?.label || 'Active Source'}</p>
						<p class="tw-text-slate-400 tw-text-xs tw-font-mono">Method: {engine.fundingSource?.method || 'N/A'}</p>
					</div>
					<div class="tw-px-3 tw-py-1 tw-bg-emerald-500/10 tw-border tw-border-emerald-500/30 tw-text-emerald-400 tw-rounded-none tw-text-xs tw-font-mono tw-font-bold tw-flex tw-items-center tw-gap-1.5">
						<Icon name={"status.seal-check" as IconName} size={14} />
						<span>VERIFIED</span>
					</div>
				</div>
			{:else}
				<div class="tw-flex tw-flex-col tw-gap-3">
					<p class="tw-text-slate-400 tw-text-xs">No primary funding source linked. Link an account to fund athlete bounties.</p>
					{#if availableSources.length === 0 && !loadingSources}
						<button 
							class="tw-inline-flex tw-items-center tw-gap-2 tw-bg-amber-500 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-px-4 tw-py-2.5 tw-rounded-none hover:tw-bg-amber-400 hover:tw-shadow-[0_0_15px_rgba(251, 191, 36,0.5)] tw-transition-all tw-w-fit" 
							onclick={fetchSources} 
							disabled={loadingSources}
						>
							<Icon name={"sys.credit-card" as IconName} size={14} />
							<span>Fetch Stripe Sources</span>
						</button>
					{:else if loadingSources}
						<p class="tw-text-amber-500 tw-font-mono tw-text-xs tw-animate-pulse tw-flex tw-items-center tw-gap-2">
							<Icon name={"game.zap" as IconName} size={14} />
							<span>FETCHING_STRIPE_SOURCES...</span>
						</p>
					{:else}
						<div class="tw-flex tw-flex-col sm:tw-flex-row tw-gap-2">
							<select bind:value={selectedSourceId} class="tw-flex-1 tw-bg-[#0F172A] tw-text-white tw-border tw-border-[#1E293B] tw-rounded-none tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-outline-none focus:tw-border-amber-500">
								<option value="" disabled>Select Source</option>
								{#each availableSources as src (src.id)}
									<option value={src.id}>{src.label} ({src.method})</option>
								{/each}
							</select>
							<button 
								class="tw-inline-flex tw-items-center tw-gap-1.5 tw-bg-amber-500 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-px-4 tw-py-2 tw-rounded-none hover:tw-bg-amber-400 tw-transition-all disabled:tw-opacity-50" 
								onclick={handleLinkSource} 
								disabled={!selectedSourceId || linkingSource || engine.mutating}
							>
								<Icon name={"sys.plug" as IconName} size={14} />
								<span>{linkingSource ? 'LINKING...' : 'LINK SOURCE'}</span>
							</button>
						</div>
						{#if linkError}
							<p class="tw-text-red-400 tw-text-xs tw-font-mono tw-mt-2">{linkError}</p>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Bounties Section -->
	<section class="tw-flex tw-flex-col">
		<h3 class="tw-text-slate-300 tw-font-bold tw-text-sm tw-mb-3 tw-flex tw-items-center tw-gap-2 tw-font-mono tw-uppercase">
			<Icon name={"game.target" as IconName} size={16} class="tw-text-amber-500" />
			<span>Active Objectives & Bounties</span>
		</h3>
		
		<div class="tw-flex tw-flex-col tw-gap-3">
			{#if displayBounties.length === 0}
				<div class="tw-py-8 tw-flex tw-flex-col tw-items-center tw-justify-center tw-border tw-border-dashed tw-border-[#1E293B] tw-bg-[#0B0F19] tw-rounded-none">
					<Icon name={"game.target" as IconName} size={28} class="tw-text-slate-600 tw-mb-2" />
					<span class="tw-text-slate-500 tw-font-mono tw-text-xs">NO_ACTIVE_BOUNTIES</span>
				</div>
			{:else}
				{#each displayBounties as bounty (bounty.id)}
					{@const progress = engine.bountyProgress(bounty)}
					<div class="tw-bg-[#0B0F19] tw-p-4 tw-border tw-border-[#1E293B] tw-rounded-none">
						<div class="tw-flex tw-justify-between tw-items-start tw-mb-3">
							<div>
								<h4 class="tw-text-white tw-font-bold tw-text-sm tw-m-0">{bounty.title}</h4>
								<p class="tw-text-slate-400 tw-text-xs tw-font-mono tw-mt-0.5">→ {bounty.playerEmail}</p>
							</div>
							<div class="tw-flex tw-gap-2">
								<span class="tw-px-2 tw-py-0.5 tw-rounded-none tw-bg-[#1E293B] tw-text-slate-300 tw-text-[10px] tw-font-mono tw-border tw-border-[#334155]">
									{criterionLabel(bounty.criterion.type)}
								</span>
								<span class={`tw-px-2 tw-py-0.5 tw-rounded-none tw-text-[10px] tw-font-mono tw-font-bold tw-border ${statusChipClass(bounty.status)}`}>
									{bounty.status.toUpperCase()}
								</span>
							</div>
						</div>

						{#if bounty.progressTarget && bounty.progressTarget > 0}
							<div class="tw-mb-3">
								<div class="tw-h-1.5 tw-w-full tw-bg-[#1E293B] tw-rounded-none tw-overflow-hidden tw-mb-1">
									<div class="tw-h-full tw-bg-amber-500 tw-transition-all tw-duration-500" style="width: {progress}%"></div>
								</div>
								<div class="tw-flex tw-justify-between tw-text-[10px] tw-font-mono tw-text-slate-400">
									<span>{bounty.progressCurrent ?? 0} / {bounty.progressTarget} {bounty.progressUnit ?? ''}</span>
									<span class="tw-text-amber-500 tw-font-bold">{progress}%</span>
								</div>
							</div>
						{/if}

						<div class="tw-flex tw-items-center tw-justify-between tw-pt-3 tw-border-t tw-border-[#1E293B]">
							<div class="tw-flex tw-items-end tw-gap-1">
								<span class="tw-text-amber-500 tw-font-bold tw-font-mono tw-text-base">${((bounty.rewardCents ?? 0) / 100).toFixed(2)}</span>
								<span class="tw-text-slate-500 tw-text-xs tw-pb-0.5 tw-font-mono">USD</span>
							</div>
							<div class="tw-flex tw-items-center tw-gap-3">
								<span class="tw-text-slate-400 tw-text-xs tw-font-mono">EXP: {formatExpiry(bounty.expiresAt)}</span>
								{#if bounty.status === 'active'}
									<button 
										class="tw-text-red-400 tw-text-xs tw-font-mono tw-font-bold hover:tw-text-red-300 tw-transition-colors tw-border tw-border-red-500/30 tw-px-2 tw-py-0.5 tw-bg-red-950/20" 
										onclick={() => engine.voidBounty(bounty.id!)} 
										disabled={engine.mutating}
									>
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
