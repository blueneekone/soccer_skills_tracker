<script>
	import { browser } from '$app/environment';
	import { renderOperativeAvatarSvg } from '$lib/avatars/operativeAvatar.js';

	let {
		seed = '',
		size = 96,
		class: className = '',
	} = $props();

	let svgMarkup = $state('');

	$effect(() => {
		if (!browser) return;
		const s = seed;
		svgMarkup = renderOperativeAvatarSvg(s, size);
	});
</script>

<div
	class={`operative-avatar-preview tw-shrink-0 ${className}`}
	style={`width:${size}px;height:${size}px`}
	aria-hidden="true"
>
	{#if svgMarkup}
		<!-- DiceBear-generated SVG (deterministic from seed). -->
		{@html svgMarkup}
	{/if}
</div>

<style>
	.operative-avatar-preview :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 9999px;
	}
</style>
