<script lang="ts">
	import { renderOperativeAvatarSvg } from '$lib/avatars/operativeAvatar.js';

	let {
		seed = 'player',
		size = 56,
		class: klass = '',
		alt = '',
		skeleton = false,
	}: {
		seed?: string;
		size?: number;
		class?: string;
		alt?: string;
		skeleton?: boolean;
	} = $props();

	const svgMarkup = $derived(renderOperativeAvatarSvg(seed || 'player', size));
	const initials = $derived((seed || '??').slice(0, 2).toUpperCase());
	const showSkeleton = $derived(skeleton || !seed);
</script>

{#if showSkeleton}
	<div
		class="uid-avatar uid-avatar--skeleton {klass}"
		style="--uid-avatar-size: {size}px;"
		role={alt ? 'img' : undefined}
		aria-label={alt || undefined}
	>
		<span class="uid-avatar__initials">{initials}</span>
	</div>
{:else}
	<div
		class="uid-avatar {klass}"
		style="--uid-avatar-size: {size}px;"
		role={alt ? 'img' : undefined}
		aria-label={alt || undefined}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html svgMarkup}
	</div>
{/if}

<style>
	.uid-avatar {
		width: var(--uid-avatar-size, 56px);
		height: var(--uid-avatar-size, 56px);
		min-width: var(--uid-avatar-size, 56px);
		flex-shrink: 0;
		overflow: hidden;
		border-radius: 24px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #14b8a6) 35%, transparent);
		background: var(--color-dominant, #0f172a);
	}

	.uid-avatar :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.uid-avatar--skeleton {
		background: rgba(251, 191, 36, 0.08);
		border-color: rgba(251, 191, 36, 0.25);
		display: grid;
		place-items: center;
	}

	.uid-avatar__initials {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.72rem;
		font-weight: 900;
		color: #fbbf24;
		opacity: 0.5;
		letter-spacing: 0.08em;
		line-height: 1;
	}
</style>
