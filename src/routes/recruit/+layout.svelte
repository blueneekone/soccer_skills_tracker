<script>
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		const el = document.documentElement;
		const hadDark = el.classList.contains('dark');
		el.classList.add('dark');
		return () => {
			if (!hadDark) el.classList.remove('dark');
		};
	});
</script>

<div class="recruit-landing-root">
	{@render children()}
</div>

<style>
	.recruit-landing-root {
		min-height: 100vh;
		padding: clamp(20px, 4vw, 40px) 16px 56px;
		box-sizing: border-box;
		max-width: 1100px;
		margin: 0 auto;
	}
</style>
