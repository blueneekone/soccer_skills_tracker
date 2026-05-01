<script>
	import '../../style.css';
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import PwaInstallPrompt from '$lib/components/ui/PwaInstallPrompt.svelte';
	import VanguardVFX from '../components/VanguardVFX.svelte';
	import { fade } from 'svelte/transition';

	let { children } = $props();

	$effect(() => {
		if (browser) themeStore.init();
	});
</script>

<VanguardVFX />

<!-- Base shell: isolate stacking; vanguard-os-shell enforces global HUD chrome + link/button resets -->
<div
	class="vanguard-os-shell tw-relative tw-isolate tw-z-0 tw-min-h-[100dvh] tw-bg-transparent tw-text-slate-300 tw-antialiased"
>
	{#key page.url.pathname}
		<div class="tw-min-h-[100dvh]" in:fade={{ duration: 150 }}>
			{@render children()}
		</div>
	{/key}
</div>
<PwaInstallPrompt />
