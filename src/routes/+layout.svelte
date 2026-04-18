<script>
	import '../../style.css';
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte.js';

	let { children } = $props();

	onMount(() => themeStore.init());
</script>

{@render children()}
