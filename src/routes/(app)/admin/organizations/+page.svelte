<script lang="ts">
	import { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import AdminOrgsHUD from './AdminOrgsHUD.svelte';
	import AdminOrgsArena from './AdminOrgsArena.svelte';
		
	import '$lib/styles/enterprise-console.css';

	let engine = new AdminOrgsEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
	data-admin-shell="true"
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
