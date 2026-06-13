<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		value?: string;
		placeholder?: string;
		ariaLabel?: string;
		narrow?: boolean;
		compact?: boolean;
		showClear?: boolean;
		submitLabel?: string;
		loading?: boolean;
		disabled?: boolean;
		icon?: IconName | null;
		onSearch?: () => void;
		onClear?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search…',
		ariaLabel = 'Search',
		narrow = false,
		compact = false,
		showClear = true,
		submitLabel = '',
		loading = false,
		disabled = false,
		icon = 'action.search',
		onSearch,
		onClear,
		onkeydown,
	}: Props = $props();

	const hasSubmit = $derived(Boolean(submitLabel || onSearch));

	function clearSearch() {
		value = '';
		onClear?.();
	}
</script>

<div
	class="adm-console-search"
	class:adm-console-search--narrow={narrow}
	class:adm-console-search--compact={compact}
	role="search"
>
	{#if icon}
		<span class="adm-console-search__icon" aria-hidden="true">
			<Icon name={icon} size={16} />
		</span>
	{/if}
	<input
		type="search"
		bind:value
		{placeholder}
		aria-label={ariaLabel}
		autocomplete="off"
		spellcheck="false"
		{disabled}
		{onkeydown}
	/>
	{#if showClear && value.trim()}
		<button
			type="button"
			class="adm-console-search__clear"
			onclick={clearSearch}
			aria-label="Clear search"
			title="Clear search"
		>
			<Icon name="sys.close" size={14} aria-hidden="true" />
		</button>
	{/if}
	{#if hasSubmit}
		<button
			type="button"
			class="adm-console-search__submit"
			onclick={() => onSearch?.()}
			disabled={loading || disabled}
			aria-label={submitLabel || 'Run search'}
		>
			{submitLabel || 'Search'}
		</button>
	{/if}
</div>
