<script lang="ts">
	import { SystemSettingsEngine } from './SystemSettingsEngine.svelte.js';
	import SystemSettingsHUD from './SystemSettingsHUD.svelte';
	import SystemSettingsArena from './SystemSettingsArena.svelte';
	import '$lib/styles/enterprise-console.css';
	import '$lib/styles/system-settings.css';

	const engine = new SystemSettingsEngine();
	engine.subscribe();
</script>

<div class="ss-page">
	<SystemSettingsHUD {engine} />
	<SystemSettingsArena {engine} />
</div>
