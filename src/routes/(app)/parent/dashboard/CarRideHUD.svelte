<script lang="ts">
	import type { CarRideEngine } from './CarRideEngine.svelte.js';

	let { engine }: { engine: CarRideEngine } = $props();
</script>

<!--
	CarRideHUD.svelte — Phase 4, Epic 8 (HUD Layer)
	Mounted as a fixed overlay. Root is tw-pointer-events-none so it does
	NOT block interactions with the board underneath. The attestation panel
	opts in via tw-pointer-events-auto on its interior container only.
-->

{#if engine.shouldIntercept}
	<div
		class="tw-fixed tw-inset-0 tw-z-[60] tw-pointer-events-none"
		aria-label="Car Ride Home Protocol overlay"
	>
		<!-- Full-screen glassmorphism backdrop — pointer-events-auto to block underlying UI -->
		<div
			class="tw-absolute tw-inset-0 tw-backdrop-blur-[48px] tw-bg-[#020202]/90 tw-pointer-events-auto"
			aria-hidden="true"
		></div>

		<!-- Centred attestation panel — opts in to pointer events -->
		<div
			class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-p-6 tw-pointer-events-auto"
		>
			<div
				class="tw-w-full tw-max-w-md tw-flex tw-flex-col tw-gap-6 tw-rounded-[24px] tw-border tw-border-[#1E293B] tw-bg-[#0B0F19]/95 tw-backdrop-blur-sm tw-p-8"
			>
				<!-- Protocol badge -->
				<div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
					<span class="tw-text-[#ff0055] tw-text-[11px] tw-animate-pulse">▲</span>
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase">
						CAR RIDE HOME PROTOCOL — ACTIVE
					</span>
				</div>

				<!-- Divider -->
				<div class="tw-w-full tw-h-px tw-bg-[#ff0055]/15"></div>

				<!-- Score summary (public — no attestation required) -->
				{#if engine.publicScore}
					{@const score = engine.publicScore}
					<div class="tw-flex tw-flex-col tw-items-center tw-gap-2">
						<div class="tw-flex tw-items-center tw-gap-4">
							<span class="tw-font-mono tw-text-[36px] tw-font-bold tw-text-white tw-tabular-nums tw-leading-none">
								{score.scoreHome}
							</span>
							<span class="tw-font-mono tw-text-[16px] tw-text-[#a0a0a0]/40">—</span>
							<span class="tw-font-mono tw-text-[36px] tw-font-bold tw-text-[#a0a0a0]/60 tw-tabular-nums tw-leading-none">
								{score.scoreAway}
							</span>
						</div>
						<span
							class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase {score.outcome === 'W' ? 'tw-text-[#14b8a6]' : score.outcome === 'L' ? 'tw-text-[#ff6b6b]' : 'tw-text-[#a0a0a0]'}"
						>
							{score.outcome === 'W' ? 'VICTORY' : score.outcome === 'L' ? 'DEFEAT' : 'DRAW'}
						</span>
					</div>
				{/if}

				<!-- Divider -->
				<div class="tw-w-full tw-h-px tw-bg-[#ff0055]/15"></div>

				<!-- EQ mandate -->
				<div class="tw-flex tw-flex-col tw-gap-3 tw-text-center">
					<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-[#e0e0e0]">
						MANDATE: Protect player EQ. Do not critique tactical errors today.
					</p>
					<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-[#a0a0a0] tw-italic">
						{engine.conversationAnchor}
					</p>
				</div>

				<!-- Divider -->
				<div class="tw-w-full tw-h-px tw-bg-[#ff0055]/15"></div>

				<!-- Attest CTA -->
				<button
					onclick={() => engine.attest()}
					disabled={engine.isAttesting || engine.isTemporallyEmbargoed}
					class="tw-w-full tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-border tw-border-[#ff0055] tw-text-[#ff0055] tw-bg-[#ff0055]/10 tw-rounded-[24px] tw-px-6 tw-py-4 tw-transition-all tw-duration-200
						{engine.isAttesting || engine.isTemporallyEmbargoed ? 'tw-opacity-50 tw-cursor-not-allowed' : 'hover:tw-bg-[#ff0055]/20 active:tw-scale-[0.98]'}"
				>
					{#if engine.isTemporallyEmbargoed}
						[ EMBARGOED: 15 MIN TEMPORAL LOCK ]
					{:else if engine.isAttesting}
						[ LOGGING ATTESTATION... ]
					{:else}
						[ ATTEST EQ COMPLIANCE &amp; UNLOCK METRICS ]
					{/if}
				</button>

				<!-- Error -->
				{#if engine.error}
					<p class="tw-font-mono tw-text-[10px] tw-text-[#ff6b6b] tw-text-center tw-tracking-wide">
						{engine.error}
					</p>
				{/if}

				<!-- Protocol label -->
				<span
					class="tw-self-center tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-[#ff0055]/25 tw-uppercase"
				>
					PROTOCOL: CAR_RIDE_HOME_V1 · PHASE 4 · EPIC 8
				</span>
			</div>
		</div>
	</div>
{/if}
