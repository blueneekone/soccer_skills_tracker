<script>
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';

	/**
	 * @typedef {'sm' | 'md' | 'lg' | 'xl'} LogoSize
	 */

	let {
		size = 'md',
		alt = 'Club logo',
		/** When set (e.g. recruiter cards), overrides global club branding. */
		logoUrl: logoUrlOverride = '',
		class: className = ''
	} = $props();

	const effectiveUrl = $derived(
		typeof logoUrlOverride === 'string' && logoUrlOverride.trim() ?
			logoUrlOverride.trim() :
			clubBrandingStore.logoUrl
	);

	const dim = $derived(
		(
			{
				sm: 28,
				md: 40,
				lg: 56,
				xl: 72
			}[/** @type {LogoSize} */ (size)] ?? 40
		)
	);
</script>

{#if effectiveUrl}
	<img
		class="club-logo-mark-img {className}"
		src={effectiveUrl}
		{alt}
		width={dim}
		height={dim}
		decoding="async"
		loading="lazy"
	/>
{:else}
	<span
		class="club-logo-mark-fallback {className}"
		style:width="{dim}px"
		style:height="{dim}px"
		style:--club-mark-d="{dim}px"
		role="img"
		aria-label="Club mark"
	>
		<i class="ph ph-bird club-logo-mark-fallback__icon" aria-hidden="true"></i>
	</span>
{/if}

<style>
	.club-logo-mark-img {
		object-fit: contain;
		border-radius: 12px;
		flex-shrink: 0;
		box-shadow:
			0 4px 14px color-mix(in srgb, var(--brand-primary, #0f172a) 18%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.club-logo-mark-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 14px;
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--brand-primary, #0f172a) 12%, rgba(255, 255, 255, 0.92)) 0%,
			color-mix(in srgb, var(--brand-accent, #10b981) 10%, rgba(248, 250, 252, 0.95)) 100%
		);
		border: 1px solid color-mix(in srgb, var(--brand-primary, #0f172a) 22%, transparent);
		box-shadow:
			0 6px 18px rgba(15, 23, 42, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.65);
	}

	.club-logo-mark-fallback__icon {
		font-size: calc(var(--club-mark-d, 40px) * 0.46);
		color: var(--brand-primary, var(--aggie-blue));
		filter: drop-shadow(
			0 1px 3px color-mix(in srgb, var(--brand-primary, var(--aggie-blue)) 25%, transparent)
		);
	}
</style>
