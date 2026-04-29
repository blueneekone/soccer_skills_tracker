<script>
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { renderOperativeAvatarSvg, parseOperativeAvatar } from '$lib/avatars/operativeAvatar.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/**
	 * Parsed `users.operativeAvatar` (`{ v, seed }`) or `null` if unset / invalid.
	 * Omit to read from `authStore.userProfile` (signed-in player).
	 *
	 * @type {{ v: number; seed: string } | null | undefined}
	 */
	let {
		config: configProp = undefined,
		size = 96,
		class: className = '',
		/** When there is no config, show CTA to open the armory (player dashboard). */
		showInitializeCta = false,
	} = $props();

	const resolvedConfig = $derived.by(() => {
		if (configProp !== undefined) return configProp;
		return parseOperativeAvatar(authStore.userProfile?.operativeAvatar);
	});

	let svgMarkup = $state('');

	$effect(() => {
		if (!browser) {
			svgMarkup = '';
			return;
		}
		const cfg = resolvedConfig;
		if (!cfg) {
			svgMarkup = '';
			return;
		}
		svgMarkup = renderOperativeAvatarSvg(cfg.seed, size);
	});
</script>

<div
	class={`operative-avatar-preview tw-relative tw-shrink-0 tw-overflow-hidden ${className}`}
	style={`width:${size}px;height:${size}px`}
	aria-hidden={resolvedConfig ? 'true' : undefined}
>
	{#if resolvedConfig}
		{#if svgMarkup}
			<!-- DiceBear-generated SVG (deterministic from seed). -->
			{@html svgMarkup}
		{/if}
	{:else}
		<div
			class={`oap-ghost tw-relative tw-flex tw-h-full tw-w-full tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-white/10 tw-bg-slate-900/60 tw-backdrop-blur-md tw-shadow-[inset_0_0_40px_rgba(34,211,238,0.06),0_12px_40px_rgba(0,0,0,0.45)] ${showInitializeCta ? 'tw-pb-11 sm:tw-pb-12' : ''}`}
			role="img"
			aria-label="Operative not initialized"
		>
			<div class="oap-ghost-glow tw-pointer-events-none tw-absolute tw-inset-0 tw-rounded-full" aria-hidden="true"></div>
			<!-- Generic human silhouette (Lucide User–style), centered -->
			<svg
				class="oap-silhouette tw-relative tw-z-[1] tw-block tw-text-cyan-200/90"
				width={Math.round(size * 0.42)}
				height={Math.round(size * 0.48)}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
			{#if showInitializeCta}
				<a
					href={resolve('/player/armory')}
					class="oap-init-cta tw-absolute tw-bottom-2 tw-left-1/2 tw-z-[2] tw-inline-flex tw--translate-x-1/2 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-cyan-400/45 tw-bg-gradient-to-b tw-from-cyan-500/30 tw-to-cyan-950/40 tw-px-2.5 tw-py-1.5 tw-text-[0.48rem] tw-font-black tw-uppercase tw-tracking-[0.14em] tw-text-cyan-50 tw-no-underline tw-shadow-[0_0_22px_rgba(34,211,238,0.45)] tw-transition tw-duration-200 hover:tw-border-cyan-300/70 hover:tw-shadow-[0_0_32px_rgba(34,211,238,0.55)] sm:tw-bottom-3 sm:tw-px-3 sm:tw-text-[0.52rem] sm:tw-tracking-[0.16em]"
					data-sveltekit-preload-data="hover"
				>
					[ INITIALIZE OPERATIVE ]
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.operative-avatar-preview :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 9999px;
	}

	.oap-ghost-glow {
		background: radial-gradient(
			ellipse at 50% 38%,
			rgba(34, 211, 238, 0.22) 0%,
			rgba(168, 85, 247, 0.08) 45%,
			transparent 72%
		);
	}

	.oap-silhouette {
		filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.55));
	}
</style>
