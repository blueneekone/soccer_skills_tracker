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
</style>
