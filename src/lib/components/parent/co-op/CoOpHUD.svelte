<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';

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
					class="tw-w-8 tw-h-8 tw-rounded-full tw-border-2 tw-border-[#00f0ff]/30 tw-border-t-[#00f0ff] tw-animate-spin"
				></div>
				<span
					class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase tw-animate-pulse"
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
				class="tw-rounded-xl tw-bg-[#ff0055]/15 tw-backdrop-blur-xl tw-border tw-border-[#ff0055]/40 tw-px-5 tw-py-3 tw-flex tw-items-center tw-gap-3"
				style="box-shadow: 0 0 20px rgba(255,0,85,0.2);"
			>
				<span class="tw-text-[#ff0055] tw-font-mono tw-text-[12px]">⚠</span>
				<span
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase"
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
			class="tw-rounded-2xl tw-bg-[#040f16]/90 tw-backdrop-blur-xl tw-border tw-border-[#00f0ff]/20 tw-px-5 tw-py-3.5 tw-flex tw-flex-col tw-items-end tw-gap-1"
			style="box-shadow: 0 0 30px rgba(0,240,255,0.08), 0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,240,255,0.08);"
		>
			<span
				class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase"
			>
				ACTIVE ESCROW
			</span>
			<span
				class="tw-font-mono tw-text-[22px] tw-font-bold tw-tracking-tight tw-text-[#00f0ff] tw-leading-none"
				style="text-shadow: 0 0 20px rgba(0,240,255,0.6), 0 0 40px rgba(0,240,255,0.3);"
			>
				${activeDollars}
			</span>
			<span
				class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-[#00f0ff]/30 tw-uppercase"
			>
				{activeBounties.length} BOUNTI{activeBounties.length === 1 ? 'Y' : 'ES'} ACTIVE
			</span>
		</div>

		<!-- Bounty indicator dots -->
		{#if activeBounties.length > 0}
			<div class="tw-flex tw-items-center tw-gap-1.5">
				{#each dotBounties as b (b.id)}
					<div
						class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#00f0ff]"
						title={b.title}
						style="box-shadow: 0 0 6px rgba(0,240,255,0.8);"
					></div>
				{/each}
				{#if extraBounties > 0}
					<span
						class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase"
					>
						+{extraBounties}
					</span>
				{/if}
			</div>
		{/if}

		<!-- New bounty CTA -->
		<button
			onclick={onCreateBounty}
			class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-border tw-border-[#00f0ff]/50 tw-text-[#00f0ff] tw-bg-[#00f0ff]/8 tw-rounded-xl tw-px-5 tw-py-2.5 tw-transition-all tw-duration-200 hover:tw-bg-[#00f0ff]/15 hover:tw-border-[#00f0ff]/80 hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.4),inset_0_0_12px_rgba(0,240,255,0.12)] active:tw-scale-95"
			style="text-shadow: 0 0 12px rgba(0,240,255,0.5);"
		>
			[ + NEW BOUNTY ]
		</button>
	</div>
</div>
