<script lang="ts">
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
		<button type="button" class="orgs3-page-btn" disabled={orgPage <= 0} onclick={onPrev}>
			← Prev
		</button>
		<span class="orgs3-page-info">
			Page {orgPage + 1} / {orgTotalPages}
			<span class="orgs3-page-count">({filteredCount} results)</span>
		</span>
		<button
			type="button"
			class="orgs3-page-btn"
			disabled={orgPage >= orgTotalPages - 1}
			onclick={onNext}
		>
			Next →
		</button>
	</div>
{/if}
