<script>
	import '@fontsource/geist-mono/400.css';
	import '@fontsource/geist-mono/500.css';
	import '@fontsource/geist-mono/600.css';
	import '../../style.css';
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import PwaInstallPrompt from '$lib/components/ui/PwaInstallPrompt.svelte';
	import NativeShellRedirect from '$lib/components/native/NativeShellRedirect.svelte';
	import VanguardVFX from '../components/VanguardVFX.svelte';
	import { fade } from 'svelte/transition';

	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { auth } from '$lib/firebase/config.js';
	import { onAuthStateChanged } from 'firebase/auth';

	let { children } = $props();

	let authInitialized = $state(false);

	$effect(() => {
		if (browser) themeStore.init();
	});

	onMount(() => {
		const unsubscribe = onAuthStateChanged(
			auth,
			(user) => {
				authInitialized = true;
				if (!user && page.url.pathname !== '/login') {
					untrack(() => goto('/login', { replaceState: true }));
				}
			},
			(error) => {
				console.error('Auth loop detected or token rejected:', error);
				auth.signOut();
				if (browser) {
					try {
						indexedDB.deleteDatabase('firebaseLocalStorageDb');
						indexedDB.deleteDatabase('firestore/[DEFAULT]/sports-skill-tracker-dev/main');
					} catch (e) {
						console.error('Failed to wipe IndexedDB caches:', e);
					}
				}
				authInitialized = true;
				untrack(() => goto('/login', { replaceState: true }));
			}
		);
		return unsubscribe;
	});
</script>

<VanguardVFX />

<!-- Base shell: isolate stacking; vanguard-os-shell enforces global HUD chrome + link/button resets -->
<div
	class="vanguard-os-shell tw-relative tw-isolate tw-z-0 tw-min-h-[100dvh] tw-bg-transparent tw-text-slate-300 tw-antialiased"
>
	{#if authInitialized}
		{#key page.url.pathname}
			<div class="tw-min-h-[100dvh]" in:fade={{ duration: 150 }}>
				{@render children()}
			</div>
		{/key}
	{:else}
		<div class="tw-flex tw-items-center tw-justify-center tw-min-h-[100dvh]">
			<span class="tw-animate-pulse tw-font-mono tw-text-slate-500 tw-text-sm tw-tracking-widest">INITIALIZING SECURE CONTEXT...</span>
		</div>
	{/if}
</div>
<NativeShellRedirect />
<PwaInstallPrompt />
