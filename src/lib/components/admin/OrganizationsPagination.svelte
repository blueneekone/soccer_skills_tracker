<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		orgPage: number;
		orgTotalPages: number;
		filteredCount: number;
		onPrev: () => void;
		onNext: () => void;
	}

	let { orgPage, orgTotalPages, filteredCount, onPrev, onNext }: Props = $props();
</script>

{#if orgTotalPages > 1}
	<div class="orgs3-pager" role="navigation" aria-label="Organizations pagination">
		<button type="button" class="orgs3-page-btn tw-flex tw-items-center tw-gap-1 tw-text-nuclear-yellow disabled:tw-text-[#A1A1AA]" disabled={orgPage <= 0} onclick={onPrev}>
			<Icon name={"nav.chevron-left" as IconName} size={14} />
			Prev
		</button>
		<span class="orgs3-page-info">
			Page {orgPage + 1} / {orgTotalPages}
			<span class="orgs3-page-count">({filteredCount} results)</span>
		</span>
		<button
			type="button"
			class="orgs3-page-btn tw-flex tw-items-center tw-gap-1 tw-text-nuclear-yellow disabled:tw-text-[#A1A1AA]"
			disabled={orgPage >= orgTotalPages - 1}
			onclick={onNext}
		>
			Next
			<Icon name={"nav.chevron-right" as IconName} size={14} />
		</button>
	</div>
{/if}
