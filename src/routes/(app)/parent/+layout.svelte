<script lang="ts">
	import '$lib/styles/parent-lounge-shell.css';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();

	const NAV = [
		{ href: '/parent/household', label: 'Household' },
		{ href: '/parent/dashboard', label: 'Dashboard' },
		{ href: '/parent/vpc', label: 'Consent' },
		{ href: '/parent/payments', label: 'Payments' },
		{ href: '/parent/log-workout', label: 'Log workout' },
		{ href: '/settings', label: 'Settings' },
		{ href: '/messages', label: 'Messages' },
	] as const;

	function navActive(href: string) {
		const path = page.url.pathname;
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<div class="parent-os-root parent-lounge-shell">
	<nav class="parent-lounge-z4-nav" aria-label="Parent lounge">
		{#each NAV as item (item.href)}
			<a
				href={item.href}
				class="parent-lounge-z4-nav__link"
				class:parent-lounge-z4-nav__link--active={navActive(item.href)}
			>
				{item.label}
			</a>
		{/each}
	</nav>
	<div class="parent-lounge-z1-well">
		{@render children?.()}
	</div>
</div>
