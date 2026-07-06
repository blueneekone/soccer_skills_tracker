<script lang="ts">
	import { SystemSettingsEngine } from './SystemSettingsEngine.svelte.js';
	import SystemSettingsArena from './SystemSettingsArena.svelte';
	
	const engine = new SystemSettingsEngine();
	engine.subscribe();
</script>

<div class="tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-gap-[clamp(32px,4vw,48px)] tw-bg-[#0B0F19] tw-text-[#FAFAFA]">
	<header class="tw-flex tw-flex-col tw-gap-2">
		<h1 class="tw-font-sans tw-tracking-tight tw-text-3xl tw-font-bold tw-text-[#FAFAFA]">System Settings</h1>
		<p class="tw-text-[#D4D4D8]">Global platform configurations and integrations.</p>
	</header>
	<SystemSettingsArena {engine} />
</div>
