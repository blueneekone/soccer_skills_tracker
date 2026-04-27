<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import WorkspaceContextSwitcher from '$lib/components/shell/WorkspaceContextSwitcher.svelte';
	import CommandPalette from '$lib/components/shell/CommandPalette.svelte';
	import { getWorkspaceNav, isShellNavActive } from '$lib/shell/workspaceNav.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import '$lib/styles/enterprise-console.css';

	/** @type {{ breadcrumb?: string, children?: import('svelte').Snippet }} */
	let { breadcrumb = '', children } = $props();

	function closeDrawer() {
		enterprisePlayerDrawer.close();
	}

	const nav = $derived.by(() =>
		getWorkspaceNav(page.url.pathname, authStore.role, workspaceContextStore.activeContext),
	);
	const links = $derived(nav.links);
	const workspaceLabel = $derived(nav.workspaceLabel);
	const showBilling = $derived(nav.showBilling);

	function navActive(item) {
		return isShellNavActive(page.url.pathname, page.url.searchParams, item);
	}

	let mobileNavOpen = $state(false);

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	function toggleMobileNav() {
		mobileNavOpen = !mobileNavOpen;
	}

	let isDesktop = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 1024px)');
		const onChange = () => {
			isDesktop = mq.matches;
			if (mq.matches) mobileNavOpen = false;
		};
		onChange();
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	const sidebarCollapsedDesktop = $derived(!workspaceContextStore.isSidebarOpen && isDesktop);

	function toggleDesktopSidebar() {
		workspaceContextStore.toggleSidebar();
	}

	// ── Global Command Palette ───────────────────────────────────────────────────
	let cmdPaletteOpen = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		/** @param {KeyboardEvent} e */
		function onGlobalKey(e) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				cmdPaletteOpen = true;
			}
		}
		window.addEventListener('keydown', onGlobalKey);
		return () => window.removeEventListener('keydown', onGlobalKey);
	});
</script>

<div class="ec-root" data-sidebar-collapsed={sidebarCollapsedDesktop}>
	<!-- Field mode: fixed bar with club mark + menu (< lg only, see CSS) -->
	<header class="ec-mobile-header">
		<div class="ec-mobile-header__brand">
			<WorkspaceContextSwitcher variant="mobile" />
		</div>
		<button
			type="button"
			class="ec-mobile-header__hamburger"
			onclick={toggleMobileNav}
			aria-expanded={mobileNavOpen}
			aria-controls="ec-workspace-nav"
			aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
		>
			<i class="ph ph-list ecs-icon-lg" aria-hidden="true"></i>
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
			class:ec-sidebar--collapsed-desktop={sidebarCollapsedDesktop}
			aria-label="Workspace navigation"
		>
			<div class="ec-sidebar__panel">
				<div class="ec-sidebar__mobile-top">
					<button type="button" class="ec-sidebar__close-btn" onclick={closeMobileNav}>
						<i class="ph ph-x" aria-hidden="true"></i>
						Close
					</button>
				</div>
				<div class="ec-sidebar__brand ec-sidebar__brand--switcher">
					<WorkspaceContextSwitcher variant="sidebar" />
				</div>
				<nav class="ec-sidebar__nav">
					{#each links as item (item.href)}
						<a
							class="ec-nav-link"
							class:ec-nav-link--active={navActive(item)}
							href={item.href}
							data-sveltekit-preload-data="hover"
							onclick={closeMobileNav}
						>
							<i class="ph {item.icon}" aria-hidden="true"></i>
							<span class="ec-nav-link__label">{item.label}</span>
						</a>
					{/each}
					{#if showBilling}
						<p class="ec-nav-section">Billing</p>
						<a class="ec-nav-link" href="/pricing" onclick={closeMobileNav}>
							<i class="ph ph-credit-card" aria-hidden="true"></i>
							<span class="ec-nav-link__label">Plans & Billing</span>
						</a>
					{/if}
				</nav>
				<div class="ec-sidebar__system">
					<p class="ec-sidebar__system-label">System actions</p>
					<a
						class="ec-nav-link"
						href="mailto:support@sstracker.app?subject=SSTRACKER%20support"
						rel="noopener noreferrer"
					>
						<i class="ph ph-lifebuoy" aria-hidden="true"></i>
						<span class="ec-nav-link__label">Support / Help Desk</span>
					</a>
					<button type="button" class="ec-nav-link" onclick={() => void handleSignOut()}>
						<i class="ph ph-sign-out" aria-hidden="true"></i>
						<span class="ec-nav-link__label">Sign out</span>
					</button>
				</div>
			</div>
		</aside>

	<div class="ec-main">
		<header class="ec-topbar">
			<button
				type="button"
				class="ec-sidebar-toggle ec-sidebar-toggle--desktop"
				onclick={toggleDesktopSidebar}
				aria-expanded={workspaceContextStore.isSidebarOpen}
				aria-controls="ec-workspace-nav"
				aria-label={workspaceContextStore.isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
			>
				<i class="ph ph-sidebar-simple" aria-hidden="true"></i>
			</button>
			<div class="ec-breadcrumb">
				{#if breadcrumb}
					{breadcrumb}
				{:else}
					<strong>{workspaceLabel}</strong> / Console
				{/if}
			</div>
			<!-- Dead-center Command Palette trigger — absolute so it ignores sidebar-rail width -->
			<button
				type="button"
				class="ec-cmd-trigger"
				onclick={() => (cmdPaletteOpen = true)}
				aria-label="Open command palette"
				aria-keyshortcuts="Meta+K Control+K"
				aria-haspopup="dialog"
			>
				<i class="ph ph-magnifying-glass ec-cmd-trigger__icon" aria-hidden="true"></i>
				<span class="ec-cmd-trigger__text">Search &amp; jump to…</span>
				<kbd class="ec-cmd-trigger__kbd">⌘K</kbd>
			</button>
			<div class="ec-topbar__right">
				<button
					type="button"
					class="ec-icon-btn"
					onclick={() => goto('/settings')}
					aria-label="Settings"
				>
					<i class="ph ph-gear" aria-hidden="true"></i>
				</button>
				<div class="ec-topbar-user ecs-user-label" title={authStore.user?.email ?? ''}>
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

<!-- Global Command Palette (Cmd+K) -->
<CommandPalette bind:open={cmdPaletteOpen} />

<!-- Overlay + drawer (team / record details) -->
<div
	class="ec-drawer-backdrop"
	class:ec-drawer-backdrop--open={enterprisePlayerDrawer.isOpen}
	role="presentation"
	aria-hidden={!enterprisePlayerDrawer.isOpen}
	onclick={closeDrawer}
></div>
<aside
	class="ec-drawer"
	class:ec-drawer--open={enterprisePlayerDrawer.isOpen}
	aria-hidden={!enterprisePlayerDrawer.isOpen}
	aria-label="Detail panel"
>
	<div class="ec-drawer__head">
		<h2 class="ec-drawer__title">{enterprisePlayerDrawer.payload?.title ?? 'Details'}</h2>
		<button type="button" class="ec-drawer__close" onclick={closeDrawer} aria-label="Close panel">
			<i class="ph ph-x ecs-icon-md" aria-hidden="true"></i>
		</button>
	</div>
	<div class="ec-drawer__body">
		{#if enterprisePlayerDrawer.payload?.meta}
			<p class="ec-drawer__meta">{enterprisePlayerDrawer.payload.meta}</p>
		{/if}
		{#if enterprisePlayerDrawer.payload?.body}
			<div class="ec-drawer__text">{enterprisePlayerDrawer.payload.body}</div>
		{:else}
			<p class="ecs-empty-msg">No selection.</p>
		{/if}
		{#if enterprisePlayerDrawer.payload?.href}
			<p class="ec-drawer__actions">
				<a
					class="ec-drawer__cta"
					href={enterprisePlayerDrawer.payload.href}
					data-sveltekit-preload-data="hover"
					onclick={() => closeDrawer()}
				>
					Continue
				</a>
			</p>
		{/if}
	</div>
</aside>

<style>
	.ecs-icon-lg   { font-size: 1.5rem; }
	.ecs-icon-md   { font-size: 1.25rem; }
	.ecs-user-label { color: var(--text-secondary); max-width: 140px; }
	.ecs-empty-msg  { margin: 0; color: var(--text-secondary); }

	:global(.ec-sidebar__brand--switcher) {
		padding: 0;
		align-items: stretch;
	}

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

	.ec-drawer__actions {
		margin: 16px 0 0;
	}

	.ec-drawer__cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 16px;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		color: #0f172a;
		background: var(--brand-primary, #f59e0b);
	}
</style>
