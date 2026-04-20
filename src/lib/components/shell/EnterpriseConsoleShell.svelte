<script>
	import { setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import '$lib/styles/enterprise-console.css';

	/**
	 * @typedef {'director' | 'admin'} ConsoleVariant
	 */

	/** @type {{ variant?: ConsoleVariant, breadcrumb?: string, children?: import('svelte').Snippet }} */
	let { variant = 'director', breadcrumb = '', children } = $props();

	let drawerOpen = $state(false);
	/** @type {{ title?: string, body?: string, meta?: string } | null} */
	let drawerPayload = $state(null);

	setContext('enterpriseDrawer', {
		/**
		 * @param {{ title?: string, body?: string, meta?: string }} opts
		 */
		open(opts = {}) {
			drawerPayload = {
				title: opts.title ?? 'Details',
				body: opts.body ?? '',
				meta: opts.meta ?? ''
			};
			drawerOpen = true;
		},
		close() {
			drawerOpen = false;
		},
		get isOpen() {
			return drawerOpen;
		}
	});

	function closeDrawer() {
		drawerOpen = false;
	}

	/** Director sidebar — dense nav aligned to portal sections */
	const directorLinks = [
		{ tab: 'home', label: 'Home', icon: 'ph-house' },
		{ tab: 'teams', label: 'Roster & teams', icon: 'ph-users-three' },
		{ tab: 'field', label: 'Field ops', icon: 'ph-soccer-ball' },
		{ tab: 'registrars', label: 'Registrars', icon: 'ph-swap' },
		{ tab: 'brand', label: 'Club branding', icon: 'ph-palette' },
		{ tab: 'marketing', label: 'Playbook & campaigns', icon: 'ph-megaphone' },
		{ tab: 'compliance', label: 'Compliance', icon: 'ph-shield-check' },
		{ tab: 'household', label: 'Households & COPPA', icon: 'ph-house-line' }
	];

	/** Admin super_console nav */
	const adminLinks = [
		{ tab: 'overview', label: 'Overview', icon: 'ph-chart-line' },
		{ tab: 'sports', label: 'Sports modules', icon: 'ph-trophy' },
		{ tab: 'accounts', label: 'Accounts', icon: 'ph-users-three' },
		{ tab: 'billing', label: 'Licensing', icon: 'ph-credit-card' },
		{ tab: 'security', label: 'Security', icon: 'ph-shield-check' }
	];

	const activeTab = $derived($page.url.searchParams.get('tab') || '');
	const links = $derived(variant === 'admin' ? adminLinks : directorLinks);

	function hrefFor(tab) {
		const base = variant === 'admin' ? '/admin' : '/director';
		if (tab === 'home') return `${base}?tab=home`;
		if (variant === 'admin' && tab === 'overview') return base;
		return `${base}?tab=${encodeURIComponent(tab)}`;
	}

	function isActive(tab) {
		if (variant === 'admin') {
			if (tab === 'overview') return activeTab === '' || activeTab === 'overview';
			return activeTab === tab;
		}
		if (tab === 'home') return activeTab === '' || activeTab === 'home';
		return activeTab === tab;
	}

	let mobileNavOpen = $state(false);

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	function toggleMobileNav() {
		mobileNavOpen = !mobileNavOpen;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 1024px)');
		const onChange = () => {
			if (mq.matches) mobileNavOpen = false;
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});
</script>

<div class="ec-root">
	<!-- Field mode: fixed bar with club mark + menu (< lg only, see CSS) -->
	<header class="ec-mobile-header">
		<div class="ec-mobile-header__brand">
			{#if clubBrandingStore.logoUrl}
				<ClubLogoMark size="sm" />
			{:else}
				<i class="ph ph-squares-four ec-mobile-header__logo-fallback" aria-hidden="true"></i>
			{/if}
			<div class="ec-mobile-header__titles">
				<span class="ec-mobile-header__name">{variant === 'admin' ? 'Admin' : 'Director'}</span>
				<span class="ec-mobile-header__sub">Command Center</span>
			</div>
		</div>
		<button
			type="button"
			class="ec-mobile-header__hamburger"
			onclick={toggleMobileNav}
			aria-expanded={mobileNavOpen}
			aria-controls="ec-workspace-nav"
			aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
		>
			<i class="ph ph-list" style="font-size: 1.5rem;" aria-hidden="true"></i>
		</button>
	</header>

	<div
		class="ec-nav-backdrop"
		class:ec-nav-backdrop--open={mobileNavOpen}
		role="presentation"
		aria-hidden={!mobileNavOpen}
		onclick={closeMobileNav}
	></div>

	<div class="ec-root__body">
		<aside
			id="ec-workspace-nav"
			class="ec-sidebar"
			class:ec-sidebar--open={mobileNavOpen}
			aria-label="Workspace navigation"
		>
			<div class="ec-sidebar__mobile-top">
				<button type="button" class="ec-sidebar__close-btn" onclick={closeMobileNav}>
					<i class="ph ph-x" aria-hidden="true"></i>
					Close
				</button>
			</div>
			<div class="ec-sidebar__brand">
				{#if clubBrandingStore.logoUrl}
					<ClubLogoMark size="md" />
				{:else}
					<i class="ph ph-squares-four" style="font-size: 1.5rem; color: var(--text-secondary);" aria-hidden="true"></i>
				{/if}
				<div class="min-w-0">
					<p class="ec-sidebar__title">{variant === 'admin' ? 'Platform admin' : 'Director'}</p>
					<p class="ec-sidebar__subtitle">Workspace</p>
				</div>
			</div>
			<nav class="ec-sidebar__nav">
				{#each links as item (item.tab)}
					<a
						class="ec-nav-link"
						class:ec-nav-link--active={isActive(item.tab)}
						href={hrefFor(item.tab)}
						data-sveltekit-preload-data="hover"
						onclick={closeMobileNav}
					>
						<i class="ph {item.icon}" aria-hidden="true"></i>
						<span class="min-w-0">{item.label}</span>
					</a>
				{/each}
				{#if variant === 'director'}
					<p class="ec-nav-section">Billing</p>
					<a class="ec-nav-link" href="/pricing" onclick={closeMobileNav}>
						<i class="ph ph-credit-card" aria-hidden="true"></i>
						Plans & billing
					</a>
				{/if}
			</nav>
		</aside>

	<div class="ec-main">
		<header class="ec-topbar">
			<div class="ec-breadcrumb">
				{#if breadcrumb}
					{breadcrumb}
				{:else if variant === 'admin'}
					<strong>Admin</strong> / Console
				{:else}
					<strong>Director</strong> / Console
				{/if}
			</div>
			<div class="ec-search">
				<label class="d-none" for="ec-global-search">Search</label>
				<input
					id="ec-global-search"
					type="search"
					placeholder="Search…"
					autocomplete="off"
					aria-label="Global search"
				/>
			</div>
			<div class="ec-topbar__right">
				<button
					type="button"
					class="ec-icon-btn"
					onclick={() => goto('/settings')}
					aria-label="Settings"
				>
					<i class="ph ph-gear" aria-hidden="true"></i>
				</button>
				<div class="ec-topbar-user" style="color: var(--text-secondary); max-width: 140px;" title={authStore.user?.email ?? ''}>
					<span class="ec-topbar-user-name">{authStore.userProfile?.playerName || authStore.user?.email || 'Account'}</span>
				</div>
			</div>
		</header>

		<div class="ec-canvas">
			{@render children?.()}
		</div>
	</div>
	</div>
</div>

<!-- Overlay + drawer (team / record details) -->
<div
	class="ec-drawer-backdrop"
	class:ec-drawer-backdrop--open={drawerOpen}
	role="presentation"
	aria-hidden={!drawerOpen}
	onclick={closeDrawer}
></div>
<aside class="ec-drawer" class:ec-drawer--open={drawerOpen} aria-hidden={!drawerOpen} aria-label="Detail panel">
	<div class="ec-drawer__head">
		<h2 class="ec-drawer__title">{drawerPayload?.title ?? 'Details'}</h2>
		<button type="button" class="ec-drawer__close" onclick={closeDrawer} aria-label="Close panel">
			<i class="ph ph-x" style="font-size: 1.25rem;"></i>
		</button>
	</div>
	<div class="ec-drawer__body">
		{#if drawerPayload?.meta}
			<p class="ec-drawer__meta">{drawerPayload.meta}</p>
		{/if}
		{#if drawerPayload?.body}
			<div class="ec-drawer__text">{drawerPayload.body}</div>
		{:else}
			<p style="margin: 0; color: var(--text-secondary);">No selection.</p>
		{/if}
	</div>
</aside>

<style>
	.ec-topbar-user-name {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 500;
		min-width: 0;
	}
	.ec-drawer__meta {
		margin: 0 0 12px;
		font-size: 11px;
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
	}
	.ec-drawer__text {
		white-space: pre-wrap;
		color: var(--text-primary);
	}
</style>
