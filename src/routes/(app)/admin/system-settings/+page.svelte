<script lang="ts">
	import { SystemSettingsEngine } from './SystemSettingsEngine.svelte.js';
	import SystemSettingsArena from './SystemSettingsArena.svelte';
	
	const engine = new SystemSettingsEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-gap-[clamp(24px,3vw,36px)] tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border tw-overflow-y-auto"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
	data-admin-shell="true"
>
	<header class="tw-border-b tw-border-[#334155] tw-pb-4">
		<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0 tw-leading-none">System Settings</h1>
		<p class="tw-text-[#94A3B8] tw-text-sm tw-font-mono tw-mt-2">Global platform configurations, integrations, and operational parameters.</p>
	</header>
	<SystemSettingsArena {engine} />
</div>
