<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		value?: string;
		placeholder?: string;
		ariaLabel?: string;
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

<div class="tw-flex tw-items-center tw-h-10 tw-bg-transparent tw-border-b tw-border-[#334155] tw-rounded-none tw-w-full tw-max-w-md tw-px-1 tw-transition-colors focus-within:tw-border-[#14b8a6]">
	{#if icon}
		<span class="tw-text-[#94A3B8] tw-flex-shrink-0 tw-mr-3" aria-hidden="true">
			<Icon name={icon} size={16} />
		</span>
	{/if}
	<input
		type="search"
		class="tw-flex-1 tw-bg-transparent tw-border-none tw-outline-none tw-text-[#FAFAFA] tw-text-sm tw-font-mono tw-placeholder-[#475569] tw-h-full"
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
			class="tw-bg-transparent tw-border-none tw-text-[#475569] hover:tw-text-[#FAFAFA] tw-ml-2 tw-px-2 tw-transition-colors tw-flex-shrink-0"
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
			class="tw-bg-transparent tw-ml-3 tw-px-4 tw-h-full tw-border-none tw-text-[#14b8a6] hover:tw-text-[#FAFAFA] hover:tw-bg-[#14b8a6]/10 tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors disabled:tw-opacity-50"
			onclick={() => onSearch?.()}
			disabled={loading || disabled}
			aria-label={submitLabel || 'Run search'}
		>
			{submitLabel || 'Search'}
		</button>
	{/if}
</div>
