<script lang="ts">
	let {
		matchData,
		isEmbargoed,
		attestationSigned,
		countdown,
		signAttestation
	} = $props<{
		matchData: any;
		isEmbargoed: boolean;
		attestationSigned: boolean;
		countdown: string;
		signAttestation: () => void;
	}>();
</script>

<section class="tw-relative tw-w-full tw-rounded-[24px] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-overflow-hidden tw-z-30">
	<!-- Raw Athletic Data Underneath -->
	<div class="tw-p-6">
		<div class="tw-flex tw-justify-between tw-items-center tw-mb-6">
			<div>
				<h2 class="tw-text-xl tw-font-bold tw-text-white">Latest Match: {matchData?.opponent}</h2>
				<span class="tw-text-[#94a3b8] tw-text-sm tw-font-mono">{matchData?.date}</span>
			</div>
			<div class="tw-px-3 tw-py-1 tw-rounded-full tw-bg-[#334155] tw-text-white tw-text-xs tw-font-bold tw-tracking-widest">
				POST-MATCH ANALYSIS
			</div>
		</div>

		<div class="tw-grid tw-grid-cols-2 tw-gap-4">
			<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-block tw-mb-1">EFFORT (RPE)</span>
				<span class="tw-text-white tw-text-3xl tw-font-bold">{matchData?.rpe}<span class="tw-text-[#64748b] tw-text-lg">/10</span></span>
			</div>
			<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-block tw-mb-1">SUCCESS RATE</span>
				<span class="tw-text-white tw-text-3xl tw-font-bold">{matchData?.successRate}<span class="tw-text-[#64748b] tw-text-lg">%</span></span>
			</div>
		</div>
	</div>

	<!-- Z3 Holographic Glassmorphism Overlay during Embargo -->
	{#if isEmbargoed && !attestationSigned}
		<div class="tw-absolute tw-inset-0 tw-z-40 tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-6 tw-bg-[#0f172a]/40 tw-backdrop-blur-[20px] tw-border-t tw-border-white/10">
			<h3 class="tw-text-white tw-text-2xl tw-font-bold tw-mb-2">The Car Ride Home</h3>
			<p class="tw-text-center tw-text-[#cbd5e1] tw-mb-6 tw-max-w-md">
				Match data is processing. We enforce a 15-minute cooling off period to preserve emotional safety.
			</p>

			<!-- Empathetic Conversation Anchors in Geist Mono -->
			<div class="tw-bg-[#0B0F19]/80 tw-border tw-border-[#334155] tw-rounded-xl tw-p-4 tw-w-full tw-max-w-md tw-mb-6">
				<p class="tw-text-[#94a3b8] tw-text-xs tw-font-bold tw-tracking-widest tw-mb-3">SUGGESTED CONVERSATION ANCHORS:</p>
				<ul class="tw-space-y-2 tw-font-mono tw-text-sm tw-text-white">
					<li class="tw-flex tw-items-start tw-gap-2">
						<span class="tw-text-[#14b8a6]">&gt;</span> "I love watching you play."
					</li>
					<li class="tw-flex tw-items-start tw-gap-2">
						<span class="tw-text-[#14b8a6]">&gt;</span> "What was your favorite moment out there?"
					</li>
					<li class="tw-flex tw-items-start tw-gap-2">
						<span class="tw-text-[#14b8a6]">&gt;</span> "Did anything surprise you today?"
					</li>
				</ul>
			</div>

			{#if countdown}
				<div class="tw-text-[#f59e0b] tw-font-mono tw-text-sm tw-tracking-widest tw-mb-6 tw-animate-pulse">
					UNLOCKS IN {countdown}
				</div>
			{/if}
			
			<button 
				class="tw-bg-white tw-text-black tw-px-6 tw-py-3 tw-rounded-xl tw-font-bold tw-text-sm tw-hover:bg-gray-200 tw-transition-colors"
				onclick={signAttestation}
			>
				I Acknowledge The Safety Parameters
			</button>
		</div>
	{/if}
</section>
