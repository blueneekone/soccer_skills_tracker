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
	import MobilePinBar from '$lib/components/shell/MobilePinBar.svelte';
	import AppMenuSheet from '$lib/components/shell/AppMenuSheet.svelte';
	import {
		playerRailNav,
		PLAYER_HQ_HREF,
		isPlayerHubActive,
		isPlayerNavActive,
	} from '$lib/player/shell/playerPrimaryNav.js';
	import { getNavCatalog, getPickPinCatalog, MENU_PIN_HREF } from '$lib/shell/navPinCatalog.js';
	import { navPinsStore } from '$lib/stores/navPins.svelte.js';
	import { fieldMenu, fieldMenuState } from '$lib/stores/fieldMenu.svelte.js';
	import { createFieldMenuSwipeHandlers } from '$lib/shell/fieldMenuSwipe.js';
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
	let isDesktop = $state(false);

	const playerCatalog = $derived(getNavCatalog('player'));
	const menuSheetCatalog = $derived(
		fieldMenu.mode === 'pick-pin' ? getPickPinCatalog('player') : playerCatalog,
	);
	const gatedHrefs = $derived(
		playerOsGate.blocked ? PRIMARY_LOCK_HREFS : new Set<string>(),
	);
	const showMenuSlot = $derived(!navPinsStore.pins.includes(MENU_PIN_HREF));

	function playerShellNavActive(href: string): boolean {
		if (href === PLAYER_HQ_HREF) return isPlayerHubActive(page.url.pathname);
		return isPlayerNavActive(href, page.url.pathname);
	}

	const fieldMenuSwipe = createFieldMenuSwipeHandlers(() => {
		if (!isDesktop) fieldMenu.openBrowse();
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 1024px)');
		const onChange = () => {
			isDesktop = mq.matches;
			if (mq.matches) fieldMenu.close();
		};
		onChange();
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	$effect(() => {
		const uid = authStore.user?.uid ?? '';
		const email = authStore.user?.email ?? '';
		const profilePins = authStore.userProfile?.mobileNavPins as
			| Record<string, [string | null, string | null, string | null, string | null]>
			| undefined;
		const profilePinsUpdatedAt = authStore.userProfile?.mobileNavPinsUpdatedAt as
			| Record<string, number>
			| undefined;
		navPinsStore.hydrate(uid, email, 'player', profilePins ?? null, profilePinsUpdatedAt ?? null);
	});

	async function disconnect() {
		if (signingOut) return;
		signingOut = true;
		try {
			await handleSignOut();
		} finally {
			signingOut = false;
			fieldMenu.close();
		}
	}
</script>

<AlertsDrawer />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ps-shell-outer tw-h-[100dvh] tw-flex-col"
	ontouchstart={fieldMenuSwipe.onTouchStart}
	ontouchend={fieldMenuSwipe.onTouchEnd}
>
<div
	class="ps-root ps-root--dossier tw-w-full tw-max-w-[100vw] tw-overflow-x-hidden"
>
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
		<!-- Field pin bar + sheet are siblings of ps-root (see ps-shell-outer) -->
	{/if}

	<div class="ps-stack">
		{#if playerOsGate.blocked}
			<PlayerReadOnlyBillingBanner
				reasons={playerOsGate.reasons}
				onPricing={async () => await goto('/upgrade')}
				onSettings={async () => await goto('/player/settings')}
			/>
		{/if}

		<div class="ps-scroll-shell tw-relative tw-flex-1 tw-min-h-0 tw-overflow-y-auto">
			<div class="ps-canvas-bg" aria-hidden="true"></div>
			<main
				class="ps-canvas ps-canvas--scroll-inner player-dossier-root pd-grain pd-chrome-root tw-relative tw-z-[1] bento-grid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12"
				data-dopamine={vanguardFlags.dopamineEnabled ? 'on' : 'off'}
			>
				{@render children?.()}
			</main>
		</div>
	</div>
</div>

{#if !isDesktop}
	<MobilePinBar
		pins={navPinsStore.pins}
		catalog={playerCatalog}
		personaKey="player"
		pathname={page.url.pathname}
		searchParams={page.url.searchParams}
		isActive={playerShellNavActive}
		variant="player"
		accent="gold"
		gatedHrefs={gatedHrefs}
		onNavClick={onNavClick}
		onMenuOpen={() => fieldMenu.openBrowse()}
		onPinLongPress={(slotIndex) => fieldMenu.openPickPin(slotIndex)}
		showMenuSlot={showMenuSlot}
	/>
	<AppMenuSheet
		open={fieldMenuState.open}
		personaKey="player"
		catalog={menuSheetCatalog}
		pinnedHrefs={navPinsStore.pins.filter(Boolean) as string[]}
		mode={fieldMenuState.mode}
		pickSlotIndex={fieldMenuState.pickSlotIndex}
		skin="player"
		pathname={page.url.pathname}
		isActive={playerShellNavActive}
		onDismiss={() => fieldMenu.close()}
		onPickPin={(href) => navPinsStore.setPin(fieldMenu.pickSlotIndex, href)}
		onResetDefaults={() => navPinsStore.resetToDefaults()}
	/>
{/if}
</div>
