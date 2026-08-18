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
	<header class="tw-flex tw-flex-col tw-gap-2">
		<h1 class="tw-font-sans tw-tracking-tight tw-text-3xl tw-font-bold tw-text-[#FAFAFA]">System Settings</h1>
		<p class="tw-text-[#D4D4D8]">Global platform configurations and integrations.</p>
	</header>
	<SystemSettingsArena {engine} />
</div>
