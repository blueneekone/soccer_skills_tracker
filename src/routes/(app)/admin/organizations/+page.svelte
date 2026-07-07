<script lang="ts">
	import { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import AdminOrgsHUD from './AdminOrgsHUD.svelte';
	import AdminOrgsArena from './AdminOrgsArena.svelte';
		
	import '$lib/styles/enterprise-console.css';
	

	const engine = new AdminOrgsEngine();
	engine.subscribe();
</script>

<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full">
	<div class="xl:tw-col-span-12 tw-min-w-0">
		<section class="tw-w-full orgs-panel orgs3-page">
			<AdminOrgsHUD {engine} />
			<AdminOrgsArena {engine} />
		</section>
	</div>
</div>

