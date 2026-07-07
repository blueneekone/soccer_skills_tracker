<script lang="ts">
	/* global document, console, window */
	/* eslint-disable svelte/no-navigation-without-resolve, max-lines-per-function */
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { dopamineExplosion } from '$lib/services/dopamine.svelte.js';
	import { auth, db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
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
	import { isDataCollectionRoute, isRouteAllowedForRole } from '$lib/auth/route-policies.js';
	import { PASSKEY_ENROLL_ROUTE, requiresPasskeyEnrollmentBeforeApp, userHasLegacyEmailProvider } from '$lib/auth/passkeyGate.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import ParentFcmPrompt from '$lib/components/notifications/ParentFcmPrompt.svelte';
	import EnterpriseConsoleShell from '$lib/components/shell/EnterpriseConsoleShell.svelte';
	import PlayerShell from '$lib/components/shell/PlayerShell.svelte';
	import PlayerDetailDrawer from '$lib/components/admin/PlayerDetailDrawer.svelte';
	import MaintenanceGate from '$lib/components/shell/MaintenanceGate.svelte';
	import ImpersonationBanner from '$lib/components/shell/ImpersonationBanner.svelte';
	import OfflineBanner from '$lib/components/shell/OfflineBanner.svelte';
	import ConsentOverlay from '$lib/components/coppa/ConsentOverlay.svelte';
	import ReportAnomaly from '$lib/components/alpha/ReportAnomaly.svelte';
	import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
	import VanguardAppMark from '$lib/components/ui/VanguardAppMark.svelte';
	import MiniPlayer from '$lib/components/media/MiniPlayer.svelte';
	import VanguardVFX from '../../components/VanguardVFX.svelte';
	import LoadoutUnlockCeremony from '$lib/components/player/LoadoutUnlockCeremony.svelte';
	import NexusSidebar from '$lib/components/layout/NexusSidebar.svelte';
	import AlertMatrix from '$lib/components/layout/AlertMatrix.svelte';
	import {
		connectLoadoutUnlockListener,
		disconnectLoadoutUnlockListener,
		resetLoadoutUnlockQueue,
	} from '$lib/services/loadoutUnlocks.svelte.js';

	/**
	 * Fallback accent colors per sport — used when sports_configs Firestore
	 * doc is missing or not yet loaded.  These mirror the BASE_SPORTS_CONFIGS
	 * defined in `functions/src/seeders/sportsSeeder.js`.
	 */
	const SPORT_FALLBACK_ACCENTS = /** @type {Record<string, string>} */ ({
		soccer:     '#14b8a6', // Neon Cyan
		basketball: '#ff6600', // Neon Orange
		lacrosse:   '#00ff66', // Neon Green
		baseball:   '#ffcc00', // Neon Yellow
		volleyball: '#cc00ff', // Neon Purple
	});

	/**
	 * Derives the primary accent from a loaded sport config or the fallback map
	 * and stamps three CSS custom properties on `:root`:
	 *   --vanguard-division-accent       → primary hex
	 *   --vanguard-division-accent-dim   → rgba(..., 0.18)  borders/bg fills
	 *   --vanguard-division-accent-glow  → rgba(..., 0.35)  box-shadow glows
	 *
	 * Also sets `data-sport="<sportId>"` on <html> so global CSS selectors can
	 * apply sport-specific Tailwind overrides without JS re-renders.
	 *
	 * @param {string} sportId
	 * @param {Record<string, unknown> | null} config
	 */
	function applySportTheme(sportId, config) {
		if (typeof document === 'undefined') return;
		const attrs = Array.isArray(config?.attributes) ? config.attributes : [];
		const raw =
			(/** @type {Record<string, unknown>} */ (attrs[0])?.hexColor) ||
			SPORT_FALLBACK_ACCENTS[sportId] ||
			'#14b8a6';
		const hex = String(raw).replace('#', '');
		const r = parseInt(hex.slice(0, 2), 16) || 0;
		const g = parseInt(hex.slice(2, 4), 16) || 240;
		const b = parseInt(hex.slice(4, 6), 16) || 255;
		document.documentElement.style.setProperty('--vanguard-division-accent',      `#${hex}`);
		document.documentElement.style.setProperty('--vanguard-division-accent-dim',  `rgba(${r},${g},${b},0.18)`);
		document.documentElement.style.setProperty('--vanguard-division-accent-glow', `rgba(${r},${g},${b},0.35)`);
		document.documentElement.setAttribute('data-sport', sportId);
	}

	let { children } = $props();

	// Sync club license doc for read-only / pricing UX — Global Admin exempt.
	$effect(() => {
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated || !authStore.isProfileComplete) {
			licenseEntitlementStore.syncFromUser(null);
			return;
		}
		if (authStore.role === 'super_admin' || authStore.role === 'global_admin') {
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

	// Auth guard: driven by `onAuthStateChanged` in `auth.svelte.js` (cache wipe → no user).
	// Firestore-backed passkey check must run BEFORE /setup fallback so legacy / magic-link
	// sessions cannot onboard without enrolling WebAuthn.
	// untrack() on every `goto` avoids reactive loops; `browser` avoids SSR `goto` noise.
	$effect(() => {
		if (!browser || authStore.isLoading) return;

		routeGuardResolved = false;

		if (!authStore.isAuthenticated) {
			passkeyEligibilityConfirmed = true;
			routeGuardResolved = true;
			untrack(() => goto('/login', { replaceState: true }));
			return;
		}

		let cancelled = false;
		void (async () => {
			let requiresPasskey = false;

			try {
				const user = auth.currentUser;
				const legacyProbe =
					!!user &&
					authStore.isProfileComplete &&
					userHasLegacyEmailProvider(user);

				if (legacyProbe && !cancelled) {
					passkeyEligibilityConfirmed = false;
				}

				if (user) {
					try {
						requiresPasskey = await requiresPasskeyEnrollmentBeforeApp(user);
					} catch (err) {
						console.warn('[layout] passkey enrollment check failed', err);
					}
				}

				if (cancelled || !browser) return;

				
				const currentPath = untrack(() => page.url.pathname);
				
				// ── Global Infrastructure Kill Switch ────────────────────────────────
				try {
					const coreSnap = await getDoc(doc(db, 'platform_settings', 'core'));
					if (coreSnap.exists() && coreSnap.data()?.maintenance_mode === true) {
						if (authStore.role !== 'global_admin' && authStore.role !== 'super_admin' && !currentPath.startsWith('/maintenance')) {
							await untrack(() => goto('/maintenance', { replaceState: true }));
							return;
						}
					}
				} catch (e) {
					console.warn('[layout] maintenance check failed', e);
				}
				
				if (requiresPasskey && !currentPath.startsWith(PASSKEY_ENROLL_ROUTE)) {

					await untrack(() => goto(PASSKEY_ENROLL_ROUTE, { replaceState: true }));
					return;
				}

				if (!authStore.isProfileComplete) {
					untrack(() => goto('/setup', { replaceState: true }));
					return;
				}

				const prof = authStore.userProfile;
				const pathVpc = untrack(() => page.url.pathname);
				if (
					authStore.role === 'player' &&
					prof?.isMinor === true &&
					prof?.vpcStatus !== 'verified' &&
					prof?.vpcStatus !== 'not_required' &&
					!pathVpc.startsWith('/vpc-pending')
				) {
					untrack(() => goto('/vpc-pending', { replaceState: true }));
					return;
				}

				// Sprint 2.1 — block data-collection routes until COPPA + VPC consent complete.
				const pathConsent = untrack(() => page.url.pathname);
				if (
					authStore.role === 'player' &&
					!authStore.isConsented &&
					isDataCollectionRoute(pathConsent) &&
					!pathConsent.startsWith('/vpc-pending')
				) {
					untrack(() => goto('/vpc-pending', { replaceState: true }));
					return;
				}

				const clearanceRoles = ['coach', 'recruiter', 'director', 'tutor'];
				const pathClr = untrack(() => page.url.pathname);
				if (
					clearanceRoles.includes(authStore.role ?? '') &&
					!authStore.isCleared &&
					!pathClr.startsWith('/compliance')
				) {
					untrack(() => goto('/compliance', { replaceState: true }));
					return;
				}

				const pathRole = untrack(() => page.url.pathname);
				if (!isRouteAllowedForRole(pathRole, authStore.role)) {
					const dest = untrack(() =>
						applyLoginWaterfall(authStore.role, authStore.userProfile),
					);
					untrack(() => goto(dest, { replaceState: true }));
				}
			} finally {
				if (!cancelled) {
					routeGuardResolved = true;
					if (!requiresPasskey) {
						passkeyEligibilityConfirmed = true;
					}
				}
			}
		})();

		return () => {
			cancelled = true;
		};
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
				authStore.role === 'global_admin' ||
				authStore.role === 'director' ||
				authStore.role === 'registrar'
					? null
					: authStore.userProfile.teamId;
			if (effectiveTid) workoutsStore.loadForTeam(effectiveTid);
		}
		if (
			(authStore.role === 'super_admin' || authStore.role === 'global_admin') &&
			path.startsWith('/coach')
		) {
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

		untrack(() => {
			workspaceContextStore.resetScope();

			if (path.startsWith('/admin')) {
				workspaceContextStore.setActiveContext('admin');
			} else if (path.startsWith('/director')) {
				const cid = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';
				if (cid) workspaceContextStore.setActiveClubId(cid);
				workspaceContextStore.setActiveContext('director');
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
	});

	// Global Admin QA: default active club/team from loaded org data when profile has no tenant.
	$effect(() => {
		if (!browser || !authStore.isAuthenticated || authStore.isLoading) return;
		if (authStore.role !== 'super_admin' && authStore.role !== 'global_admin') return;
		const path = page.url.pathname;
		const clubs = teamsStore.clubs;
		const teamRows = teamsStore.teams;
		if (path.startsWith('/director') && clubs.length > 0) {
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
		if ((authStore.role === 'super_admin' || authStore.role === 'global_admin') && path.startsWith('/director')) {
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

	// ── Sport Theme Engine ──────────────────────────────────────────────────
	// Reactively tracks the active sport division and:
	//   1. Immediately applies fallback accent tokens so the UI never flashes.
	//   2. If the sport config is not yet cached in the store, fetches it from
	//      `sports_configs/{sportId}` in Firestore and stores it for consumers
	//      (AttributeRadar, WorkspaceContextSwitcher footer, drill engines, etc.)
	//   3. Re-stamps CSS custom properties once the real config is loaded.
	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const sportId = workspaceContextStore.activeSportId || 'soccer';
		const cached  = workspaceContextStore.activeSportConfig;

		// Step 1 — instant fallback so borders/glows are correct on every pivot
		applySportTheme(sportId, cached);

		if (cached) return; // config already loaded; nothing more to do

		// Step 2 — async load from Firestore (fire-and-forget; non-fatal)
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'sports_configs', sportId));
				if (cancelled) return;
				const config = snap.exists() ? /** @type {Record<string, unknown>} */ (snap.data()) : null;
				workspaceContextStore.setActiveSportConfig(config);
				// Step 3 — re-apply with real attribute colors now that config is loaded
				applySportTheme(sportId, config);
			} catch (err) {
				// Non-fatal: fallback tokens remain active
				console.warn('[layout] sport config load failed', err);
			}
		})();

		return () => { cancelled = true; };
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		// Sprint 2.20a — enterprise-console-active locks html/body to 100dvh + overflow:hidden
		// (enterprise-console.css:935–944). Player OS uses native document scroll, so the class
		// must not be present on player routes; remove it reactively on role change.
		if (authStore.role === 'player') {
			document.documentElement.classList.remove('enterprise-console-active');
			document.documentElement.classList.remove('dark');
		} else {
			document.documentElement.classList.add('enterprise-console-active');
			document.documentElement.classList.add('dark');
		}
	});

	// Phase 4, Epic 7 — gold supernova fired on every server-confirmed level-up.
	// The 'phoenix:level-up' event is dispatched by the workout page ONLY after
	// commitWorkoutCompletion resolves, tying the visual to a verified commit.
	$effect(() => {
		if (!browser) return;
		const handler = () => void dopamineExplosion('levelUp');
		window.addEventListener('phoenix:level-up', handler);
		return () => window.removeEventListener('phoenix:level-up', handler);
	});

	// Sprint 3.3 — server-verified loadout unlock ceremonies (player only).
	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (authStore.role !== 'player') {
			disconnectLoadoutUnlockListener();
			resetLoadoutUnlockQueue();
			return;
		}
		const email = (authStore.user?.email ?? '').trim().toLowerCase();
		if (!email || !authStore.isProfileComplete) {
			disconnectLoadoutUnlockListener();
			return;
		}
		connectLoadoutUnlockListener(email);
		return () => disconnectLoadoutUnlockListener();
	});

	// Sprint 2.7 — Global Kill Switch: block rendering for every role except
	// Global Admin when maintenanceMode === true. Global Admins retain full
	// access so they can disable the flag from System Settings → Feature Flags.
	// Accepts both legacy `super_admin` and new `global_admin` role tokens.
	const maintenanceLockout = $derived(
		featureFlagsStore.loaded &&
			featureFlagsStore.maintenanceMode &&
			authStore.role !== 'super_admin' &&
			authStore.role !== 'global_admin',
	);

	/**
	 * Hide enterprise / player shells until we know a legacy email session either
	 * has a passkey or is being redirected to enrolment (avoids dashboard flash).
	 */
	let passkeyEligibilityConfirmed = $state(true);

	/** Hide shell until auth guard (passkey, VPC, consent) async checks finish. */
	let routeGuardResolved = $state(false);

	const holdShellForConsent = $derived(
		authStore.role === 'player' &&
			!authStore.isConsented &&
			isDataCollectionRoute(page.url.pathname),
	);
</script>

<!-- Global Vanguard SVG filter defs — referenced by url(#neonBloom) / url(#aresBloom) across every portal. -->
<VanguardVFX />

{#if authStore.isLoading}
	<div
		class="auth-splash"
		role="status"
		aria-live="polite"
		aria-label="Verifying your session with Firebase"
	>
		<div class="auth-splash__mark" aria-hidden="true">
			<VanguardAppMark size={48} />
		</div>
		<div class="auth-splash__spinner" aria-hidden="true"></div>
		<p class="auth-splash__label">VANGUARD</p>
	</div>
{:else if maintenanceLockout}
	<!-- Sprint 2.7: Global Kill Switch — full-screen maintenance UI. -->
	<MaintenanceGate message={featureFlagsStore.maintenanceMessage} />
{:else if authStore.isAuthenticated && authStore.isProfileComplete && passkeyEligibilityConfirmed && routeGuardResolved && !holdShellForConsent}
	<div class="tw-flex tw-w-full tw-h-screen tw-overflow-hidden tw-bg-[#0B0F19]">
		
		<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0 tw-min-h-0 tw-overflow-hidden">
			{#if impersonationStore.active}
				<ImpersonationBanner />
			{/if}
			<!-- Phase 1, Epic 1 — surfaces offline / post-reconnect sync state.
			     Mounts the syncStatus singleton on first render; subsequent
			     navigations are no-ops thanks to the internal init guard. -->
			<OfflineBanner />
			<ParentFcmPrompt />
			<!-- Alpha-phase feedback receptacle — hidden on Player OS (Sprint 2.16). -->
			{#if authStore.role !== 'player'}
				<ReportAnomaly />
			{/if}
			<!-- PWA install prompt — fires when browser emits beforeinstallprompt (Android)
			     or when iOS Safari is detected and app is not in standalone mode. -->
			<InstallPrompt />
			<!-- Global audio player — persists across route changes during podcast sessions. -->
			<MiniPlayer />
	{#if authStore.role === 'player'}
		<!-- Player OS: dark-mode, gamified, mobile-first shell -->
		<PlayerShell>
			{@render children()}
		</PlayerShell>
		<!--
			COPPA 2026 / Privacy Shield — Parental Consent Gate.
			Rendered on top of PlayerShell (z-index: 9999) when:
			  • Player is a minor (isMinor === true from server-side profile)
			  • coppaStatus is not 'granted' (server-written by verifyParentalConsent CF)
			The overlay renders INSIDE the player block so VanguardVFX/scanlines are
			still active beneath it, maintaining the Stark aesthetic.
		-->
		{#if authStore.requiresEmailConsent}
			<ConsentOverlay />
		{/if}
		<LoadoutUnlockCeremony
			playerEmail={(authStore.user?.email ?? '').toLowerCase()}
			operativeAvatar={authStore.userProfile?.operativeAvatar}
			operativeLoadout={authStore.userProfile?.operativeLoadout}
			ownedCosmetics={Array.isArray(authStore.userProfile?.ownedCosmetics) ?
				authStore.userProfile.ownedCosmetics.filter((id) => typeof id === 'string')
			:	[]}
		/>
	{:else}
		<!-- Enterprise shell: admin, director, coach, registrar, recruiter, parent -->
		<EnterpriseConsoleShell>
			{@render children()}
		</EnterpriseConsoleShell>
		<PlayerDetailDrawer />
	{/if}
		</main>
		<!-- Sprint 0.1b: Global Alert Matrix — extracted to AlertMatrix.svelte -->
		<AlertMatrix />
	</div>
{:else}
	<!-- Signed out, incomplete profile, or redirect in flight — never show dashboard chrome -->
	<div
		class="auth-splash auth-splash--quiet"
		role="status"
		aria-live="polite"
		aria-label="Redirecting"
	>
		<div class="auth-splash__spinner" aria-hidden="true"></div>
	</div>
{/if}

<style>
	.auth-splash {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1.25rem;
		min-height: 100dvh;
		background: #020202;
		color: #fafafa;
	}

	.auth-splash--quiet {
		gap: 0.5rem;
	}

	.auth-splash__mark {
		display: flex;
		width: 4rem;
		height: 4rem;
		align-items: center;
		justify-content: center;
		clip-path: polygon(12% 0, 88% 0, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0 88%, 0 12%);
		border: 1px solid #334155;
		background: #05050a;
		box-shadow: 0 0 1.5rem -0.25rem rgba(251, 191, 36, 0.18);
		animation: authPulse 1.6s ease-in-out infinite;
	}

	.auth-splash__label {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: rgba(251, 191, 36, 0.55);
	}

	.auth-splash__spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid rgba(250, 250, 250, 0.12);
		border-top-color: #fbbf24;
		border-radius: 50%;
		animation: authSpin 0.75s linear infinite;
	}

	.auth-splash--quiet .auth-splash__spinner {
		width: 1.75rem;
		height: 1.75rem;
		border-width: 2px;
	}

	@keyframes authSpin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes authPulse {
		0%,
		100% {
			opacity: 0.7;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.04);
		}
	}
</style>
