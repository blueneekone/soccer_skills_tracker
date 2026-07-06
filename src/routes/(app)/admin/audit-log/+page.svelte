<script lang="ts">
	import { AdminAuditEngine } from './AdminAuditEngine.svelte.js';
	import AdminAuditHUD from './AdminAuditHUD.svelte';
	import AdminAuditArena from './AdminAuditArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	export const ssr = false;

	const engine = new AdminAuditEngine();
	engine.subscribe();
</script>

<div class="al-page">
	<AdminAuditHUD {engine} />
	<AdminAuditArena {engine} />
</div>
