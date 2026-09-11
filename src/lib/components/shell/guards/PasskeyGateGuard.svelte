<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack, type Snippet } from 'svelte';
	import { auth } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { PASSKEY_ENROLL_ROUTE, requiresPasskeyEnrollmentBeforeApp, userHasLegacyEmailProvider } from '$lib/auth/passkeyGate.js';

	let { children }: { children?: Snippet } = $props();

	let passkeyEligibilityConfirmed = $state(true);

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		
		let cancelled = false;
		void (async () => {
			let requiresPasskey = false;

			try {
				const user = auth.currentUser;
				const legacyProbe = !!user && authStore.isProfileComplete && userHasLegacyEmailProvider(user);

				if (legacyProbe && !cancelled) {
					untrack(() => { passkeyEligibilityConfirmed = false; });
				}

				if (user) {
					try {
						requiresPasskey = await requiresPasskeyEnrollmentBeforeApp(user);
					} catch (err) {
						console.warn('[PasskeyGate] enrollment check failed', err);
					}
				}

				if (cancelled || !browser) return;

				const currentPath = untrack(() => page.url.pathname);
				
				if (requiresPasskey && !currentPath.startsWith(PASSKEY_ENROLL_ROUTE)) {
					await untrack(() => goto(PASSKEY_ENROLL_ROUTE, { replaceState: true }));
					return;
				}
			} finally {
				if (!cancelled && !requiresPasskey) {
					untrack(() => { passkeyEligibilityConfirmed = true; });
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

{#if passkeyEligibilityConfirmed && children}
	{@render children()}
{/if}
