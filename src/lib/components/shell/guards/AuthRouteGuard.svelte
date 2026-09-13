<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack, type Snippet } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		evaluateAuthRedirect,
		shouldBypassAuth,
		type AuthRoutingContext
	} from './authRoutingEvaluator.js';

	let {
		children,
		onResolved
	}: {
		children?: Snippet;
		onResolved?: (resolved: boolean) => void;
	} = $props();

	function getE2EBypassState() {
		if (typeof window === 'undefined') return null;
		try {
			const enabled = window.localStorage.getItem('sstracker_e2e_bypass') === 'true';
			if (!enabled) return null;
			const rawProfile = window.localStorage.getItem('sstracker_mock_profile');
			if (rawProfile) {
				return { isAuthenticated: true, userProfile: JSON.parse(rawProfile) };
			}
			const raw = window.localStorage.getItem('auth_state');
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function resolveContext(currentPath: string): AuthRoutingContext {
		const e2e = getE2EBypassState();
		const role = e2e?.userProfile?.role || e2e?.session?.role || authStore.role;
		const isAuthenticated = e2e ? (e2e.isAuthenticated ?? true) : authStore.isAuthenticated;
		const isCleared = e2e?.userProfile?.isCleared !== undefined ? e2e.userProfile.isCleared : authStore.userProfile?.isCleared;
		const prof = e2e?.userProfile || authStore.userProfile;

		return {
			currentPath,
			isAuthenticated,
			role,
			isCleared,
			isProfileComplete: e2e ? true : authStore.isProfileComplete,
			isMinor: prof?.isMinor,
			vpcStatus: prof?.vpcStatus || (e2e ? 'VERIFIED' : undefined),
			isConsented: e2e ? true : authStore.isConsented,
			medicalSignatureVerified: prof?.medicalSignatureVerified || (e2e ? true : undefined),
			liabilityWaiverVerified: prof?.liabilityWaiverVerified || (e2e ? true : undefined),
			userProfile: prof
		};
	}

	$effect(() => {
		if (!browser || authStore.isLoading) return;

		const currentPath = page.url.pathname;
		const searchParams = page.url.search;

		if (shouldBypassAuth(currentPath, searchParams)) {
			onResolved?.(true);
			return;
		}

		const context = resolveContext(currentPath);
		const targetRedirect = evaluateAuthRedirect(context);

		if (targetRedirect && targetRedirect !== currentPath) {
			untrack(() => {
				goto(targetRedirect, { replaceState: true });
			});
			return;
		}

		onResolved?.(true);
	});
</script>

{#if children}
	{@render children()}
{/if}
