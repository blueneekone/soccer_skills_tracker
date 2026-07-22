<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = '',
	}: {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<div class="v-bento-grid {className}">
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.v-bento-grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		grid-auto-rows: minmax(min-content, max-content);
		gap: 1rem;
		width: 100%;
		background-color: #000000; /* Z0 Void Black */
	}

	/* Asymmetric constraints logic per the instructions */
	:global(.v-bento-grid > *) {
		/* Mathematically lock the bento track/item constraints */
		min-width: clamp(280px, 30vw, 350px);
		grid-column: span 12 / span 12;
	}

	@media (min-width: 768px) {
		:global(.v-bento-grid > *) {
			grid-column: span 6 / span 6;
		}
	}

	@media (min-width: 1024px) {
		:global(.v-bento-grid > *) {
			grid-column: span 4 / span 4;
		}
	}
</style>
