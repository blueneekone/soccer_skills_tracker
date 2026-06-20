<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		findCatalogItem,
		type NavPersonaKey,
		type NavPinItem,
		type PinTriple,
	} from '$lib/shell/navPinCatalog.js';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		pins: PinTriple;
		catalog: NavPinItem[];
		personaKey: NavPersonaKey;
		pathname: string;
		searchParams: URLSearchParams;
		isActive: (href: string) => boolean;
		variant?: 'enterprise' | 'player' | 'parent-trust';
		accent?: 'cyan' | 'neutral' | 'gold';
		gatedHrefs?: Set<string>;
		onNavClick?: (href: string, e: MouseEvent) => void;
		onMenuOpen: () => void;
		onPinLongPress: (slotIndex: 0 | 1 | 2) => void;
		showMenuSlot?: boolean;
	}

	let {
		pins,
		catalog,
		personaKey,
		pathname,
		searchParams,
		isActive,
		variant = 'enterprise',
		accent = 'cyan',
		gatedHrefs = new Set<string>(),
		onNavClick,
		onMenuOpen,
		onPinLongPress,
		showMenuSlot = false,
	}: Props = $props();

	const LONG_PRESS_MS = 500;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressSlot = $state<0 | 1 | 2 | null>(null);

	function resolvePinItem(href: string | null): NavPinItem | null {
		if (!href) return null;
		return findCatalogItem(personaKey, href) ?? catalog.find((c) => c.href === href) ?? null;
	}

	function clearLongPressTimer() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		longPressSlot = null;
	}

	function onPinPointerDown(slotIndex: 0 | 1 | 2) {
		clearLongPressTimer();
		longPressSlot = slotIndex;
		longPressTimer = setTimeout(() => {
			onPinLongPress(slotIndex);
			longPressSlot = null;
			longPressTimer = null;
		}, LONG_PRESS_MS);
	}

	function onPinPointerUp() {
		clearLongPressTimer();
	}

	function handleNavClick(href: string, e: MouseEvent) {
		onNavClick?.(href, e);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<nav
	class="mobile-pin-bar"
	class:mobile-pin-bar--enterprise={variant === 'enterprise' || variant === 'parent-trust'}
	class:mobile-pin-bar--player={variant === 'player'}
	class:mobile-pin-bar--parent-trust={variant === 'parent-trust'}
	class:mobile-pin-bar--accent-neutral={accent === 'neutral'}
	class:mobile-pin-bar--accent-gold={accent === 'gold'}
	aria-label="Main navigation"
>
	<div class="mobile-pin-bar__row" role="tablist">
		{#each pins as href, slotIndex (slotIndex)}
			{@const item = resolvePinItem(href)}
			{@const slot = slotIndex as 0 | 1 | 2}
			{#if item}
				{@const active = isActive(item.href)}
				{@const gated = gatedHrefs.has(item.href)}
				<a
					href={item.href}
					role="tab"
					aria-selected={active}
					aria-label={item.label}
					aria-disabled={gated ? 'true' : undefined}
					class="mobile-pin-bar__slot mobile-pin-bar__slot--pin"
					class:mobile-pin-bar__slot--active={active}
					class:mobile-pin-bar__slot--gated={gated}
					data-sveltekit-reload
					data-sveltekit-preload-data="hover"
					onpointerdown={() => onPinPointerDown(slot)}
					onpointerup={onPinPointerUp}
					onpointerleave={onPinPointerUp}
					onpointercancel={onPinPointerUp}
					onclick={(e) => handleNavClick(item.href, e)}
				>
					<Icon name={item.icon as IconName} size={22} />
					<span class="mobile-pin-bar__label">{item.label}</span>
				</a>
			{:else}
				<button
					type="button"
					class="mobile-pin-bar__slot mobile-pin-bar__slot--empty"
					aria-label="Pin a route — long press to customize"
					onpointerdown={() => onPinPointerDown(slot)}
					onpointerup={onPinPointerUp}
					onpointerleave={onPinPointerUp}
					onpointercancel={onPinPointerUp}
					onclick={() => onPinLongPress(slot)}
				>
					<Icon name="action.add" size={20} />
					<span class="mobile-pin-bar__label">Pin</span>
				</button>
			{/if}
		{/each}

		{#if showMenuSlot}
			<button
				type="button"
				class="mobile-pin-bar__slot mobile-pin-bar__slot--menu"
				aria-label="Open menu"
				onclick={onMenuOpen}
			>
				<Icon name="nav.menu" size={22} />
				<span class="mobile-pin-bar__label">Menu</span>
			</button>
		{/if}
	</div>
</nav>

<style>
	.mobile-pin-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 950;
		min-height: calc(56px + env(safe-area-inset-bottom, 0px));
		padding-bottom: env(safe-area-inset-bottom, 0px);
		background: rgba(2, 2, 2, 0.88);
		backdrop-filter: blur(20px) saturate(160%);
		border-top: 1px solid rgba(20, 184, 166, 0.15);
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.6);
		touch-action: manipulation;
	}

	.mobile-pin-bar--enterprise,
	.mobile-pin-bar--parent-trust {
		background: #0f172a;
		backdrop-filter: none;
		border-top: 1px solid rgba(148, 163, 184, 0.22);
		box-shadow: none;
	}

	.mobile-pin-bar--player {
		background: rgba(15, 23, 42, 0.96);
		border-top-color: rgba(251, 191, 36, 0.18);
	}

	@media (min-width: 1024px) {
		.mobile-pin-bar {
			display: none;
		}
	}

	.mobile-pin-bar__row {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		justify-content: space-around;
		width: 100%;
		height: 56px;
	}

	.mobile-pin-bar__slot {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 44px;
		min-width: 44px;
		padding: 4px 2px;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
		cursor: pointer;
		transition: color 150ms ease, transform 150ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.mobile-pin-bar__slot:active {
		transform: scale(0.95);
	}

	@media (prefers-reduced-motion: reduce) {
		.mobile-pin-bar__slot:active {
			transform: none;
		}
	}

	.mobile-pin-bar__slot--active {
		color: #14b8a6;
	}

	.mobile-pin-bar--accent-neutral .mobile-pin-bar__slot--active {
		color: #cbd5e1;
	}

	.mobile-pin-bar--accent-gold .mobile-pin-bar__slot--active {
		color: #fbbf24;
	}

	.mobile-pin-bar__slot--empty {
		color: rgba(255, 255, 255, 0.28);
	}

	.mobile-pin-bar__slot--gated {
		opacity: 0.45;
	}

	.mobile-pin-bar__label {
		font-family: monospace;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		line-height: 1;
		max-width: 4.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
