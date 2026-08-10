<script lang="ts">
	import { AdminAuditEngine } from './AdminAuditEngine.svelte.js';
	import AdminAuditHUD from './AdminAuditHUD.svelte';
	import AdminAuditArena from './AdminAuditArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	export const ssr = false;

	const engine = new AdminAuditEngine();
	engine.subscribe();
</script>

<div class="pd-page-root al-page st-bento">
	<AdminAuditHUD {engine} />
	<AdminAuditArena {engine} />
</div>
