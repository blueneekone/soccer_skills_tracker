<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import WorkspaceContextSwitcher from '$lib/components/shell/WorkspaceContextSwitcher.svelte';
	import CommandPalette from '$lib/components/shell/CommandPalette.svelte';
	import MobileTabBar from '$lib/components/shell/MobileTabBar.svelte';
	import MobileDirectorFab from '$lib/components/shell/MobileDirectorFab.svelte';
	import { getWorkspaceNav, isShellNavActive } from '$lib/shell/workspaceNav.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import '$lib/styles/enterprise-console.css';
	import PlayerDetailDrawer from '$lib/components/shell/PlayerDetailDrawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	import type { Snippet } from 'svelte';

	let { breadcrumb = '', children }: { breadcrumb?: string; children?: Snippet } = $props();

	function closeDrawer() {
		enterprisePlayerDrawer.close();
	}

	const nav = $derived.by(() =>
		getWorkspaceNav(page.url.pathname, authStore.role, workspaceContextStore.activeContext),
	);
	const links = $derived(nav.links);
	const workspaceLabel = $derived(nav.workspaceLabel);
	const showBilling = $derived(nav.showBilling);

	function navActive(item: { tab?: string; label: string; icon: string; href: string }) {
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

	const MANAGEMENT_ROLES = new Set(['director', 'super_admin', 'global_admin', 'registrar', 'coach']);
	const showMobileChrome = $derived(
		!isDesktop && MANAGEMENT_ROLES.has(authStore.role ?? ''),
	);

	function toggleDesktopSidebar() {
		workspaceContextStore.toggleSidebar();
	}

	// ── Global Command Palette ───────────────────────────────────────────────────
	let cmdPaletteOpen = $state(false);

	// ── Anomaly Reporting Hook ────────────────────────────────────────────────
	let anomalyOpen = $state(false);
	let anomalyText = $state('');
	let anomalySent = $state(false);

	function openAnomaly() {
		anomalyText = '';
		anomalySent = false;
		anomalyOpen = true;
	}

	function submitAnomaly() {
		if (!anomalyText.trim()) return;
		const tenantId = authStore.tenantId ?? authStore.user?.email ?? 'UNKNOWN';
		const uid = authStore.user?.uid ?? 'UNKNOWN';
		const subject = encodeURIComponent('VANGUARD ANOMALY REPORT');
		const body = encodeURIComponent(
			[
				`Tenant ID: ${tenantId}`,
				`User ID:   ${uid}`,
				`Role:      ${authStore.role ?? 'unknown'}`,
				``,
				`Issue:`,
				anomalyText.trim(),
			].join('\n'),
		);
		const mailto = `mailto:support@sstracker.app?subject=${subject}&body=${body}`;
		window.open(mailto, '_blank');
		anomalySent = true;
		setTimeout(() => (anomalyOpen = false), 2000);
	}

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

<div class="ec-root" data-sidebar-collapsed={sidebarCollapsedDesktop} data-vanguard-os="tactical">
	<!-- Field mode: fixed bar with club mark + menu (< lg only, see CSS) -->
	<header class="ec-mobile-header">
		<div class="ec-mobile-header__brand">
			<WorkspaceContextSwitcher variant="mobile" />
		</div>
		<button
			type="button"
			class="ec-mobile-header__hamburger icon-tap"
			onclick={toggleMobileNav}
			aria-expanded={mobileNavOpen}
			aria-controls="ec-workspace-nav"
			aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
		>
			<Icon name="nav.menu" size={24} />
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
				<button type="button" class="ec-sidebar__close-btn icon-tap" onclick={closeMobileNav}>
					<Icon name="sys.close" size={20} />
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
							data-sveltekit-reload
							data-sveltekit-preload-data="hover"
							onclick={closeMobileNav}
						>
							<Icon name={item.icon as IconName} size={18} />
							<span class="ec-nav-link__label">{item.label}</span>
						</a>
					{/each}
					{#if showBilling}
						<p class="ec-nav-section">Billing</p>
						<a class="ec-nav-link" href="/upgrade" data-sveltekit-reload onclick={closeMobileNav}>
							<Icon name="sys.credit-card" size={18} />
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
						<Icon name="sys.lifebuoy" size={18} />
						<span class="ec-nav-link__label">Support / Help Desk</span>
					</a>
					<!-- ── Anomaly Reporting Hook ─────────────────────────────── -->
					<button type="button" class="ec-nav-link ec-nav-link--anomaly" onclick={openAnomaly}>
						<Icon name="status.warning" size={18} />
						<span class="ec-nav-link__label">Report Anomaly</span>
					</button>
					<button type="button" class="ec-nav-link" onclick={() => void handleSignOut()}>
						<Icon name="nav.sign-out" size={18} />
						<span class="ec-nav-link__label">Sign out</span>
					</button>
				</div>
			</div>
		</aside>

	<div class="ec-main">
		<header class="ec-topbar">
			<button
				type="button"
				class="ec-sidebar-toggle ec-sidebar-toggle--desktop icon-tap"
				onclick={toggleDesktopSidebar}
				aria-expanded={workspaceContextStore.isSidebarOpen}
				aria-controls="ec-workspace-nav"
				aria-label={workspaceContextStore.isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
			>
				<Icon name="nav.sidebar" size={20} />
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
				<Icon name="action.search" size={14} class="ec-cmd-trigger__icon" />
				<span class="ec-cmd-trigger__text">Search &amp; jump to…</span>
				<kbd class="ec-cmd-trigger__kbd">⌘K</kbd>
			</button>
			<div class="ec-topbar__right">
				<button
					type="button"
					class="ec-icon-btn icon-tap ec-bell-btn"
					onclick={() => goto('/player/tracker')}
					aria-label="Notifications"
					aria-haspopup="false"
				>
					<Icon name="comm.bell" size={18} />
				</button>
				<button
					type="button"
					class="ec-icon-btn icon-tap"
					onclick={() => goto('/settings')}
					aria-label="Settings"
				>
					<Icon name="sys.settings" size={18} />
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

	<!-- Mobile bottom tab bar + FAB — only for management roles on mobile viewports -->
	{#if showMobileChrome}
		<MobileTabBar
			links={links}
			pathname={page.url.pathname}
			searchParams={page.url.searchParams}
		/>
		<MobileDirectorFab pathname={page.url.pathname} />
	{/if}
</div>

<!-- Global Command Palette (Cmd+K) -->
<CommandPalette bind:open={cmdPaletteOpen} />

<PlayerDetailDrawer />

<!-- ── Anomaly Report Modal ─────────────────────────────────────────────── -->
{#if anomalyOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="ec-anomaly-backdrop" onclick={() => (anomalyOpen = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="ec-anomaly-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Report Anomaly">
			<!-- Corner accents -->
			<div class="ec-anomaly-corner ec-anomaly-corner--tl"></div>
			<div class="ec-anomaly-corner ec-anomaly-corner--br"></div>

			<div class="ec-anomaly-header">
				<span class="ec-anomaly-title">ANOMALY REPORT</span>
				<button class="ec-anomaly-close" onclick={() => (anomalyOpen = false)} aria-label="Close">✕</button>
			</div>

			{#if anomalySent}
				<div class="ec-anomaly-body ec-anomaly-body--sent">
					<span class="ec-anomaly-sent-icon">✓</span>
					<p>Mail client opened. Send the pre-filled report to complete submission.</p>
				</div>
			{:else}
				<div class="ec-anomaly-body">
					<!-- Pre-filled context block -->
					<div class="ec-anomaly-context">
						<div class="ec-anomaly-ctx-row">
							<span class="ec-anomaly-ctx-key">TENANT ID</span>
							<span class="ec-anomaly-ctx-val">{authStore.tenantId ?? authStore.user?.email ?? '—'}</span>
						</div>
						<div class="ec-anomaly-ctx-row">
							<span class="ec-anomaly-ctx-key">USER ID</span>
							<span class="ec-anomaly-ctx-val">{authStore.user?.uid ?? '—'}</span>
						</div>
						<div class="ec-anomaly-ctx-row">
							<span class="ec-anomaly-ctx-key">ROLE</span>
							<span class="ec-anomaly-ctx-val">{authStore.role ?? 'unknown'}</span>
						</div>
					</div>

					<label class="ec-anomaly-label" for="anomaly-text">DESCRIBE THE ANOMALY</label>
					<textarea
						id="anomaly-text"
						class="ec-anomaly-textarea"
						bind:value={anomalyText}
						placeholder="e.g. Wrong birth year locked me in COPPA gate. My DOB should be 2009-03-15."
						rows="4"
					></textarea>
					<p class="ec-anomaly-hint">
						This pre-fills a support email with your Tenant ID and User ID. No data is sent without your review.
					</p>
					<button
						class="ec-anomaly-submit"
						onclick={submitAnomaly}
						disabled={!anomalyText.trim()}
					>[ TRANSMIT REPORT ]</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
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

	/* ── Anomaly nav link variant ─────────────────────────────────────────── */
	:global(.ec-nav-link--anomaly) {
		color: rgba(251, 191, 36, 0.6) !important;
	}
	:global(.ec-nav-link--anomaly:hover) {
		color: rgba(251, 191, 36, 0.9) !important;
		background: rgba(251, 191, 36, 0.06) !important;
	}

	/* ── Anomaly Report Modal ─────────────────────────────────────────────── */
	.ec-anomaly-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ec-anomaly-modal {
		position: relative;
		width: min(480px, 92vw);
		background: rgba(0, 6, 16, 0.97);
		border: 1px solid rgba(251, 191, 36, 0.25);
		border-radius: 4px;
		font-family: var(--font-mono);
		box-shadow: 0 0 60px rgba(251, 191, 36, 0.06);
	}
	/* Corner accents — amber instead of cyan to signal "warning" state */
	.ec-anomaly-corner {
		position: absolute;
		width: 14px;
		height: 14px;
		pointer-events: none;
	}
	.ec-anomaly-corner--tl {
		top: 0; left: 0;
		border-top: 2px solid rgba(251, 191, 36, 0.5);
		border-left: 2px solid rgba(251, 191, 36, 0.5);
	}
	.ec-anomaly-corner--br {
		bottom: 0; right: 0;
		border-bottom: 2px solid rgba(251, 191, 36, 0.5);
		border-right: 2px solid rgba(251, 191, 36, 0.5);
	}
	.ec-anomaly-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px 10px;
		border-bottom: 1px solid rgba(251, 191, 36, 0.12);
		background: rgba(251, 191, 36, 0.04);
	}
	.ec-anomaly-title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: rgba(251, 191, 36, 0.9);
	}
	.ec-anomaly-close {
		background: transparent;
		border: none;
		color: rgba(251, 191, 36, 0.4);
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
		padding: 2px 6px;
		transition: color 0.15s;
	}
	.ec-anomaly-close:hover { color: rgba(251, 191, 36, 0.85); }

	.ec-anomaly-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.ec-anomaly-body--sent {
		align-items: center;
		text-align: center;
		padding: 2rem;
		gap: 10px;
		color: rgba(0, 255, 136, 0.8);
	}
	.ec-anomaly-sent-icon {
		font-size: 2rem;
		color: #00ff88;
	}
	/* Pre-filled context block */
	.ec-anomaly-context {
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(251, 191, 36, 0.1);
		border-radius: 3px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.ec-anomaly-ctx-row {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}
	.ec-anomaly-ctx-key {
		font-size: 8px;
		letter-spacing: 0.18em;
		color: rgba(251, 191, 36, 0.45);
		min-width: 70px;
	}
	.ec-anomaly-ctx-val {
		font-size: 9px;
		color: rgba(0, 255, 255, 0.55);
		word-break: break-all;
	}
	.ec-anomaly-label {
		font-size: 9px;
		letter-spacing: 0.15em;
		color: rgba(251, 191, 36, 0.5);
	}
	.ec-anomaly-textarea {
		width: 100%;
		resize: vertical;
		min-height: 90px;
		padding: 8px 10px;
		font-family: inherit;
		font-size: 11px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: 3px;
		color: #e2e8f0;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}
	.ec-anomaly-textarea:focus {
		border-color: rgba(251, 191, 36, 0.45);
	}
	.ec-anomaly-textarea::placeholder {
		color: rgba(255, 255, 255, 0.2);
		font-size: 10px;
	}
	.ec-anomaly-hint {
		margin: 0;
		font-size: 9px;
		color: rgba(0, 255, 255, 0.3);
		line-height: 1.5;
	}
	.ec-anomaly-submit {
		font-family: inherit;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		padding: 9px 16px;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.4);
		border-radius: 2px;
		color: rgba(251, 191, 36, 0.9);
		cursor: pointer;
		transition: background 0.15s, box-shadow 0.15s;
		align-self: flex-start;
	}
	.ec-anomaly-submit:hover:not(:disabled) {
		background: rgba(251, 191, 36, 0.15);
		box-shadow: 0 0 14px rgba(251, 191, 36, 0.15);
	}
	.ec-anomaly-submit:disabled {
		opacity: 0.3;
		cursor: not-allowed;
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

	/* Bell button — player notification shortcut */
	.ec-bell-btn {
		position: relative;
	}
</style>
