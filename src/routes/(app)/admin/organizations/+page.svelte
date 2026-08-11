<script lang="ts">
	import { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import AdminOrgsHUD from './AdminOrgsHUD.svelte';
	import AdminOrgsArena from './AdminOrgsArena.svelte';
		
	import '$lib/styles/enterprise-console.css';

	let engine = new AdminOrgsEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root bento-grid-container tw-w-full"
	style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); gap: clamp(16px, 2vw, 24px); height: 100dvh; max-height: 100dvh; overflow: hidden; box-sizing: border-box; padding: var(--bento-pad-liquid, clamp(16px, 2vw, 24px)); flex: 1 1 auto; min-height: 0;"
>
	<div class="st-bento orgs-card tw-min-w-0" style="grid-column: 1 / -1; display: flex; flex-direction: column; min-height: 0; height: 100%;">
		<section class="tw-w-full orgs-panel orgs3-page tw-flex tw-flex-col tw-min-h-0 tw-h-full">
			<AdminOrgsHUD bind:engine />
			<div class="tw-flex-1 tw-min-h-0" style="overflow-y: auto;">
				<AdminOrgsArena bind:engine />
			</div>
		</section>
	</div>
</div>
