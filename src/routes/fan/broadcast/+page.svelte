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

<div class="tw-min-h-screen tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-black">
	<!-- Interactive Overlay -->
	<div class="broadcast-interactive-overlay tw-p-8 tw-bg-slate-900 tw-rounded-2xl tw-border tw-border-slate-800">
		<h1 class="tw-text-white tw-font-mono tw-mb-4">Live Match Broadcast</h1>
		
		<!-- Primary Action Gold CTA -->
		<button
			type="button"
			data-primary-cta
			class="bg-gold tw-px-6 tw-py-3 tw-rounded-lg tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-tracking-widest tw-uppercase"
		>
			Support Athlete
		</button>
	</div>
</div>


