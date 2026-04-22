<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { auth } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore, resolveTeamsLoadScope } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import { featureFlagsStore } from '$lib/stores/featureFlags.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { isRouteAllowedForRole } from '$lib/auth/route-policies.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import ParentFcmPrompt from '$lib/components/notifications/ParentFcmPrompt.svelte';
	import EnterpriseConsoleShell from '$lib/components/shell/EnterpriseConsoleShell.svelte';
	import PlayerShell from '$lib/components/shell/PlayerShell.svelte';
	import PlayerDetailDrawer from '$lib/components/shell/PlayerDetailDrawer.svelte';
	import MaintenanceGate from '$lib/components/shell/MaintenanceGate.svelte';
	import ImpersonationBanner from '$lib/components/shell/ImpersonationBanner.svelte';

	let { children } = $props();

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

	// Sprint 2.7 — subscribe to platform feature flags (maintenance mode kill
	// switch). Subscription requires an authenticated session; we tear it down
	// on sign-out to avoid permission-denied snapshot errors.
	$effect(() => {
		if (!authStore.isAuthenticated || authStore.isLoading) {
			featureFlagsStore.teardown();
			return;
		}
		featureFlagsStore.subscribe();
		return () => {
			featureFlagsStore.teardown();
		};
	});

	// Sprint 2.6.1 — claims-driven impersonation detection.
	// `impersonationStore` listens to `onIdTokenChanged`, which fires across
	// tabs when Firebase Auth's IndexedDB-persisted session changes. This
	// guarantees the banner renders in EVERY tab that inherits an
	// impersonation session, closing the previous cross-tab desync hole.
	$effect(() => {
		impersonationStore.init();
		return () => {
			impersonationStore.teardown();
		};
	});

	// Auth guard + role guard + COPPA 2026 minor holding gate.
	// untrack() on every goto() prevents the URL change from re-triggering this effect,
	// which would otherwise create an infinite reactive loop.
	$effect(() => {
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated) {
			untrack(() => goto('/login', { replaceState: true }));
			return;
		}
		if (!authStore.isProfileComplete) {
			untrack(() => goto('/setup', { replaceState: true }));
			return;
		}

		// COPPA 2026 / Privacy Shield: minor players must remain on /vpc-pending
		// until a parent completes consent AND a director approves the VPC request.
		const prof = authStore.userProfile;
		const currentPath = page.url.pathname;
		if (
			authStore.role === 'player' &&
			prof?.isMinor === true &&
			prof?.vpcStatus !== 'verified' &&
			prof?.vpcStatus !== 'not_required' &&
			!currentPath.startsWith('/vpc-pending')
		) {
			untrack(() => goto('/vpc-pending', { replaceState: true }));
			return;
		}

		if (!isRouteAllowedForRole(currentPath, authStore.role)) {
			const dest = untrack(() => applyLoginWaterfall(authStore.role, authStore.userProfile));
			untrack(() => goto(dest, { replaceState: true }));
			return;
		}
	});

	// Scoped teams/clubs by route + role (never full `teams` except Super Admin on /admin).
	$effect(() => {
		if (!authStore.isAuthenticated || authStore.isLoading) return;
		const path = page.url.pathname;
		const scope = resolveTeamsLoadScope(path, authStore.role);
		void teamsStore.load(authStore.role, {
			clubId: authStore.userProfile?.clubId,
			coachEmail: authStore.user?.email,
			scope,
			routePath: path,
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
		if (authStore.role === 'super_admin' && path.startsWith('/coach')) {
			const qaTid = workspaceContextStore.activeTeamId?.trim();
			if (qaTid) workoutsStore.loadForTeam(qaTid);
		}
		if (authStore.userProfile?.teamId && authStore.userProfile.teamId !== 'admin') {
			brandingStore.loadForTeam(authStore.userProfile.teamId);
		}
	});

	// Reset club/team scope on navigation so Context Switcher pivots do not bleed tenants.
	$effect(() => {
		if (!browser || !authStore.isAuthenticated || authStore.isLoading) return;
		const path = page.url.pathname;
		const pivot = workspaceContextStore.activePivotKey;
		const prof = authStore.userProfile;

		workspaceContextStore.resetScope();

		if (path.startsWith('/admin')) {
			workspaceContextStore.setActiveContext('admin');
		} else if (path.startsWith('/director')) {
			const cid = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';
			if (cid) workspaceContextStore.setActiveClubId(cid);
			workspaceContextStore.setActiveContext('director');
		} else if (path.startsWith('/registrar')) {
			const cid = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';
			if (cid) workspaceContextStore.setActiveClubId(cid);
			workspaceContextStore.setActiveContext('registrar');
		} else if (path.startsWith('/coach')) {
			const m = /^ctx-coach-(.+)$/.exec(pivot);
			if (m?.[1]) workspaceContextStore.setActiveTeamId(m[1]);
			else if (prof?.teamId && prof.teamId !== 'admin') {
				workspaceContextStore.setActiveTeamId(prof.teamId);
			}
			workspaceContextStore.setActiveContext('coach');
		} else if (path.startsWith('/recruiter')) {
			workspaceContextStore.setActiveContext('recruiter');
		} else if (path.startsWith('/parent')) {
			workspaceContextStore.setActiveContext('household');
		} else {
			workspaceContextStore.setActiveContext('household');
		}
	});

	// Super Admin QA: default active club/team from loaded org data when profile has no tenant.
	$effect(() => {
		if (!browser || !authStore.isAuthenticated || authStore.isLoading) return;
		if (authStore.role !== 'super_admin') return;
		const path = page.url.pathname;
		const clubs = teamsStore.clubs;
		const teamRows = teamsStore.teams;
		if ((path.startsWith('/director') || path.startsWith('/registrar')) && clubs.length > 0) {
			const cur = workspaceContextStore.activeClubId?.trim();
			if (!cur) workspaceContextStore.setActiveClubId(clubs[0].id);
		} else if (path.startsWith('/coach') && teamRows.length > 0) {
			const cur = workspaceContextStore.activeTeamId?.trim();
			if (!cur) workspaceContextStore.setActiveTeamId(teamRows[0].id);
		}
	});

	$effect(() => {
		if (!authStore.isAuthenticated || authStore.isLoading) {
			clubBrandingStore.clear();
			return;
		}
		const path = page.url.pathname;
		let cid = typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '';
		if (authStore.role === 'super_admin' && (path.startsWith('/director') || path.startsWith('/registrar'))) {
			const a = workspaceContextStore.activeClubId?.trim();
			if (a) cid = a;
			else if (!cid || cid === 'admin') cid = teamsStore.clubs[0]?.id || '';
		}
		clubBrandingStore.loadForClub(cid || '');
	});

	// Universal enterprise shell: theme follows user preference (no forced athlete dark mode).
	$effect(() => {
		if (typeof document === 'undefined' || authStore.isLoading) return;
		document.documentElement.classList.remove('player-elite', 'player-portal-theme', 'recruiter-scout-theme');
		themeStore.apply();
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.add('enterprise-console-active');
	});

	// Sprint 2.7 — Global Kill Switch: block rendering for every role except
	// super_admin when maintenanceMode === true. Super admins retain full access
	// so they can disable the flag from System Settings → Feature Flags.
	const maintenanceLockout = $derived(
		featureFlagsStore.loaded &&
			featureFlagsStore.maintenanceMode &&
			authStore.role !== 'super_admin'
	);
</script>

{#if authStore.isLoading}
	<div class="splash-loading">
		<div class="splash-spinner"></div>
	</div>
{:else if maintenanceLockout}
	<!-- Sprint 2.7: Global Kill Switch — full-screen maintenance UI. -->
	<MaintenanceGate message={featureFlagsStore.maintenanceMessage} />
{:else if authStore.isAuthenticated && authStore.isProfileComplete}
	{#if impersonationStore.active}
		<ImpersonationBanner />
	{/if}
	<ParentFcmPrompt />
	{#if authStore.role === 'player'}
		<!-- Player OS: dark-mode, gamified, mobile-first shell -->
		<PlayerShell>
			{@render children()}
		</PlayerShell>
	{:else}
		<!-- Enterprise shell: admin, director, coach, registrar, recruiter, parent -->
		<EnterpriseConsoleShell>
			{@render children()}
		</EnterpriseConsoleShell>
		<PlayerDetailDrawer />
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
