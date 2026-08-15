<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let {
		engine,
		showCreateBounty,
		onCreateBounty,
	}: {
		engine: CoOpEngine;
		showCreateBounty: boolean;
		onCreateBounty: () => void;
	} = $props();

	const MAX_DOTS = 5;

	const activeDollars = $derived((engine.totalActiveCents / 100).toFixed(2));
	const activeBounties = $derived(engine.activeBounties);
	const dotBounties = $derived(activeBounties.slice(0, MAX_DOTS));
	const extraBounties = $derived(Math.max(0, activeBounties.length - MAX_DOTS));
</script>

<!--
	ROOT: tw-pointer-events-none — HUD rule.
	Interactive children must individually opt-in with tw-pointer-events-auto.
-->
<div
	class="tw-fixed tw-inset-0 tw-z-30 tw-pointer-events-none"
	aria-hidden={!showCreateBounty}
>
	<!-- ── Loading overlay ──────────────────────────────────────────────── -->
	{#if engine.loading}
		<div
			class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-pointer-events-none"
		>
			<div class="tw-flex tw-flex-col tw-items-center tw-gap-3">
				<div
					class="tw-w-8 tw-h-8 tw-rounded-none tw-border-2 tw-border-amber-500/30 tw-border-t-amber-500 tw-animate-spin"
				></div>
				<span
					class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-amber-500 tw-uppercase tw-animate-pulse"
				>
					INITIALIZING CO-OP ENGINE...
				</span>
			</div>
		</div>
	{/if}

	<!-- ── Error banner ─────────────────────────────────────────────────── -->
	{#if engine.error}
		<div class="tw-absolute tw-top-4 tw-left-1/2 -tw-translate-x-1/2 tw-pointer-events-auto">
			<div
				class="tw-rounded-none tw-bg-red-950/80 tw-backdrop-blur-xl tw-border tw-border-red-500/40 tw-px-5 tw-py-3 tw-flex tw-items-center tw-gap-3"
			>
				<Icon name={"status.error" as IconName} size={14} class="tw-text-red-400" />
				<span
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-red-300 tw-uppercase"
				>
					{engine.error}
				</span>
			</div>
		</div>
	{/if}

	<!-- ── Top-right panel: escrow value + controls ─────────────────────── -->
	<div
		class="tw-absolute tw-top-5 tw-right-5 tw-flex tw-flex-col tw-items-end tw-gap-3 tw-pointer-events-auto"
	>
		<!-- Escrow readout -->
		<div
			class="tw-rounded-none tw-bg-[#0B0F19]/95 tw-backdrop-blur-xl tw-border tw-border-[#1E293B] tw-px-5 tw-py-3.5 tw-flex tw-flex-col tw-items-end tw-gap-1"
		>
			<span
				class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase"
			>
				ACTIVE ESCROW
			</span>
			<span
				class="tw-font-mono tw-text-[22px] tw-font-bold tw-tracking-tight tw-text-amber-500 tw-leading-none"
			>
				${activeDollars}
			</span>
			<span
				class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase"
			>
				{activeBounties.length} BOUNTI{activeBounties.length === 1 ? 'Y' : 'ES'} ACTIVE
			</span>
		</div>

		<!-- Bounty indicator dots -->
		{#if activeBounties.length > 0}
			<div class="tw-flex tw-items-center tw-gap-1.5">
				{#each dotBounties as b (b.id)}
					<div
						class="tw-w-2 tw-h-2 tw-rounded-none tw-bg-amber-500"
						title={b.title}
					></div>
				{/each}
				{#if extraBounties > 0}
					<span
						class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-slate-400 tw-uppercase"
					>
						+{extraBounties}
					</span>
				{/if}
			</div>
		{/if}

		<!-- New bounty CTA -->
		<button
			onclick={onCreateBounty}
			class="tw-inline-flex tw-items-center tw-gap-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-tracking-widest tw-uppercase tw-border tw-border-amber-500 tw-text-black tw-bg-amber-500 tw-rounded-none tw-px-5 tw-py-2.5 tw-transition-all tw-duration-200 hover:tw-bg-yellow-300 hover:tw-shadow-[0_0_15px_rgba(218,255,10,0.5)] active:tw-scale-95"
		>
			<Icon name={"action.add" as IconName} size={14} />
			<span>NEW BOUNTY</span>
		</button>
	</div>
</div>
