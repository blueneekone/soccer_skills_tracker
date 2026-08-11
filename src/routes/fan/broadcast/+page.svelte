<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		document.body.style.backgroundColor = '#000000';
		
		return () => {
			document.body.style.backgroundColor = '';
		};
	});
</script>

<svelte:head>
	<title>Fan OS Broadcast</title>
</svelte:head>

<div class="bento-grid-container tw-min-h-screen tw-w-full tw-grid tw-bg-black tw-p-8" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); gap: 1rem; align-items: center; justify-items: center;">
	<!-- Interactive Overlay -->
	<div class="st-bento broadcast-interactive-overlay tw-p-8 tw-bg-[#0f172a] tw-rounded-none tw-border tw-border-[#334155] tw-min-w-0">
		<h1 class="tw-text-[#FAFAFA] tw-mb-4 tw-uppercase tw-tracking-widest tw-min-w-0" style="font-family: 'Geist Sans', sans-serif; font-size: 1.25rem;">Live Match Broadcast</h1>
		
		<p class="tw-text-[#D4D4D8] tw-text-sm tw-mb-4 tw-min-w-0" style="font-family: 'Switzer', sans-serif;">
			Enjoy direct, zero-trust authorized match feed telemetry and real-time interactive options.
		</p>

		<!-- Primary Action Gold CTA -->
		<button
			type="button"
			data-primary-cta
			class="bg-gold tw-px-6 tw-py-3 tw-rounded-none tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-tracking-widest tw-uppercase"
			style="font-family: 'Geist Mono', monospace;"
		>
			Support Athlete
		</button>
	</div>
</div>
