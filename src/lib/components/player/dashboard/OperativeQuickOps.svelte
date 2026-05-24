<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	type QuickOpLink = {
		label: string;
		href: string;
		icon: IconName;
		subtitle: string;
	};

	const QUICK_OPS: readonly QuickOpLink[] = Object.freeze([
		{
			label: 'Log session',
			href: '/player/workout',
			icon: 'content.checks',
			subtitle: 'Record training · earn XP',
		},
		{
			label: 'Telemetry',
			href: '/stats',
			icon: 'data.chart-bar',
			subtitle: 'Radar · workout charts',
		},
		{
			label: 'Armory',
			href: '/player/armory',
			icon: 'status.shield-check',
			subtitle: 'Gear · studio · album',
		},
	]);
</script>

<section
	class="oqo-deck bento-span-12 pd-page-panel"
	aria-label="Quick operations"
	data-region="operative-quick-ops"
>
	<header class="oqo-deck__head">
		<p class="oqo-deck__eyebrow pd-label">Operative actions</p>
		<h2 class="oqo-deck__title">Quick ops</h2>
	</header>
	<nav class="oqo-deck__grid" aria-label="Player quick destinations">
		{#each QUICK_OPS as op (`${op.label}-${op.href}`)}
			<a
				href={resolve(op.href)}
				class="oqo-op"
				data-sveltekit-preload-data="hover"
			>
				<span class="oqo-op__icon" aria-hidden="true">
					<Icon name={op.icon} size={18} />
				</span>
				<span class="oqo-op__label">{op.label}</span>
				<span class="oqo-op__sub">{op.subtitle}</span>
			</a>
		{/each}
	</nav>
</section>
