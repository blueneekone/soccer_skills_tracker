<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let {
		label,
		value,
		variant = 'default',
		title = '',
	}: {
		label: string;
		value: string;
		variant?: 'streak' | 'xp' | 'default';
		title?: string;
	} = $props();

	const iconName = $derived(
		variant === 'streak' ? ('game.flame' as IconName) : variant === 'xp' ? ('game.zap' as IconName) : null,
	);
</script>

<span
	class="hud-stat-cell"
	class:hud-stat-cell--streak={variant === 'streak'}
	class:hud-stat-cell--xp={variant === 'xp'}
	{title}
>
	{#if iconName}
		<span class="hud-stat-cell__icon-badge" aria-hidden="true">
			<Icon name={iconName} size={14} />
		</span>
		<span class="hud-stat-cell__text">
			<span class="hud-stat-cell__label">{label}</span>
			<span class="hud-stat-cell__value">{value}</span>
		</span>
	{:else}
		<span class="hud-stat-cell__label">{label}</span>
		<span class="hud-stat-cell__value">{value}</span>
	{/if}
</span>

<style>
	.hud-stat-cell {
		clip-path: polygon(
			0 5px,
			5px 0,
			calc(100% - 5px) 0,
			100% 5px,
			100% calc(100% - 5px),
			calc(100% - 5px) 100%,
			5px 100%,
			0 calc(100% - 5px)
		);
	}
</style>
