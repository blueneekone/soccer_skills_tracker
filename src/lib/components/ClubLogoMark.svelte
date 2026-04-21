<script>
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import { clubSportIconClass } from '$lib/utils/sport-icon.js';

	/**
	 * @typedef {'sm' | 'md' | 'lg' | 'xl'} LogoSize
	 */

	let {
		size = 'md',
		alt = 'Club logo',
		/** When set (e.g. recruiter cards, public landing), overrides global club branding. */
		logoUrl: logoUrlOverride = '',
		/** When set, overrides `clubs/{clubId}.sport` for the default icon. */
		sport: sportOverride = '',
		class: className = ''
	} = $props();

	const effectiveUrl = $derived(
		typeof logoUrlOverride === 'string' && logoUrlOverride.trim() ?
			logoUrlOverride.trim() :
			clubBrandingStore.logoUrl
	);

	const effectiveSport = $derived(
		typeof sportOverride === 'string' && sportOverride.trim() ?
			sportOverride.trim() :
			clubBrandingStore.sport
	);

	const iconClass = $derived(clubSportIconClass(effectiveSport));

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
		aria-label={alt}
	>
		<i class="{iconClass} club-logo-mark-fallback__icon" aria-hidden="true"></i>
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
		border-radius: 50%;
		background: #fafafa;
		border: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.06),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	:global(html.dark) .club-logo-mark-fallback {
		background: #fafafa;
		border-color: rgba(255, 255, 255, 0.14);
	}

	.club-logo-mark-fallback__icon {
		font-size: calc(var(--club-mark-d, 40px) * 0.42);
		color: #09090b;
		line-height: 1;
	}
</style>
