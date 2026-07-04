<script>
	import '@fontsource/geist-mono/400.css';
	import '@fontsource/geist-mono/500.css';
	import '@fontsource/geist-mono/600.css';
	import '../../style.css';
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import PwaInstallPrompt from '$lib/components/ui/PwaInstallPrompt.svelte';
	import NativeShellRedirect from '$lib/components/native/NativeShellRedirect.svelte';
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
	class="vanguard-os-shell dark-form-surface tw-relative tw-isolate tw-z-0 tw-min-h-[100dvh] tw-bg-transparent tw-text-slate-300 tw-antialiased"
>
	{#key page.url.pathname}
		<main class="tw-min-h-[100dvh] bento-grid bento-grid--12col bento-grid--liquid tw-w-full" in:fade={{ duration: 150 }}>
			<div class="bento-span-8 bento-cell">
				{@render children()}
			</div>
			<aside class="bento-span-4 bento-cell">
				<!-- Sidecar reserved for global nav/widgets -->
			</aside>
		</main>
	{/key}
</div>
<NativeShellRedirect />
<PwaInstallPrompt />
