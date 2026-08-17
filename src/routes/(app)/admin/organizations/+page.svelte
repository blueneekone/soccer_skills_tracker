<script lang="ts">
	import { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import AdminOrgsHUD from './AdminOrgsHUD.svelte';
	import AdminOrgsArena from './AdminOrgsArena.svelte';
		
	import '$lib/styles/enterprise-console.css';

	let engine = new AdminOrgsEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0"
	style="padding: var(--bento-pad-liquid, clamp(16px, 2vw, 24px)); box-sizing: border-box;"
>
	<div class="orgs-card tw-w-full tw-min-w-0 tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
		<section class="tw-w-full orgs-panel orgs3-page tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
			<AdminOrgsHUD bind:engine />
			<div class="tw-flex-1 tw-min-h-0 tw-w-full" style="overflow-y: auto;">
				<AdminOrgsArena bind:engine />
			</div>
		</section>
	</div>
</div>
