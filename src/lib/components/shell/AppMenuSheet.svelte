<script lang="ts">
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { portal } from '$lib/actions/portal.js';
	import WorkspaceContextSwitcher from '$lib/components/shell/WorkspaceContextSwitcher.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		catalogSections,
		showWorkspaceSwitcher,
		type NavPersonaKey,
		type NavPinItem,
	} from '$lib/shell/navPinCatalog.js';
	import type { FieldQuickAction } from '$lib/shell/fieldQuickActions.js';
	import type { IconName } from '$lib/icons/registry.js';
	import { fieldMenu, fieldMenuDismissBlocked, FIELD_MENU_DISMISS_GUARD_MS } from '$lib/stores/fieldMenu.svelte.js';

	interface Props {
		open: boolean;
		personaKey: NavPersonaKey;
		catalog: NavPinItem[];
		pinnedHrefs: string[];
		mode?: 'browse' | 'pick-pin';
		pickSlotIndex?: 0 | 1 | 2 | 3;
		skin?: 'enterprise' | 'player' | 'parent-trust';
		showBilling?: boolean;
		pathname: string;
		isActive: (href: string) => boolean;
		onDismiss: () => void;
		onPickPin?: (href: string) => void;
		onResetDefaults?: () => void;
		onReportAnomaly?: () => void;
		showReportAnomaly?: boolean;
		quickActions?: FieldQuickAction[];
	}

	let {
		open,
		personaKey,
		catalog,
		pinnedHrefs,
		mode = 'browse',
		pickSlotIndex = 0,
		skin = 'enterprise',
		showBilling = false,
		pathname,
		isActive,
		onDismiss,
		onPickPin,
		onResetDefaults,
		onReportAnomaly,
		showReportAnomaly = false,
		quickActions = [],
	}: Props = $props();

	let signingOut = $state(false);
	let dragStartY = $state(0);
	let backdropInteractive = $state(false);

	const pinnedSet = $derived(new Set(pinnedHrefs.filter(Boolean)));
	const sections = $derived(catalogSections(catalog));
	const personaLabel = $derived(
		personaKey.charAt(0).toUpperCase() + personaKey.slice(1),
	);

	function itemsInSection(section: string): NavPinItem[] {
		return catalog.filter((item) => item.section === section);
	}

	function handlePick(href: string) {
		if (mode === 'pick-pin') {
			onPickPin?.(href);
			onDismiss();
			return;
		}
		onDismiss();
	}

	async function disconnect() {
		if (signingOut) return;
		signingOut = true;
		try {
			await handleSignOut();
		} finally {
			signingOut = false;
			onDismiss();
		}
	}

	function dismissSheet() {
		if (fieldMenuDismissBlocked()) return;
		onDismiss();
	}

	function onBackdropPointerDown(e: PointerEvent) {
		if (fieldMenuDismissBlocked()) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function onSheetTouchStart(e: TouchEvent) {
		const t = e.touches[0];
		if (t) dragStartY = t.clientY;
	}

	function onSheetTouchEnd(e: TouchEvent) {
		const t = e.changedTouches[0];
		if (!t) return;
		if (t.clientY - dragStartY >= 44) dismissSheet();
	}

	$effect(() => {
		if (!open || typeof document === 'undefined') return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

	$effect(() => {
		if (!open) {
			backdropInteractive = false;
			return;
		}
		backdropInteractive = false;
		const id = setTimeout(() => {
			backdropInteractive = true;
		}, FIELD_MENU_DISMISS_GUARD_MS);
		return () => clearTimeout(id);
	});

	$effect(() => {
		if (!open || !import.meta.env.DEV || catalog.length > 0) return;
		console.warn('[AppMenuSheet] empty nav catalog — check getNavCatalog(personaKey)', {
			personaKey,
			catalogLength: catalog.length,
		});
	});
</script>

{#if open}
	<div class="app-menu-portal" use:portal>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="app-menu-backdrop"
		class:app-menu-backdrop--player={skin === 'player'}
		class:app-menu-backdrop--inert={!backdropInteractive}
		role="presentation"
		onpointerdown={onBackdropPointerDown}
		onclick={dismissSheet}
	></div>

	<div
		class="app-menu-sheet"
		class:app-menu-sheet--player={skin === 'player'}
		class:app-menu-sheet--parent-trust={skin === 'parent-trust'}
		role="dialog"
		aria-modal="true"
		aria-label={mode === 'pick-pin' ? `Choose pin for slot ${pickSlotIndex + 1}` : 'App menu'}
		ontouchstart={onSheetTouchStart}
		ontouchend={onSheetTouchEnd}
	>
		<div class="app-menu-sheet__handle" aria-hidden="true"></div>

		<header class="app-menu-sheet__head">
			<span class="app-menu-sheet__title">
				{mode === 'pick-pin' ? `Choose pin · slot ${pickSlotIndex + 1}` : 'Menu'}
			</span>
			<button type="button" class="app-menu-sheet__close icon-tap" onclick={onDismiss} aria-label="Close">
				<Icon name="sys.close" size={20} />
			</button>
		</header>

		<div class="app-menu-sheet__scroll">
			{#if mode === 'browse' && showWorkspaceSwitcher(personaKey)}
				<section class="app-menu-sheet__section">
					<p class="app-menu-sheet__section-label">Workspace</p>
					<div class="app-menu-sheet__workspace">
						<WorkspaceContextSwitcher variant="sidebar" />
					</div>
				</section>
			{/if}

			{#each sections as section (section)}
				<section class="app-menu-sheet__section">
					<p class="app-menu-sheet__section-label">{section}</p>
					<nav class="app-menu-sheet__nav" aria-label={section}>
						{#each itemsInSection(section) as item (item.href)}
							{@const active = isActive(item.href)}
							{@const pinned = pinnedSet.has(item.href)}
							{#if mode === 'pick-pin'}
								<button
									type="button"
									class="app-menu-sheet__link"
									class:app-menu-sheet__link--pinned={pinned}
									onclick={() => handlePick(item.href)}
								>
									<Icon name={item.icon as IconName} size={20} />
									<span>{item.label}</span>
									{#if pinned}
										<span class="app-menu-sheet__badge">Pinned</span>
									{/if}
								</button>
							{:else}
								<a
									class="app-menu-sheet__link"
									class:app-menu-sheet__link--active={active}
									class:app-menu-sheet__link--pinned-dim={pinned}
									href={item.href}
									data-sveltekit-reload
									data-sveltekit-preload-data="hover"
									onclick={() => onDismiss()}
								>
									<Icon name={item.icon as IconName} size={20} />
									<span>{item.label}</span>
									{#if pinned}
										<span class="app-menu-sheet__badge app-menu-sheet__badge--dim">Pin</span>
									{/if}
								</a>
							{/if}
						{/each}
					</nav>
				</section>
			{/each}

			{#if mode === 'browse' && showBilling}
				<section class="app-menu-sheet__section">
					<p class="app-menu-sheet__section-label">Billing</p>
					<a
						class="app-menu-sheet__link"
						href="/upgrade"
						data-sveltekit-reload
						onclick={() => onDismiss()}
					>
						<Icon name="sys.credit-card" size={20} />
						<span>Plans & Billing</span>
					</a>
				</section>
			{/if}

			{#if mode === 'browse' && quickActions.length > 0}
				<section class="app-menu-sheet__section">
					<p class="app-menu-sheet__section-label">Quick actions</p>
					<nav class="app-menu-sheet__nav" aria-label="Quick actions">
						{#each quickActions as action (action.href)}
							<a
								class="app-menu-sheet__link app-menu-sheet__link--quick"
								href={action.href}
								data-sveltekit-reload
								data-sveltekit-preload-data="hover"
								onclick={() => onDismiss()}
							>
								<Icon name={action.icon} size={20} />
								<span>{action.label}</span>
							</a>
						{/each}
					</nav>
				</section>
			{/if}

			{#if mode === 'browse'}
				<section class="app-menu-sheet__section">
					<p class="app-menu-sheet__section-label">System</p>
					<a
						class="app-menu-sheet__link"
						href="mailto:support@sstracker.app?subject=SSTRACKER%20support"
						rel="noopener noreferrer"
						onclick={() => onDismiss()}
					>
						<Icon name="sys.lifebuoy" size={20} />
						<span>Support / Help Desk</span>
					</a>
					{#if showReportAnomaly && onReportAnomaly}
						<button type="button" class="app-menu-sheet__link app-menu-sheet__link--anomaly" onclick={onReportAnomaly}>
							<Icon name="status.warning" size={20} />
							<span>Report Anomaly</span>
						</button>
					{/if}
					<button
						type="button"
						class="app-menu-sheet__link app-menu-sheet__link--sign-out"
						disabled={signingOut}
						onclick={() => void disconnect()}
					>
						<Icon name="nav.sign-out" size={18} />
						<span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
					</button>
				</section>
			{/if}
		</div>

		{#if mode === 'browse' && onResetDefaults}
			<footer class="app-menu-sheet__footer">
				<button type="button" class="app-menu-sheet__reset" onclick={onResetDefaults}>
					Reset to {personaLabel} defaults
				</button>
			</footer>
		{/if}
	</div>
	</div>
{/if}

<style>
	.app-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10002;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
	}

	.app-menu-backdrop--inert {
		pointer-events: none;
	}

	.app-menu-backdrop--player {
		background: rgba(2, 6, 23, 0.72);
	}

	.app-menu-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10003;
		max-height: min(88vh, 640px);
		display: flex;
		flex-direction: column;
		background: #0f172a;
		border-top: 1px solid rgba(148, 163, 184, 0.22);
		border-radius: 12px 12px 0 0;
		box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.45);
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	.app-menu-sheet--player {
		background: rgba(15, 23, 42, 0.98);
		border-top-color: rgba(251, 191, 36, 0.2);
	}

	.app-menu-sheet--parent-trust {
		border-top-color: rgba(148, 163, 184, 0.28);
	}

	.app-menu-sheet__handle {
		width: 36px;
		height: 4px;
		margin: 8px auto 4px;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.35);
		flex-shrink: 0;
	}

	.app-menu-sheet__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px 12px;
		border-bottom: 1px solid rgba(148, 163, 184, 0.12);
		flex-shrink: 0;
	}

	.app-menu-sheet__title {
		font-family: monospace;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #cbd5e1;
	}

	.app-menu-sheet--player .app-menu-sheet__title {
		color: rgba(251, 191, 36, 0.85);
	}

	.app-menu-sheet__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
	}

	.app-menu-sheet__scroll {
		overflow-y: auto;
		flex: 1 1 auto;
		min-height: 0;
		padding: 8px 12px 12px;
	}

	.app-menu-sheet__section {
		margin-bottom: 12px;
	}

	.app-menu-sheet__section-label {
		margin: 0 0 6px;
		padding: 0 8px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}

	.app-menu-sheet__workspace {
		padding: 0 4px 4px;
	}

	.app-menu-sheet__nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.app-menu-sheet__link {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: #e2e8f0;
		font-size: 14px;
		text-decoration: none;
		text-align: left;
		cursor: pointer;
		transition: background 120ms ease;
	}

	.app-menu-sheet__link:hover {
		background: rgba(148, 163, 184, 0.08);
	}

	.app-menu-sheet__link--active {
		background: rgba(20, 184, 166, 0.12);
		color: #5eead4;
	}

	.app-menu-sheet--player .app-menu-sheet__link--active {
		background: rgba(251, 191, 36, 0.1);
		color: #fbbf24;
	}

	.app-menu-sheet__link--pinned-dim {
		opacity: 0.72;
	}

	.app-menu-sheet__link--anomaly {
		color: rgba(251, 191, 36, 0.75);
	}

	.app-menu-sheet__link--quick {
		color: #5eead4;
	}

	.app-menu-sheet--player .app-menu-sheet__link--quick {
		color: rgba(251, 191, 36, 0.85);
	}

	.app-menu-sheet__link--sign-out {
		color: rgba(248, 113, 113, 0.82);
	}

	.app-menu-sheet__link:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.app-menu-sheet__badge {
		margin-left: auto;
		font-size: 9px;
		font-family: monospace;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #14b8a6;
	}

	.app-menu-sheet__badge--dim {
		color: #64748b;
	}

	.app-menu-sheet__footer {
		flex-shrink: 0;
		padding: 8px 16px 12px;
		border-top: 1px solid rgba(148, 163, 184, 0.12);
	}

	.app-menu-sheet__reset {
		width: 100%;
		min-height: 44px;
		border: 1px dashed rgba(148, 163, 184, 0.35);
		border-radius: 8px;
		background: transparent;
		color: #94a3b8;
		font-family: monospace;
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.app-menu-sheet__reset:hover {
		border-color: rgba(148, 163, 184, 0.55);
		color: #cbd5e1;
	}
</style>
