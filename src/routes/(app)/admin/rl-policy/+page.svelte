<script lang="ts">
	/**
	 * /admin/rl-policy — RL Adaptive Policy Admin Console
	 * ─────────────────────────────────────────────────────
	 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S10)
	 *
	 * Role-gated to super_admin. Vanguard Trinity shell:
	 *   Engine (RlPolicyEngine.svelte.ts) — state + callables
	 *   Arena  (RlPolicyArena.svelte)     — training run table + controls
	 *   HUD    (RlPolicyHUD.svelte)       — floating status strip
	 */
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { RlPolicyEngine } from './RlPolicyEngine.svelte.js';
	import RlPolicyArena from './RlPolicyArena.svelte';
	import RlPolicyHUD from './RlPolicyHUD.svelte';

	const engine = new RlPolicyEngine();

	const isSuper = $derived(
		authStore.userProfile?.role === 'super_admin' ||
		(authStore.user?.email === 'admin@soccer-skills-tracker.com')
	);

	$effect(() => {
		if (isSuper) {
			engine.subscribe();
			return () => engine.unsubscribe();
		}
	});
</script>

<div class="page-shell">
	{#if !isSuper}
		<div class="access-denied">
			<span class="mono tw-text-[10px] tw-tracking-widest tw-text-white/20">
				[ ACCESS DENIED — SUPER_ADMIN ROLE REQUIRED ]
			</span>
		</div>
	{:else}
		<!-- Page header -->
		<div class="page-header">
			<div>
				<span class="page-mono">[ // RL ADAPTIVE POLICY CONSOLE ]</span>
				<h1 class="page-title">Policy Control Center</h1>
			</div>
		</div>

		<!-- HUD strip (sticky) -->
		<RlPolicyHUD {engine} />

		<!-- Main content arena -->
		{#if engine.isLoading}
			<div class="loading-state">
				<span class="page-mono tw-animate-pulse">[ LOADING POLICY STATE... ]</span>
			</div>
		{:else}
			<RlPolicyArena {engine} />
		{/if}
	{/if}
</div>

<style>
	.page-shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-mono {
		font-family: monospace;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		color: rgba(0, 212, 255, 0.5);
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.35rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: #e2e8f0;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.access-denied {
		display: flex;
		justify-content: center;
		padding: 4rem 0;
	}

	.loading-state {
		display: flex;
		justify-content: center;
		padding: 3rem 0;
	}

	.mono {
		font-family: monospace;
	}
</style>
