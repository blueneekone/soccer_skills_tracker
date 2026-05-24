<script lang="ts">
	type Variant = 'primary' | 'data' | 'ghost' | 'danger';

	let {
		variant = 'data',
		disabled = false,
		href = undefined,
		type = 'button',
		class: className = '',
		onclick,
		children,
	}: {
		variant?: Variant;
		disabled?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: import('svelte').Snippet;
	} = $props();

	const classes = $derived(
		`pd-os-btn pd-os-btn--${variant}${className ? ` ${className}` : ''}`,
	);
</script>

{#if href}
	<a {href} class={classes} aria-disabled={disabled ? 'true' : undefined}>
		{@render children?.()}
	</a>
{:else}
	<button {type} {disabled} class={classes} {onclick}>
		{@render children?.()}
	</button>
{/if}
