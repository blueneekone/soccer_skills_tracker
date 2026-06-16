<script lang="ts">
	/** Minimal wrapper for acquisition print routes — chrome lives in AcquisitionPrintLayout */
	let { children } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

{@render children()}
