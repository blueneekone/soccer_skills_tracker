<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { BroadcastEngine } from './BroadcastEngine.svelte.js';
	import BroadcastHUD from './BroadcastHUD.svelte';
	import BroadcastArena from './BroadcastArena.svelte';

	const engine = new BroadcastEngine();

	$effect(() => {
		const targetSession = untrack(() => page.url.searchParams.get('session') || 'live-main-championship');
		engine.connect(targetSession);

		return () => {
			engine.disconnect();
		};
	});
</script>

<svelte:head>
	<title>Fan OS — Live Broadcast & Telemetry Watch</title>
</svelte:head>

<main class="fan-watch-shell tw-min-h-screen tw-bg-[#000000] tw-text-[#fafafa] tw-p-4 md:tw-p-8">
	<div class="tw-max-w-7xl tw-mx-auto">
		<BroadcastHUD {engine} />
		<BroadcastArena {engine} />
	</div>
</main>
