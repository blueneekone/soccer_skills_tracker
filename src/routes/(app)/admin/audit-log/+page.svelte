<script lang="ts">
	import { AdminAuditEngine } from './AdminAuditEngine.svelte.js';
	import AdminAuditHUD from './AdminAuditHUD.svelte';
	import AdminAuditArena from './AdminAuditArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	const engine = new AdminAuditEngine();
	engine.subscribe();
</script>

<div class="pd-page-root al-page tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1">
	<AdminAuditHUD {engine} />
	<AdminAuditArena {engine} />
</div>
