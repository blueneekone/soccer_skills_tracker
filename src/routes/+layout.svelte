<script>
	import '../../style.css';
	import { browser } from '$app/environment';
	import { themeStore } from '$lib/stores/theme.svelte.js';

	let { children } = $props();

	$effect(() => {
		if (browser) themeStore.init();
	});
</script>

{@render children()}
