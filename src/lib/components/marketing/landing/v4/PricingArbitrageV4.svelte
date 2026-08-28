<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	const handleGetStarted = (e: MouseEvent) => {
		e.preventDefault();
		untrack(() => {
			goto('/onboarding');
		});
	};
</script>

<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-py-24">
	<div class="tw-flex tw-flex-col tw-items-center tw-text-center tw-mb-16">
		<span class="tw-font-mono tw-text-xs tw-text-[#ff007f] tw-tracking-widest tw-mb-4" style="font-family: 'Geist Mono', monospace;">SYS.PRICING</span>
		<h2 class="tw-text-4xl tw-font-bold tw-text-[#FAFAFA] tw-tracking-tight" style="font-family: 'Geist Sans', sans-serif;">Arbitrage the Legacy Market</h2>
		<p class="tw-text-[#D4D4D8] tw-mt-4 tw-max-w-2xl" style="font-family: 'Switzer', sans-serif;">Stop paying ridiculous platform fees for outdated software.</p>
	</div>

	<div class="tw-max-w-4xl tw-mx-auto tw-w-full tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-8 tw-relative tw-overflow-hidden" style="border-radius: 0px; border-left: 3px solid #ff007f;">
		<!-- Ambient Background -->
		<div class="tw-absolute tw-inset-0 tw-z-0 tw-pointer-events-none tw-opacity-10" style="background: radial-gradient(circle at 100% 50%, #ff007f 0%, transparent 60%);"></div>

		<div class="tw-relative tw-z-10 tw-flex tw-flex-col md:tw-flex-row tw-items-center tw-justify-between tw-gap-8">
			<div class="tw-flex tw-flex-col tw-gap-4 tw-w-full md:tw-w-1/2">
				<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-4">
					<span class="tw-text-[#D4D4D8] tw-font-mono tw-text-sm">Legacy Competitors</span>
					<span class="tw-text-[#f59e0b] tw-font-mono tw-text-lg tw-line-through">$749+/year</span>
				</div>
				<div class="tw-flex tw-items-center tw-justify-between tw-pb-4">
					<span class="tw-text-[#FAFAFA] tw-font-bold tw-xl" style="font-family: 'Geist Sans', sans-serif;">SSTracker Base Fee</span>
					<span class="tw-text-[#ff007f] tw-font-mono tw-font-bold tw-text-2xl" style="text-shadow: 0 0 10px rgba(255, 0, 127, 0.25);">$0</span>
				</div>
				<p class="tw-text-[#a1a1aa] tw-text-sm tw-mt-2">Monetized strictly via transaction splits. We only succeed when you succeed.</p>
			</div>

			<div class="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-shrink-0 md:tw-w-1/2">
				<button
					onclick={handleGetStarted}
					type="button"
					class="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-[#000000] tw-font-bold tw-text-[11px] md:tw-text-xs tw-uppercase tw-tracking-widest tw-transition-all tw-duration-150 hover:tw-brightness-110 active:tw-scale-[0.98]"
					style="background-color: #fbbf24; padding: clamp(12px, 2vh, 16px) clamp(16px, 3vw, 24px); border-radius: 4px; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4); font-family: 'Geist Mono', monospace; white-space: normal; overflow-wrap: break-word; word-wrap: break-word; text-align: center; line-height: 1.4;"
				>
					EXPERIENCE UNIFIED SPORTS OPERATIONS FOR $0 UPFRONT
				</button>
			</div>
		</div>
	</div>
</section>
