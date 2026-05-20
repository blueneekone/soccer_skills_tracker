<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { computePlayerOsBlocked } from '$lib/enterprise/playerOsAccess.js';
	import AlertsDrawer from '$lib/components/shell/AlertsDrawer.svelte';
	import PlayerReadOnlyBillingBanner from '$lib/components/shell/PlayerReadOnlyBillingBanner.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import '$lib/styles/player-shell.css';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();

	const role = $derived(authStore.role);

	const playerOsGate = $derived(
		computePlayerOsBlocked(
			{
				role: authStore.userProfile?.role ?? role,
				clubId: authStore.userProfile?.clubId,
			},
			licenseEntitlementStore.clubDoc,
			licenseEntitlementStore.entitlement
		)
	);

	const HQ_HREF = '/player/dashboard';

	const NAV_LINKS: Array<{ href: string; icon: IconName; label: string }> = [
		{ href: HQ_HREF, icon: 'content.grid', label: 'HQ' },
		{ href: '/stats', icon: 'data.chart-bar', label: 'Stats' },
		{ href: '/player/workout', icon: 'content.checks', label: 'Train' },
		{ href: '/player/armory', icon: 'status.shield-check', label: 'Armory' },
		{ href: '/settings', icon: 'sys.settings', label: 'Settings' },
	];

	function isHubActive(path: string) {
		return path === HQ_HREF || path.startsWith(`${HQ_HREF}/`);
	}

	function isNavActive(href: string, path: string) {
		if (href === HQ_HREF) return isHubActive(path);
		if (path === href) return true;
		if (href === '/operative/profile') {
			return path === '/operative/profile' || path.startsWith('/operative/');
		}
		return path.startsWith(`${href}/`);
	}

	const PRIMARY_LOCK_HREFS = new Set(['/player/workout', '/player/armory']);

	function onNavClick(href: string, e: MouseEvent) {
		if (!playerOsGate.blocked || !PRIMARY_LOCK_HREFS.has(href)) return;
		e.preventDefault();
		void goto('/settings');
	}
</script>

<AlertsDrawer />

<div class="ps-root tw-w-full tw-max-w-[100vw] tw-overflow-x-hidden">
	<div class="ps-ambient" aria-hidden="true">
		<div class="ps-ambient__grid"></div>
		<div class="ps-ambient__glow ps-ambient__glow--a"></div>
		<div class="ps-ambient__glow ps-ambient__glow--b"></div>
	</div>

	<nav class="ps-rail" aria-label="Player navigation">
		{#each NAV_LINKS as link, index (link.href)}
			{@const path = page.url.pathname}
			{@const isHub = index === 0}
			{@const hubActive = isHub && isHubActive(path)}
			{@const routeActive = !isHub && isNavActive(link.href, path)}
			{@const gated = playerOsGate.blocked && PRIMARY_LOCK_HREFS.has(link.href)}
			<a
				class="ps-rail__link"
				class:ps-rail__link--hub={isHub}
				class:ps-rail__link--hub-active={hubActive}
				class:ps-rail__link--active={routeActive}
				class:ps-rail__link--gated={gated}
				href={link.href}
				aria-label={link.label}
				aria-current={hubActive || routeActive ? 'page' : undefined}
				aria-disabled={gated ? 'true' : undefined}
				data-sveltekit-preload-data="hover"
				data-sveltekit-reload
				onclick={(e) => onNavClick(link.href, e)}
			>
				<span class="ps-rail__icon" aria-hidden="true">
					<Icon name={link.icon} size={24} />
				</span>
			</a>
			{#if isHub}
				<div class="ps-rail__divider" aria-hidden="true"></div>
			{/if}
		{/each}
	</nav>

	<div class="ps-stack">
		{#if playerOsGate.blocked}
			<PlayerReadOnlyBillingBanner
				reasons={playerOsGate.reasons}
				onPricing={async () => await goto('/upgrade')}
				onSettings={async () => await goto('/settings')}
			/>
		{/if}

		<div class="ps-scroll-shell tw-relative tw-flex-1 tw-min-h-0 tw-overflow-y-auto">
			<div
				class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-bg-gradient-to-br tw-from-slate-900 tw-to-black"
				aria-hidden="true"
			></div>
			<main class="ps-canvas ps-canvas--scroll-inner tw-relative tw-z-[1]">
				{@render children?.()}
			</main>
		</div>
	</div>
</div>
