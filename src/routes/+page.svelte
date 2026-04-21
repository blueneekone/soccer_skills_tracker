<script>
	import { goto } from '$app/navigation';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isAuthenticated && authStore.isProfileComplete) {
			goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
		} else if (authStore.isAuthenticated && !authStore.isProfileComplete) {
			goto('/setup', { replaceState: true });
		} else {
			goto('/login', { replaceState: true });
		}
	});
</script>

<div class="splash-loading">
	<div class="splash-spinner"></div>
</div>

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
		border: 4px solid rgba(255,255,255,0.2);
		border-top-color: var(--aggie-gold);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
