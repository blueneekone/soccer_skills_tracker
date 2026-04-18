<script>
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase.js';
	import { signOut } from 'firebase/auth';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';

	const handleLogout = async () => {
		await signOut(auth);
		goto('/login', { replaceState: true });
	};

	const goHome = () => goto('/home');

	const displayName = $derived(
		authStore.userProfile?.playerName ||
		(authStore.role ? authStore.role.charAt(0).toUpperCase() + authStore.role.slice(1) : 'Player')
	);
</script>

<header class="app-header">
	<button class="header-home-btn" onclick={goHome} aria-label="Go to home">
		<h3 class="app-title">{brandingStore.appName || 'SSTRACKER'}</h3>
		<div class="player-info">Player: <span class="font-bold">{displayName}</span></div>
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
		{#if authStore.role !== 'super_admin'}
			<button class="action-btn btn-support text-white" onclick={() => goto('/support')}>
				<i class="ph ph-lifebuoy support-icon"></i>
				<span class="support-text">Support</span>
			</button>
		{/if}
		<button class="nav-logout-btn" onclick={handleLogout}>Sign Out</button>
	</div>
</header>

<style>
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
