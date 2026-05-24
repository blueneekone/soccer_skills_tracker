<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		value = $bindable(''),
		id = undefined,
		class: className = '',
		children,
	}: {
		value?: string;
		id?: string;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<select
	{id}
	class="pd-os-input pd-os-select{className ? ` ${className}` : ''}"
	bind:value
>
	{@render children?.()}
</select>
