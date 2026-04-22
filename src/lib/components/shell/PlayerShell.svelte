<script>
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import '$lib/styles/player-shell.css';

	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();

	const totalXp = $derived(
		typeof authStore.userProfile?.totalXp === 'number' ? authStore.userProfile.totalXp : 0,
	);

	const playerName = $derived(
		authStore.userProfile?.playerName || authStore.user?.email?.split('@')[0] || 'Athlete',
	);

	/** Bottom nav links — mirrors athleteHouseholdLinks without workspace-jumping items. */
	const NAV_LINKS = [
		{ href: '/stats',       icon: 'ph-chart-bar',   label: 'Stats' },
		{ href: '/tracker',     icon: 'ph-list-checks',  label: 'Train' },
		{ href: '/trophies',    icon: 'ph-trophy',       label: 'Trophies' },
		{ href: '/challenges',  icon: 'ph-medal',        label: 'Challenges' },
		{ href: '/settings',    icon: 'ph-gear',         label: 'Settings' },
	];

	/**
	 * Returns true when the given href matches the current pathname.
	 * @param {string} href
	 */
	function isActive(href) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<div class="ps-root">
	<!-- Compact top bar: wordmark + level progress ring -->
	<header class="ps-topbar">
		<div class="ps-topbar__brand">
			<span class="ps-topbar__wordmark">SS Tracker</span>
		</div>
		<div class="ps-topbar__ring" aria-label="XP progress ring">
			<LevelProgressRing {totalXp} size="md" variant="dark" />
		</div>
	</header>

	<!-- Scrollable content area -->
	<main class="ps-canvas">
		{@render children?.()}
	</main>

	<!-- Sticky bottom navigation -->
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
				{link.label}
			</a>
		{/each}
	</nav>
</div>
