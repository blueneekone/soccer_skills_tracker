<script lang="ts">
	let {
		value = $bindable(''),
		id = undefined,
		type = 'text',
		readonly = false,
		placeholder = '',
		autocomplete = undefined,
		class: className = '',
	}: {
		value?: string;
		id?: string;
		type?: string;
		readonly?: boolean;
		placeholder?: string;
		autocomplete?: import('svelte/elements').HTMLInputAttributes['autocomplete'];
		class?: string;
	} = $props();
</script>

<input
	{id}
	{type}
	class="pd-os-input{className ? ` ${className}` : ''}"
	bind:value
	{readonly}
	{placeholder}
	autocomplete={autocomplete}
/>
