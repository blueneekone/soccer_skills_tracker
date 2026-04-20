<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { isRouteAllowedForRole } from '$lib/auth/route-policies.js';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();

	// Auth guard + role guard
	$effect(() => {
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated) {
			goto('/login', { replaceState: true });
			return;
		}
		if (!authStore.isProfileComplete) {
			goto('/setup', { replaceState: true });
			return;
		}
		const currentPath = $page.url.pathname;
		if (!isRouteAllowedForRole(currentPath, authStore.role)) {
			goto('/home', { replaceState: true });
			return;
		}
	});

	// Load teams + workouts once auth is ready
	$effect(() => {
		if (!authStore.isAuthenticated || authStore.isLoading) return;
		teamsStore.load(authStore.role, {
			clubId: authStore.userProfile?.clubId,
			coachEmail: authStore.user?.email
		});
		if (authStore.userProfile?.teamId) {
			const effectiveTid =
				authStore.role === 'super_admin' ||
				authStore.role === 'director' ||
				authStore.role === 'registrar'
					? null
					: authStore.userProfile.teamId;
			if (effectiveTid) workoutsStore.loadForTeam(effectiveTid);
		}
		if (authStore.userProfile?.teamId && authStore.userProfile.teamId !== 'admin') {
			brandingStore.loadForTeam(authStore.userProfile.teamId);
		}
	});
</script>

{#if authStore.isLoading}
	<div class="splash-loading">
		<div class="splash-spinner"></div>
	</div>
{:else if authStore.isAuthenticated && authStore.isProfileComplete}
	<div class="app-shell">
		<AppHeader />
		<main class="container app-main">
			{@render children()}
		</main>
		<BottomNav />
	</div>
{/if}

<style>
	.splash-loading {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
	}

	.splash-spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--glass-border);
		border-top-color: var(--aggie-gold);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
