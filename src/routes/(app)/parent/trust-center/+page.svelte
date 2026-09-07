<script lang="ts">
	import { TrustCenterEngine } from './TrustCenterEngine.svelte';
	import TrustCenterArena from './TrustCenterArena.svelte';

	const engine = new TrustCenterEngine();

	$effect(() => {
		engine.init();
		return () => engine.destroy();
	});
</script>

<svelte:head>
	<title>Co-op Trust Center · Parent OS</title>
</svelte:head>

<TrustCenterArena {engine} />
