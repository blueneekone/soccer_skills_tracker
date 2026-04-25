<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { signOut } from 'firebase/auth';
	import { auth } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import '$lib/styles/player-shell.css';

	let disconnectBusy = $state(false);

	async function disconnect() {
		if (disconnectBusy) return;
		disconnectBusy = true;
		try {
			await signOut(auth);
		} catch (e) {
			console.error('[PlayerShell] signOut', e);
		} finally {
			disconnectBusy = false;
		}
		await goto('/login', { replaceState: true });
	}

	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();

	const totalXp = $derived(
		typeof authStore.userProfile?.totalXp === 'number' ? authStore.userProfile.totalXp : 0,
	);

	const playerName = $derived(
		authStore.userProfile?.playerName || authStore.user?.email?.split('@')[0] || 'Athlete',
	);

	const firstName = $derived(
		String(playerName)
			.trim()
			.split(/\s+/)[0] || playerName,
	);

	/** Bottom / rail nav — HQ first, then core athlete loops. */
	const NAV_LINKS = [
		{ href: '/player/dashboard', icon: 'ph-squares-four', label: 'HQ' },
		{ href: '/stats', icon: 'ph-chart-bar', label: 'Stats' },
		{ href: '/player/workout', icon: 'ph-list-checks', label: 'Train' },
		{ href: '/trophies', icon: 'ph-trophy', label: 'Trophies' },
		{ href: '/challenges', icon: 'ph-medal', label: 'Challenges' },
		{ href: '/settings', icon: 'ph-gear', label: 'Settings' },
	];

	/**
	 * @param {string} href
	 */
	function isActive(href) {
		const path = page.url.pathname;
		if (path === href) return true;
		/* Avoid treating every /player/* route as HQ */
		if (href === '/player/dashboard') return false;
		return path.startsWith(href + '/');
	}
</script>

<div class="ps-root tw-w-full tw-max-w-[100vw] tw-overflow-x-hidden">
	<div class="ps-ambient" aria-hidden="true">
		<div class="ps-ambient__grid"></div>
		<div class="ps-ambient__glow ps-ambient__glow--a"></div>
		<div class="ps-ambient__glow ps-ambient__glow--b"></div>
	</div>

	<nav class="ps-bottom-nav" aria-label="Player navigation">
		{#each NAV_LINKS as link (link.href)}
			<a
				class="ps-bottom-nav__link"
				class:ps-bottom-nav__link--active={isActive(link.href)}
				href={link.href}
				aria-current={isActive(link.href) ? 'page' : undefined}
				data-sveltekit-preload-data="hover"
			>
				<i class="ph {link.icon} ps-bottom-nav__icon" aria-hidden="true"></i>
				<span class="ps-bottom-nav__label">{link.label}</span>
			</a>
		{/each}
	</nav>

	<div class="ps-stack">
		<header class="ps-topbar">
			<div class="ps-topbar__brand">
				<span class="ps-topbar__mark" aria-hidden="true">
					<i class="ph ph-polygon"></i>
				</span>
				<div class="ps-topbar__hello">
					<span class="ps-topbar__greet">Player OS</span>
					<span class="ps-topbar__name">{firstName}</span>
				</div>
			</div>
			<div class="ps-topbar__actions tw-flex tw-min-w-0 tw-shrink-0 tw-items-center tw-gap-2">
				<button
					type="button"
					class="tw-min-h-11 tw-min-w-[5.5rem] tw-shrink-0 tw-touch-manipulation tw-border tw-border-red-500/30 tw-bg-black/40 tw-px-3 tw-py-2.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-500 tw-transition-colors hover:tw-border-red-500/60 hover:tw-bg-red-950/50 hover:tw-text-red-400 active:tw-bg-red-950/70 disabled:tw-opacity-50"
					disabled={disconnectBusy}
					onclick={disconnect}
				>
					{disconnectBusy ? '…' : 'DISCONNECT'}
				</button>
				<div class="ps-topbar__ring" aria-label="XP progress ring">
					<LevelProgressRing {totalXp} size="md" variant="dark" />
				</div>
			</div>
		</header>

		<main class="ps-canvas">
			{@render children?.()}
		</main>
	</div>
</div>
