<script lang="ts">
	import SupportAgentArena from '$lib/components/admin/support/SupportAgentArena.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
</script>

<svelte:head>
	<title>Support Terminal | Admin OS</title>
</svelte:head>

<div class="st-layout">
	<header class="st-header">
		<h1 class="st-h1">VANGUARD SUPPORT TERMINAL</h1>
		<p class="st-desc">Direct Admin SDK execution bridge for global support agents.</p>
	</header>

	{#if authStore.isLoading}
		<p class="st-muted">Authenticating connection...</p>
	{:else if !['global_admin', 'super_admin'].includes(authStore.role ?? '')}
		<div class="st-error">
			<h3 class="st-err-h">ACCESS DENIED</h3>
			<p>Your current clearance level ({authStore.role || 'none'}) is insufficient for the Support Terminal.</p>
		</div>
	{:else}
		<div class="st-content">
			<SupportAgentArena />
		</div>
	{/if}
</div>

<style>
	.st-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		gap: 2rem;
	}

	.st-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.st-h1 {
		margin: 0;
		font-family: 'Geist Mono', monospace;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: #f8fafc;
		text-transform: uppercase;
	}

	.st-desc {
		margin: 0;
		font-family: 'Switzer', sans-serif;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.st-content {
		flex: 1;
		min-height: 0;
	}

	.st-muted {
		font-family: 'Geist Mono', monospace;
		color: rgba(255, 255, 255, 0.5);
	}

	.st-error {
		padding: 2rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 12px;
	}

	.st-err-h {
		margin: 0 0 0.5rem;
		font-family: 'Geist Mono', monospace;
		font-size: 1.1rem;
		font-weight: 700;
		color: #fca5a5;
		letter-spacing: 0.05em;
	}
</style>
