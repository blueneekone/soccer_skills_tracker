<script>
	import '../../style.css';
	import '../app.css';
	import { browser } from '$app/environment';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import PwaInstallPrompt from '$lib/components/ui/PwaInstallPrompt.svelte';

	let { children } = $props();

	$effect(() => {
		if (browser) themeStore.init();
	});
</script>

{@render children()}
<PwaInstallPrompt />
