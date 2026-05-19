<script lang="ts">
	import { renderBauhausAvatarSvg } from '$lib/avatars/bauhausAvatar.js';

	let {
		seed = 'player',
		size = 56,
		class: klass = '',
		alt = '',
	}: {
		seed?: string;
		size?: number;
		class?: string;
		alt?: string;
	} = $props();

	const svgMarkup = $derived(renderBauhausAvatarSvg(seed || 'player', size));
</script>

<div
	class="uid-avatar {klass}"
	style="--uid-avatar-size: {size}px;"
	role={alt ? 'img' : undefined}
	aria-label={alt || undefined}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html svgMarkup}
</div>

<style>
	.uid-avatar {
		width: var(--uid-avatar-size, 56px);
		height: var(--uid-avatar-size, 56px);
		min-width: var(--uid-avatar-size, 56px);
		flex-shrink: 0;
		overflow: hidden;
		border-radius: 24px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 35%, transparent);
		background: var(--color-dominant, #0f172a);
	}

	.uid-avatar :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>


