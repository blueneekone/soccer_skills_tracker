<script lang="ts">
	import VpcEngine from './VpcEngine.svelte';
	import VpcArena from './VpcArena.svelte';
	import VpcHUD from './VpcHUD.svelte';

	let engine = new VpcEngine();
</script>

<div class="tw-h-[100dvh] tw-overflow-hidden tw-flex tw-flex-col tw-items-center tw-p-8 tw-bg-[#0f172a]">
	<div class="tw-w-full tw-max-w-4xl tw-flex tw-flex-col tw-gap-8">
		<VpcHUD {engine} />
		<VpcArena {engine} />
	</div>
</div>
