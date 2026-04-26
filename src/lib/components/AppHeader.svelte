<script>
	import { goto } from '$app/navigation';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import { clubSportIconSuffix } from '$lib/utils/sport-icon.js';

	const goHome = () =>
		goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });

	const displayName = $derived(
		authStore.userProfile?.playerName ||
		(authStore.role ? authStore.role.charAt(0).toUpperCase() + authStore.role.slice(1) : 'Player')
	);

	const sportIcon = $derived(clubSportIconSuffix(clubBrandingStore.sport));
</script>

<header class="app-header">
	<button class="header-home-btn" onclick={goHome} aria-label="Go to home">
		<div class="header-brand-row">
			{#if authStore.userProfile?.clubId}
				<ClubLogoMark size="md" />
			{:else}
				<i class="ph {sportIcon} header-sport-icon" aria-hidden="true"></i>
			{/if}
			<div class="header-titles">
				<h3 class="app-title">{brandingStore.appName || 'SSTRACKER'}</h3>
				<div class="player-info">Player: <span class="font-bold">{displayName}</span></div>
			</div>
		</div>
	</button>
	<div class="header-action-group">
		<button
			class="header-icon-btn"
			type="button"
			onclick={() => goto('/settings')}
			aria-label="Profile and settings"
		>
			<i class="ph ph-gear"></i>
		</button>
		{#if authStore.role !== 'super_admin' && authStore.role !== 'global_admin'}
			<button class="action-btn btn-support text-white" onclick={() => goto('/support')}>
				<i class="ph ph-lifebuoy support-icon"></i>
				<span class="support-text">Support</span>
			</button>
		{/if}
		<button class="nav-logout-btn" type="button" onclick={() => void handleSignOut()}>Sign Out</button>
	</div>
</header>

<style>
	.header-brand-row {
		display: flex;
		align-items: center;
		gap: 12px;
		text-align: left;
	}

	.header-sport-icon {
		font-size: 2rem;
		color: var(--aggie-gold);
		filter: drop-shadow(0 2px 6px rgba(245, 158, 11, 0.35));
		flex-shrink: 0;
	}

	.header-titles {
		min-width: 0;
	}

	.header-home-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.header-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		color: var(--text-primary);
		cursor: pointer;
	}

	.header-icon-btn i {
		font-size: 1.25rem;
	}
</style>
