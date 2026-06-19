<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { computePlayerOsBlocked } from '$lib/enterprise/playerOsAccess.js';
	import AlertsDrawer from '$lib/components/shell/AlertsDrawer.svelte';
	import PlayerReadOnlyBillingBanner from '$lib/components/shell/PlayerReadOnlyBillingBanner.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import {
		playerPrimaryFieldNav,
		playerOverflowNav,
		playerRailNav,
		PLAYER_HQ_HREF,
		isPlayerHubActive,
		isPlayerNavActive,
	} from '$lib/player/shell/playerPrimaryNav.js';
	import '$lib/styles/player-shell.css';
	import '$lib/styles/player-dossier.css';
	import '$lib/styles/player-modal-scrim.css';
	import Icon from '$lib/components/ui/Icon.svelte';

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
			licenseEntitlementStore.entitlement,
		),
	);

	/** Train only — Armory stays reachable for profile completion when billing is read-only */
	const PRIMARY_LOCK_HREFS = new Set(['/player/workout']);

	function onNavClick(href: string, e: MouseEvent) {
		if (!playerOsGate.blocked || !PRIMARY_LOCK_HREFS.has(href)) return;
		e.preventDefault();
		void goto('/player/settings');
	}

	let signingOut = $state(false);
	let moreOpen = $state(false);
	let isDesktop = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 1024px)');
		const onChange = () => {
			isDesktop = mq.matches;
			if (mq.matches) moreOpen = false;
		};
		onChange();
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	function closeMoreSheet() {
		moreOpen = false;
	}

	async function disconnect() {
		if (signingOut) return;
		signingOut = true;
		try {
			await handleSignOut();
		} finally {
			signingOut = false;
			closeMoreSheet();
		}
	}
</script>

<AlertsDrawer />

<div class="ps-root ps-root--dossier tw-w-full tw-max-w-[100vw] tw-overflow-x-hidden">
	<div class="ps-ambient" aria-hidden="true">
		<div class="ps-ambient__grid"></div>
		<div class="ps-ambient__glow ps-ambient__glow--a"></div>
		<div class="ps-ambient__glow ps-ambient__glow--b"></div>
	</div>

	{#if isDesktop}
		<nav class="ps-rail ps-rail--desk" aria-label="Player navigation">
			{#each playerRailNav as link, index (link.href)}
				{@const path = page.url.pathname}
				{@const isHub = index === 0}
				{@const hubActive = isHub && isPlayerHubActive(path)}
				{@const routeActive = !isHub && isPlayerNavActive(link.href, path)}
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
			<div class="ps-rail__spacer" aria-hidden="true"></div>
			<button
				type="button"
				class="ps-rail__link ps-rail__link--sign-out"
				disabled={signingOut}
				onclick={() => void disconnect()}
				aria-label={signingOut ? 'Signing out' : 'Sign out'}
				title="Sign out"
			>
				<span class="ps-rail__icon" aria-hidden="true">
					<Icon name="nav.sign-out" size={24} />
				</span>
			</button>
		</nav>
	{:else}
		<nav class="ps-field-bar" aria-label="Player navigation">
			{#each playerPrimaryFieldNav as link, index (link.href)}
				{@const path = page.url.pathname}
				{@const isHub = link.href === PLAYER_HQ_HREF}
				{@const hubActive = isHub && isPlayerHubActive(path)}
				{@const routeActive = !isHub && isPlayerNavActive(link.href, path)}
				{@const gated = playerOsGate.blocked && PRIMARY_LOCK_HREFS.has(link.href)}
				<a
					class="ps-field-bar__tab"
					class:ps-field-bar__tab--hub-active={hubActive}
					class:ps-field-bar__tab--active={routeActive}
					class:ps-field-bar__tab--gated={gated}
					href={link.href}
					aria-label={link.label}
					aria-current={hubActive || routeActive ? 'page' : undefined}
					aria-disabled={gated ? 'true' : undefined}
					data-sveltekit-preload-data="hover"
					data-sveltekit-reload
					onclick={(e) => onNavClick(link.href, e)}
				>
					<span class="ps-field-bar__icon" aria-hidden="true">
						<Icon name={link.icon} size={22} />
					</span>
					<span class="ps-field-bar__label">{link.label}</span>
				</a>
			{/each}
			<button
				type="button"
				class="ps-field-bar__tab ps-field-bar__tab--more"
				aria-label="More navigation"
				aria-expanded={moreOpen}
				aria-controls="ps-more-sheet"
				onclick={() => (moreOpen = true)}
			>
				<span class="ps-field-bar__icon" aria-hidden="true">
					<Icon name="nav.menu" size={22} />
				</span>
				<span class="ps-field-bar__label">More</span>
			</button>
		</nav>

		{#if moreOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="ps-more-backdrop" role="presentation" onclick={closeMoreSheet}></div>
			<div id="ps-more-sheet" class="ps-more-sheet" role="dialog" aria-modal="true" aria-label="More navigation">
				<header class="ps-more-sheet__head">
					<span class="ps-more-sheet__title">More</span>
					<button type="button" class="ps-more-sheet__close icon-tap" onclick={closeMoreSheet} aria-label="Close">
						<Icon name="sys.close" size={20} />
					</button>
				</header>
				<nav class="ps-more-sheet__nav" aria-label="Secondary player routes">
					{#each playerOverflowNav as link (link.href)}
						{@const path = page.url.pathname}
						{@const active = isPlayerNavActive(link.href, path)}
						<a
							class="ps-more-sheet__link"
							class:ps-more-sheet__link--active={active}
							href={link.href}
							data-sveltekit-preload-data="hover"
							data-sveltekit-reload
							onclick={closeMoreSheet}
						>
							<Icon name={link.icon} size={20} />
							<span>{link.label}</span>
						</a>
					{/each}
				</nav>
				<button
					type="button"
					class="ps-more-sheet__sign-out"
					disabled={signingOut}
					onclick={() => void disconnect()}
				>
					<Icon name="nav.sign-out" size={18} />
					<span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
				</button>
			</div>
		{/if}
	{/if}

	<div class="ps-stack">
		{#if playerOsGate.blocked}
			<PlayerReadOnlyBillingBanner
				reasons={playerOsGate.reasons}
				onPricing={async () => await goto('/upgrade')}
				onSettings={async () => await goto('/player/settings')}
			/>
		{/if}

		<div class="ps-scroll-shell tw-relative">
			<div class="ps-canvas-bg" aria-hidden="true"></div>
			<main
				class="ps-canvas ps-canvas--scroll-inner player-dossier-root pd-grain pd-chrome-root tw-relative tw-z-[1]"
				data-dopamine={vanguardFlags.dopamineEnabled ? 'on' : 'off'}
			>
				{@render children?.()}
			</main>
		</div>
	</div>
</div>
