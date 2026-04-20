<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';

	const role = $derived(authStore.role);
	const path = $derived($page.url.pathname);
	/** Matches route-policies athlete-only prefixes (+ /trophies). */
	const showAthleteNav = $derived(role === 'player' || role === 'super_admin');
	const showRecruiterNav = $derived(
		role === 'super_admin' ||
			(role === 'director' &&
				licenseEntitlementStore.entitlement &&
				String(licenseEntitlementStore.entitlement.tier || '').toLowerCase() === 'recruiter' &&
				String(licenseEntitlementStore.entitlement.subscription_status || '').toLowerCase() ===
					'active'),
	);

	const nav = (href) => goto(href);
</script>

<nav class="bottom-nav" aria-label="Main navigation">
	<button class="nav-item" class:active={path === '/home'} onclick={() => nav('/home')} aria-label="Home">
		<i class="ph ph-house-simple nav-icon"></i>
		<span class="nav-label">Home</span>
	</button>
	{#if showAthleteNav}
		<button class="nav-item" class:active={path === '/tracker'} onclick={() => nav('/tracker')} aria-label="Log Workout">
			<i class="ph ph-list nav-icon"></i>
			<span class="nav-label">Track</span>
		</button>
		<button class="nav-item" class:active={path === '/stats'} onclick={() => nav('/stats')} aria-label="Stats">
			<i class="ph ph-chart-bar nav-icon"></i>
			<span class="nav-label">Stats</span>
		</button>
		<button class="nav-item" class:active={path === '/trophies'} onclick={() => nav('/trophies')} aria-label="Trophy Room">
			<i class="ph ph-trophy nav-icon"></i>
			<span class="nav-label">Trophies</span>
		</button>
	{/if}
	{#if role === 'coach' || role === 'super_admin' || role === 'director'}
		<button class="nav-item" class:active={path === '/coach'} onclick={() => nav('/coach')} aria-label="Coach Tools">
			<i class="ph ph-megaphone nav-icon"></i>
			<span class="nav-label">Coach</span>
		</button>
	{/if}
	{#if showRecruiterNav}
		<button class="nav-item" class:active={path.startsWith('/recruiter')} onclick={() => nav('/recruiter')} aria-label="Recruiter marketplace">
			<i class="ph ph-binoculars nav-icon"></i>
			<span class="nav-label">Scout</span>
		</button>
	{/if}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding: clamp(8px, 2vw, 12px) clamp(10px, 3vw, 20px);
		background: var(--glass-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-top: 1px solid var(--glass-border);
		z-index: 100;
		gap: 4px;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px 12px;
		border-radius: 16px;
		color: var(--muted-slate);
		font-weight: 700;
		font-size: 0.7rem;
		transition: all 0.2s ease;
		min-width: 52px;
	}

	.nav-item:hover {
		background: var(--surface-subtle);
		color: var(--text-primary);
	}

	.nav-item.active {
		color: var(--text-primary);
		background: rgba(251, 191, 36, 0.2);
	}

	.nav-icon {
		font-size: 1.4rem;
	}

	.nav-label {
		letter-spacing: 0.3px;
	}
</style>
