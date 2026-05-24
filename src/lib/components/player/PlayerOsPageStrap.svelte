<script lang="ts">
	/** Compact route header — dossier tokens only (Sprint 2.13). */
	let {
		eyebrow,
		title,
		ariaLabel = title,
		status,
		children,
	}: {
		eyebrow: string;
		title: string;
		ariaLabel?: string;
		status?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<header class="pd-route-strap" aria-label={ariaLabel}>
	<div class="pd-route-strap__grid">
		<div class="pd-route-strap__id">
			<p class="pd-eyebrow">{eyebrow}</p>
			<h1 class="pd-route-strap__title">{title}</h1>
		</div>
		{#if status}
			<div class="pd-route-strap__status" role="status">
				{@render status()}
			</div>
		{/if}
	</div>
	{#if children}
		{@render children()}
	{/if}
</header>
