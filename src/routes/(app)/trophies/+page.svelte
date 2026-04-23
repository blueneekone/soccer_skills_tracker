<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import '$lib/styles/director-os.css';

	onMount(() => {
		if (browser) {
			goto('/stats#trophy-room', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Achievements</title>
</svelte:head>

<div class="ec-page ec-trophies view-section trophy-redirect">
	<p class="trophy-redirect__msg font-mono">Routing to achievement matrix…</p>
</div>

<style>
	.trophy-redirect {
		min-height: 40vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000000;
		color: rgba(255, 255, 255, 0.45);
	}

	.trophy-redirect__msg {
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.font-mono {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}
</style>
