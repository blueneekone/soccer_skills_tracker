<script lang="ts">
	import { isShellNavActive } from '$lib/shell/workspaceNav.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface NavLink {
		label: string;
		icon: string;
		href: string;
		tab?: string;
	}

	interface Props {
		links: NavLink[];
		pathname: string;
		searchParams: URLSearchParams;
	}

	let { links, pathname, searchParams }: Props = $props();

	const visibleLinks = $derived(links.slice(0, 5));
</script>

<nav class="mobile-tab-bar" aria-label="Main navigation">
	<div
		role="tablist"
		class="tw-flex tw-flex-row tw-items-stretch tw-justify-around tw-w-full tw-h-full"
	>
		{#each visibleLinks as item (item.href)}
			{@const active = isShellNavActive(pathname, searchParams, item)}
			<a
				href={item.href}
				role="tab"
				aria-selected={active}
				class="tab-item tw-flex tw-flex-col tw-items-center tw-justify-center tw-flex-1 tw-gap-0.5 tw-no-underline tw-select-none"
				class:tab-item--active={active}
			>
				<Icon name={item.icon as IconName} size={22} />
				<span class="tab-label">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.mobile-tab-bar {
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
	}

	@media (min-width: 1024px) {
		.mobile-tab-bar {
			display: none;
		}
	}

	.tab-item {
		min-height: 44px;
		min-width: 44px;
		color: rgba(255, 255, 255, 0.45);
		transition: color 150ms ease, transform 150ms ease;
	}

	.tab-item:active {
		transform: scale(0.95);
	}

	@media (prefers-reduced-motion: reduce) {
		.tab-item:active {
			transform: none;
		}
	}

	.tab-item--active {
		color: #14b8a6;
	}

	.tab-label {
		font-family: monospace;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		line-height: 1;
	}
</style>
