<script lang="ts">
	import HudStatCell from '$lib/components/player/dashboard/HudStatCell.svelte';

	let {
		label,
		value,
		fill: _fill = 0,
		strokeColor: _strokeColor = 'var(--color-accent, #fbbf24)',
		variant = 'default',
		uid: _uid = 'metric',
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
</script>

<HudStatCell {label} {value} {variant} {title} />
