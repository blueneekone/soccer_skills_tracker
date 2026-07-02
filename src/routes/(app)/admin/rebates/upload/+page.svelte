<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { RebatesEngine } from './RebatesEngine.svelte.js';
	import RebatesHUD from './RebatesHUD.svelte';
	import RebatesArena from './RebatesArena.svelte';
	import '$lib/styles/rebates.css';

	// ── Guard: super_admin only ─────────────────────────────────────────────
	$effect(() => {
		const role = authStore.userProfile?.role ?? '';
		if (!['super_admin', 'global_admin'].includes(role)) {
			goto('/director');
		}
	});

	const engine = new RebatesEngine();
</script>

<div class="upload-page">
	<RebatesHUD {engine} />
	<RebatesArena {engine} />
</div>
