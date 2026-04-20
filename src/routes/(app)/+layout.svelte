<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import { isRouteAllowedForRole } from '$lib/auth/route-policies.js';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ParentFcmPrompt from '$lib/components/notifications/ParentFcmPrompt.svelte';
	import EnterpriseConsoleShell from '$lib/components/shell/EnterpriseConsoleShell.svelte';

	let { children } = $props();

	const isEnterpriseConsole = $derived(
		$page.url.pathname.startsWith('/director') || $page.url.pathname.startsWith('/admin')
	);
	const enterpriseVariant = $derived($page.url.pathname.startsWith('/admin') ? 'admin' : 'director');

	// Sync club license doc for read-only / pricing UX — super_admin exempt.
	$effect(() => {
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated || !authStore.isProfileComplete) {
			licenseEntitlementStore.syncFromUser(null);
			return;
		}
		if (authStore.role === 'super_admin') {
			licenseEntitlementStore.syncFromUser(null);
			return;
		}
		licenseEntitlementStore.syncFromUser(auth.currentUser);
	});

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

	$effect(() => {
		if (!authStore.isAuthenticated || authStore.isLoading) {
			clubBrandingStore.clear();
			return;
		}
		const cid = authStore.userProfile?.clubId;
		clubBrandingStore.loadForClub(cid || '');
	});

	// Elite Player Portal: dark, high-contrast athlete shell.
	$effect(() => {
		if (typeof document === 'undefined' || authStore.isLoading) return;
		const elite =
			authStore.role === 'player' &&
			authStore.isProfileComplete &&
			authStore.isAuthenticated;
		const recruiterScout =
			authStore.isAuthenticated &&
			authStore.isProfileComplete &&
			$page.url.pathname.startsWith('/recruiter');
		document.documentElement.classList.toggle('player-elite', elite);
		document.documentElement.classList.toggle('player-portal-theme', elite);
		document.documentElement.classList.toggle('recruiter-scout-theme', recruiterScout);
		if (elite || recruiterScout) {
			document.documentElement.classList.add('dark');
		} else {
			themeStore.apply();
		}
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('enterprise-console-active', isEnterpriseConsole);
	});
</script>

{#if authStore.isLoading}
	<div class="splash-loading">
		<div class="splash-spinner"></div>
	</div>
{:else if authStore.isAuthenticated && authStore.isProfileComplete}
	<ParentFcmPrompt />
	{#if isEnterpriseConsole}
		<EnterpriseConsoleShell variant={enterpriseVariant}>
			{@render children()}
		</EnterpriseConsoleShell>
	{:else}
		<div class="app-shell">
			<AppHeader />
			<main class="container app-main">
				{@render children()}
			</main>
			<BottomNav />
		</div>
	{/if}
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
