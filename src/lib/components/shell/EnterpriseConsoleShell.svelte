<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import CommandPalette from '$lib/components/shell/CommandPalette.svelte';
	import MobilePinBar from '$lib/components/shell/MobilePinBar.svelte';
	import AppMenuSheet from '$lib/components/shell/AppMenuSheet.svelte';
	import { getFieldQuickActions } from '$lib/shell/fieldQuickActions.js';
	import { createFieldMenuSwipeHandlers } from '$lib/shell/fieldMenuSwipe.js';
	import {
		getWorkspaceNav,
		isShellNavActive,
	} from '$lib/shell/workspaceNav.js';
	import {
		getNavCatalog,
		getPickPinCatalog,
		MENU_PIN_HREF,
		resolveNavPersonaKey,
	} from '$lib/shell/navPinCatalog.js';
	import { navPinsStore } from '$lib/stores/navPins.svelte.js';
	import { fieldMenu, fieldMenuState } from '$lib/stores/fieldMenu.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import '$lib/styles/enterprise-console.css';
	import PlayerDetailDrawer from '$lib/components/shell/PlayerDetailDrawer.svelte';
	import AlertsDrawer from '$lib/components/shell/AlertsDrawer.svelte';
	import { alertsDrawer } from '$lib/stores/alertsDrawer.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import VanguardAvatar from '$lib/components/shell/VanguardAvatar.svelte';

	import type { Snippet } from 'svelte';

	let { breadcrumb = '', children }: { breadcrumb?: string; children?: Snippet } = $props();

	let disconnectBusy = $state(false);

	function closeDrawer() {
		enterprisePlayerDrawer.close();
	}

	async function disconnect(): Promise<void> {
		if (disconnectBusy) return;
		disconnectBusy = true;
		try {
			await handleSignOut();
		} catch (e) {
			console.error('[EnterpriseConsoleShell] sign out', e);
		} finally {
			disconnectBusy = false;
		}
	}

	const nav = $derived.by(() =>
		getWorkspaceNav(page.url.pathname, authStore.role, workspaceContextStore.activeContext),
	);
	const links = $derived(nav.links);
	const navPersonaKey = $derived(
		resolveNavPersonaKey(authStore.role, workspaceContextStore.activeContext),
	);
	const navCatalog = $derived(getNavCatalog(navPersonaKey));
	const menuSheetCatalog = $derived(
		fieldMenu.mode === 'pick-pin' ? getPickPinCatalog(navPersonaKey) : navCatalog,
	);
	const workspaceLabel = $derived(nav.workspaceLabel);
	const showBilling = $derived(nav.showBilling);
	const tabBarAccent = $derived(authStore.role === 'coach' ? 'cyan' : 'neutral');
	const pinBarSkin = $derived(authStore.role === 'parent' ? 'parent-trust' : 'enterprise');

	function navActive(item: { tab?: string; label: string; icon: string; href: string }) {
		return isShellNavActive(page.url.pathname, page.url.searchParams, item);
	}

	function shellNavActive(href: string): boolean {
		const item = navCatalog.find((c) => c.href === href);
		if (!item) return false;
		return isShellNavActive(page.url.pathname, page.url.searchParams, item);
	}

	let isDesktop = $state(false);

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
		navPinsStore.hydrate(uid, email, navPersonaKey, profilePins ?? null, profilePinsUpdatedAt ?? null);
	});

	const sidebarCollapsedDesktop = $derived(!workspaceContextStore.isSidebarOpen);

	const drawerLinks = $derived(links);

	const FIELD_CHROME_ROLES = new Set([
		'coach',
		'director',
		'admin',
		'global_admin',
		'super_admin',
		'registrar',
		'recruiter',
		'parent',
	]);
	const showFieldChrome = $derived(FIELD_CHROME_ROLES.has(authStore.role ?? ''));

	const fieldQuickActions = $derived(getFieldQuickActions(page.url.pathname));
	const showMenuSlot = $derived(!navPinsStore.pins.includes(MENU_PIN_HREF));

	const fieldMenuSwipe = createFieldMenuSwipeHandlers(() => {
		if (showFieldChrome && !fieldMenuState.open) fieldMenu.openBrowse();
	});

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
		fieldMenu.close();
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
			if (!isDesktop) return;
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				cmdPaletteOpen = true;
			}
		}
		window.addEventListener('keydown', onGlobalKey);
		return () => window.removeEventListener('keydown', onGlobalKey);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ec-shell-outer tw-h-[100dvh] tw-flex-col"
	ontouchstart={fieldMenuSwipe.onTouchStart}
	ontouchend={fieldMenuSwipe.onTouchEnd}
>
<div
	class="ec-root"
	data-sidebar-collapsed={sidebarCollapsedDesktop}
	data-vanguard-os="tactical"
>
	<div class="ec-root__body">
		<aside
			id="ec-workspace-nav"
			class="ec-sidebar"
			class:ec-sidebar--collapsed-desktop={!workspaceContextStore.isSidebarOpen}
			aria-label="Workspace navigation"
		>
			<div class="ec-sidebar__panel">
				<div class="ec-sidebar__brand ec-sidebar__brand--switcher">
					<div class="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2">
						<span class="tw-font-sans tw-text-sm tw-font-extrabold tw-tracking-widest tw-text-[#FAFAFA] tw-uppercase">SSTracker</span>
						<span class="tw-text-[#334155]">|</span>
						<span class="tw-font-sans tw-text-xs tw-font-bold tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">Nexus Command</span>
					</div>
				</div>
				<nav class="ec-sidebar__nav">
					<!-- Sprint 9.1: data-sveltekit-reload on every workspace nav anchor guarantees
					     native browser navigation (full document request) so deploys never leave
					     the user stuck on a stale SvelteKit client graph without a refresh. -->
					{#each drawerLinks as item (item.href)}
						<a
							class="ec-nav-link"
							class:ec-nav-link--active={navActive(item)}
							href={item.href}
							data-sveltekit-preload-data="hover"
						>
							<Icon name={item.icon as IconName} size={18} />
							<span class="ec-nav-link__label">{item.label}</span>
						</a>
					{/each}
					{#if showBilling}
						<p class="ec-nav-section">Billing</p>
						<a class="ec-nav-link" href="/upgrade" data-sveltekit-reload>
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
					<button
						type="button"
						class="ec-nav-link ec-nav-link--sign-out"
						disabled={disconnectBusy}
						onclick={() => void disconnect()}
					>
						<Icon name="nav.sign-out" size={18} />
						<span class="ec-nav-link__label">{disconnectBusy ? 'Signing out…' : 'Sign out'}</span>
					</button>
				</div>
			</div>
		</aside>

	<div class="ec-main tw-flex-1 tw-min-h-0 tw-overflow-y-auto">
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
			<!-- Command Palette trigger — desk only; field uses AppMenuSheet (no search/jump on field) -->
			{#if isDesktop}
				<div class="tw-flex-1 tw-flex tw-justify-center tw-px-4">
					<button
						type="button"
						class="tw-group tw-flex tw-items-center tw-justify-between tw-w-full tw-max-w-md tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-rounded-md tw-px-3 tw-py-1.5 tw-text-sm tw-text-[#94A3B8] hover:tw-border-[#FAFAFA] hover:tw-text-[#FAFAFA] tw-transition-colors"
						onclick={() => (cmdPaletteOpen = true)}
						aria-label="Open command palette"
						aria-keyshortcuts="Meta+K Control+K"
						aria-haspopup="dialog"
					>
						<span class="tw-flex tw-items-center tw-gap-2">
							<Icon name="action.search" size={14} aria-hidden="true" />
							<span class="tw-font-sans tw-tracking-tight">Search &amp; jump to…</span>
						</span>
						<kbd class="tw-hidden sm:tw-inline-flex tw-items-center tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#94A3B8] tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded tw-px-1.5 tw-py-0.5 group-hover:tw-text-[#14b8a6] group-hover:tw-border-[#14b8a6] tw-transition-colors">⌘K</kbd>
					</button>
				</div>
			{:else}
				<div class="tw-flex-1"></div>
			{/if}
			<div class="ec-topbar__right">
				<button
					type="button"
					class="ec-icon-btn icon-tap ec-bell-btn"
					onclick={() => alertsDrawer.toggle()}
					aria-label="Alerts"
					aria-haspopup="dialog"
					aria-expanded={alertsDrawer.open}
				>
					<Icon name="comm.bell" size={18} />
					{#if alertsDrawer.unreadCount > 0}
						<span class="ec-bell-badge" aria-label="{alertsDrawer.unreadCount} unread alerts">
							{alertsDrawer.unreadCount > 9 ? '9+' : alertsDrawer.unreadCount}
						</span>
					{/if}
				</button>
				<button
					type="button"
					class="ec-icon-btn icon-tap"
					onclick={() => goto('/settings')}
					aria-label="Settings"
				>
					<Icon name="sys.settings" size={18} />
				</button>
				<!-- Context Switcher stub removed per Phase 1 Minimalism Overhaul -->
				<!-- User identity: avatar + name -->
				<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2 tw-pl-1">
					<VanguardAvatar
						seed={authStore.user?.uid || authStore.user?.email || 'nexus'}
						size={32}
					/>
					<span
						class="tw-hidden lg:tw-block tw-max-w-[7rem] tw-truncate tw-font-mono tw-text-[0.65rem] tw-font-medium tw-text-slate-400"
						title={authStore.user?.email ?? ''}
					>
						{authStore.userProfile?.playerName || authStore.user?.email?.split('@')[0] || 'Account'}
					</span>
				</div>
			</div>
		</header>

		<div class="ec-canvas tw-overflow-y-auto tw-scrollbar-hide tw-min-h-0">
			{@render children?.()}
		</div>
	</div>
	</div>
</div>

{#if showFieldChrome}
	<MobilePinBar
		pins={navPinsStore.pins}
		catalog={navCatalog}
		personaKey={navPersonaKey}
		pathname={page.url.pathname}
		searchParams={page.url.searchParams}
		isActive={shellNavActive}
		variant={pinBarSkin}
		accent={tabBarAccent}
		onMenuOpen={() => fieldMenu.openBrowse()}
		onPinLongPress={(slotIndex) => fieldMenu.openPickPin(slotIndex)}
		showMenuSlot={showMenuSlot}
	/>
	<AppMenuSheet
		open={fieldMenuState.open}
		personaKey={navPersonaKey}
		catalog={menuSheetCatalog}
		pinnedHrefs={navPinsStore.pins.filter(Boolean) as string[]}
		mode={fieldMenuState.mode}
		pickSlotIndex={fieldMenuState.pickSlotIndex}
		skin={pinBarSkin}
		showBilling={showBilling}
		pathname={page.url.pathname}
		isActive={shellNavActive}
		onDismiss={() => fieldMenu.close()}
		onPickPin={(href) => navPinsStore.setPin(fieldMenu.pickSlotIndex, href)}
		onResetDefaults={() => navPinsStore.resetToDefaults()}
		onReportAnomaly={openAnomaly}
		showReportAnomaly={true}
		quickActions={fieldQuickActions}
	/>
{/if}
</div>

<!-- Global Command Palette (Cmd+K) -->
<CommandPalette bind:open={cmdPaletteOpen} />

<PlayerDetailDrawer />
<AlertsDrawer />

<!-- ── Anomaly Report Modal ─────────────────────────────────────────────── -->
{#if anomalyOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="ec-anomaly-backdrop" onclick={() => (anomalyOpen = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="ec-anomaly-modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-modal="true" aria-label="Report Anomaly">
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

	:global(.ec-nav-link--sign-out) {
		color: rgba(248, 113, 113, 0.62) !important;
	}
	:global(.ec-nav-link--sign-out:hover:not(:disabled)) {
		color: rgba(248, 113, 113, 0.92) !important;
		background: rgba(248, 113, 113, 0.08) !important;
	}
	:global(.ec-nav-link--sign-out:disabled) {
		opacity: 0.55;
		cursor: not-allowed;
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
		color: rgba(45, 212, 191, 0.8);
	}
	.ec-anomaly-sent-icon {
		font-size: 2rem;
		color: #2dd4bf;
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


	/* Bell button — alerts drawer toggle */
	.ec-bell-btn {
		position: relative;
	}

	/* Unread count badge */
	.ec-bell-badge {
		position: absolute;
		top: -3px;
		right: -4px;
		min-width: 16px;
		height: 16px;
		padding: 0 3px;
		border-radius: 999px;
		background: #e11d48;
		color: #fff;
		font-size: 0.6rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 16px;
		text-align: center;
		pointer-events: none;
		box-shadow: 0 0 0 2px var(--ec-topbar-bg, #0f172a);
	}
</style>
