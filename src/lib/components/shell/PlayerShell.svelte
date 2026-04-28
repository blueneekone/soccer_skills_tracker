<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { collection, onSnapshot, query, where } from 'firebase/firestore';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { computePlayerOsBlocked } from '$lib/enterprise/playerOsAccess.js';
	import ActiveAssignmentsInbox from '$lib/components/shell/PlayerActionInbox.svelte';
	import PlayerReadOnlyBillingBanner from '$lib/components/shell/PlayerReadOnlyBillingBanner.svelte';
	import '$lib/styles/player-shell.css';

	let disconnectBusy = $state(false);
	let isInboxOpen = $state(false);
	let pendingAssignmentCount = $state(0);

	async function disconnect() {
		if (disconnectBusy) return;
		disconnectBusy = true;
		try {
			await handleSignOut();
		} catch (e) {
			console.error('[PlayerShell] sign out', e);
		} finally {
			disconnectBusy = false;
		}
	}

	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();

	const playerName = $derived(
		authStore.userProfile?.playerName || authStore.user?.email?.split('@')[0] || 'Athlete',
	);

	const firstName = $derived(
		String(playerName)
			.trim()
			.split(/\s+/)[0] || playerName,
	);

	const playerUid = $derived(authStore.user?.uid || '');
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

	$effect(() => {
		if (!browser || !playerUid || role !== 'player') {
			pendingAssignmentCount = 0;
			return;
		}
		const q = query(
			collection(db, 'assignments'),
			where('playerId', '==', playerUid),
			where('status', '==', 'pending'),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				pendingAssignmentCount = snap.size;
			},
			(e) => {
				console.error('[PlayerShell] assignments snapshot', e);
				pendingAssignmentCount = 0;
			},
		);
		return () => unsub();
	});

	/** Bottom / rail nav — HQ first, then core athlete loops. */
	const NAV_LINKS = [
		{ href: '/player/dashboard', icon: 'ph-squares-four', label: 'HQ' },
		{ href: '/stats', icon: 'ph-chart-bar', label: 'Stats' },
		{ href: '/player/workout', icon: 'ph-list-checks', label: 'Train' },
		{ href: '/player/armory', icon: 'ph-shield-check', label: 'Armory' },
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
		if (href === '/operative/profile') {
			return path === '/operative/profile' || path.startsWith('/operative/');
		}
		return path.startsWith(href + '/');
	}

	const PRIMARY_LOCK_HREFS = new Set(['/player/workout', '/player/armory']);

	/**
	 * @param {string} href
	 * @param {MouseEvent} e
	 */
	function onNavClick(href, e) {
		if (!playerOsGate.blocked || !PRIMARY_LOCK_HREFS.has(href)) return;
		e.preventDefault();
		void goto('/settings');
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
			{@const gated = playerOsGate.blocked && PRIMARY_LOCK_HREFS.has(link.href)}
			<a
				class="ps-bottom-nav__link"
				class:ps-bottom-nav__link--active={isActive(link.href)}
				class:ps-bottom-nav__link--gated={gated}
				href={link.href}
				aria-current={isActive(link.href) ? 'page' : undefined}
				aria-disabled={gated ? 'true' : undefined}
				data-sveltekit-preload-data="hover"
				onclick={(e) => onNavClick(link.href, e)}
			>
				<i class="ph {link.icon} ps-bottom-nav__icon" aria-hidden="true"></i>
				<span class="ps-bottom-nav__label">{link.label}</span>
			</a>
		{/each}
	</nav>

	<div class="ps-stack">
		{#if playerOsGate.blocked}
			<PlayerReadOnlyBillingBanner
				reasons={playerOsGate.reasons}
				onPricing={async () => await goto('/pricing')}
				onSettings={async () => await goto('/settings')}
			/>
		{/if}
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
				<div class="tw-relative">
					<button
						type="button"
						class="tw-relative tw-flex tw-h-11 tw-w-11 tw-touch-manipulation tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-cyan-500/25 tw-bg-black/50 tw-text-cyan-200 tw-transition hover:tw-border-cyan-400/50 hover:tw-bg-cyan-950/30 hover:tw-text-cyan-100"
						aria-expanded={isInboxOpen}
						aria-controls="ps-action-inbox-panel"
						aria-label="Alerts — notifications and assignments"
						onclick={() => (isInboxOpen = !isInboxOpen)}
					>
						<i class="ph ph-bell tw-text-lg" aria-hidden="true"></i>
						{#if pendingAssignmentCount > 0}
							<span
								class="tw-pointer-events-none tw-absolute tw-right-1.5 tw-top-1.5 tw-h-2 tw-w-2 tw-rounded-full tw-bg-red-500 tw-ring-2 tw-ring-black/80"
								aria-hidden="true"
							></span>
						{/if}
					</button>
				</div>
				<button
					type="button"
					class="tw-min-h-11 tw-min-w-[5.5rem] tw-shrink-0 tw-touch-manipulation tw-border tw-border-red-500/30 tw-bg-black/40 tw-px-3 tw-py-2.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-500 tw-transition-colors hover:tw-border-red-500/60 hover:tw-bg-red-950/50 hover:tw-text-red-400 active:tw-bg-red-950/70 disabled:tw-opacity-50"
					disabled={disconnectBusy}
					onclick={disconnect}
				>
					{disconnectBusy ? '…' : 'DISCONNECT'}
				</button>
			</div>
		</header>

		{#if isInboxOpen}
			<div
				id="ps-action-inbox-panel"
				class="ps-inbox-dropdown tw-absolute tw-left-2 tw-right-2 tw-z-[80] tw-max-h-[min(70vh,28rem)] tw-overflow-y-auto tw-overflow-x-hidden tw-rounded-xl tw-border tw-border-cyan-500/20 tw-bg-zinc-950/85 tw-px-3 tw-py-3 tw-shadow-[0_20px_50px_rgba(0,0,0,0.65)] [backdrop-filter:blur(18px) saturate(1.2)] [webkit-backdrop-filter:blur(18px) saturate(1.2)]"
				style="top: var(--pp-topbar-height);"
				role="region"
				aria-label="Alerts"
			>
				<ActiveAssignmentsInbox />
			</div>
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
