<script lang="ts">
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';

	let {
		label,
		value,
		fill = 0,
		strokeColor = 'var(--color-accent, #fbbf24)',
		variant = 'default',
		uid = 'metric',
		title = '',
	}: {
		label: string;
		value: string;
		fill?: number;
		strokeColor?: string;
		variant?: 'streak' | 'xp' | 'default';
		uid?: string;
		title?: string;
	} = $props();

	const ringSize = 20;
</script>

<span
	class="ibm-metric-chip"
	class:ibm-metric-chip--streak={variant === 'streak'}
	class:ibm-metric-chip--xp={variant === 'xp'}
	class:ibm-metric-chip--streak-active={variant === 'streak' && fill > 0}
	{title}
>
	<HudSeededRingCanvas
		{uid}
		size={ringSize}
		{fill}
		{strokeColor}
		showCenter={false}
	/>
	<span class="ibm-metric-chip__stack">
		<span class="ibm-metric-chip__label">{label}</span>
		<span class="ibm-metric-chip__value">{value}</span>
	</span>
</span>

<style>
	.ibm-metric-chip {
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
