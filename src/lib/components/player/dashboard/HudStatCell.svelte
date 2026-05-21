<script lang="ts">
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
</script>

<span
	class="hud-stat-cell"
	class:hud-stat-cell--streak={variant === 'streak'}
	class:hud-stat-cell--xp={variant === 'xp'}
	{title}
>
	<span class="hud-stat-cell__label">{label}</span>
	<span class="hud-stat-cell__value">{value}</span>
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
