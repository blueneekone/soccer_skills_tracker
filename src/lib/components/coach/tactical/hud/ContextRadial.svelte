<script>
	import { scale, fade } from 'svelte/transition';

	/** @type {{ deployPhase: 'idle' | 'deploying' | 'success', deployProgress: number, deployXpBounty: number, deployCartridgeId: string, onClose: () => void }} */
	let { deployPhase = 'idle', deployProgress = 0, deployXpBounty = 0, deployCartridgeId = '', onClose } = $props();
</script>

<!--
  Context Radial — the deploy sequence overlay.
  Floats above everything else (z-9999). The right-click GridRadialHub
  remains intact inside TacticalPitchBoard and is independent of this panel.
-->
{#if deployPhase !== 'idle'}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-pointer-events-auto tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 200 }}
	>
		<!-- Backdrop — click-to-close only once deploy succeeds -->
		<div
			class="tw-absolute tw-inset-0 tw-bg-black/75 tw-backdrop-blur-sm"
			onclick={() => deployPhase === 'success' && onClose?.()}
		></div>

		<!-- Glass panel -->
		<div
			class="tw-relative tw-w-[min(400px,90vw)] tw-rounded-2xl tw-border tw-border-white/10 tw-bg-[#020202]/96 tw-p-8 tw-text-center tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_0_80px_rgba(20, 184, 166,0.12),_0_40px_80px_rgba(0,0,0,0.8)]"
			in:scale={{ duration: 350, start: 0.85 }}
			out:scale={{ duration: 200, start: 0.92 }}
		>
			{#if deployPhase === 'deploying'}
				<p class="tw-mb-1 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.3em] tw-text-white/25">
					CARTRIDGE {deployCartridgeId}
				</p>
				<h2 class="tw-mb-6 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">
					DEPLOYING PLAY...
				</h2>

				<!-- Progress bar -->
				<div class="tw-mb-2 tw-h-1.5 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10 tw-shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
					<div
						class="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-[#14b8a6]/50 tw-to-[#14b8a6] tw-shadow-[0_0_12px_rgba(20, 184, 166,0.6)]"
						style="width: {deployProgress * 100}%; transition: none;"
					></div>
				</div>
				<p class="tw-mb-6 tw-font-mono tw-text-xs tw-text-white/35">
					{Math.round(deployProgress * 100)}% TRANSMITTED
				</p>

				<div class="tw-flex tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-[#14b8a6]/20 tw-bg-[#14b8a6]/5 tw-px-4 tw-py-3">
					<span class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/40">XP BOUNTY</span>
					<span class="tw-font-mono tw-text-lg tw-font-bold tw-text-[#14b8a6]">+{deployXpBounty}</span>
				</div>

			{:else}
				<!-- ── Success state ────────────────────────────────────── -->
				<div class="tw-mb-5 tw-flex tw-items-center tw-justify-center">
					<div
						class="tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-[#14b8a6]/40 tw-bg-[#14b8a6]/10 tw-shadow-[0_0_30px_rgba(20, 184, 166,0.25)]"
					>
						<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
							<polyline
								points="6,14 11,20 22,9"
								stroke="#14b8a6"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
				</div>

				<h2 class="tw-mb-1 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">
					TRANSMITTING TO FIELD UNITS
				</h2>
				<p class="tw-mb-5 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/25">
					CARTRIDGE {deployCartridgeId} · CONFIRMED
				</p>

				<div class="tw-mb-4 tw-h-1.5 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10">
					<div class="tw-h-full tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-[#14b8a6]/50 tw-to-[#14b8a6] tw-shadow-[0_0_12px_rgba(20, 184, 166,0.6)]"></div>
				</div>

				<div class="tw-mb-6 tw-flex tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-[#14b8a6]/25 tw-bg-[#14b8a6]/10 tw-px-4 tw-py-3">
					<span class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/40">XP AWARDED</span>
					<span class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#14b8a6]">+{deployXpBounty}</span>
				</div>

				<button
					type="button"
					class="tw-pointer-events-auto tw-w-full tw-rounded-full tw-border tw-border-white/15 tw-bg-white/5 tw-py-2.5 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/50 tw-transition-all hover:tw-border-white/30 hover:tw-bg-white/10 hover:tw-text-white/90"
					onclick={() => onClose?.()}
				>
					CLOSE
				</button>
			{/if}
		</div>
	</div>
{/if}
