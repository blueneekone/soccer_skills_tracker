<script lang="ts">
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import { renderOperativeAvatarSvg } from '$lib/avatars/operativeAvatar.js';
	import { parseOperativePortrait } from '$lib/avatars/portraitV2Schema.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		config: configProp = undefined,
		operativeAvatar: operativeAvatarProp = undefined,
		size = 96,
		class: className = '',
		showInitializeCta = false,
		vpc_approved = true,
	}: {
		config?: { v: number; seed: string } | null;
		operativeAvatar?: unknown;
		size?: number;
		class?: string;
		showInitializeCta?: boolean;
		vpc_approved?: boolean;
	} = $props();

	const resolvedPortrait = $derived.by(() => {
		if (operativeAvatarProp !== undefined) {
			return parseOperativePortrait(operativeAvatarProp);
		}
		if (configProp !== undefined) {
			return parseOperativePortrait(configProp);
		}
		return parseOperativePortrait(authStore.userProfile?.operativeAvatar);
	});

	const svgMarkup = $derived.by(() => {
		if (resolvedPortrait) return renderOperativeAvatarSvg(resolvedPortrait, size);
		const uid = authStore.user?.uid;
		return renderOperativeAvatarSvg(uid || 'operative', size);
	});
</script>

<div
	class={`operative-avatar-preview tw-relative tw-aspect-square tw-h-full tw-w-full tw-shrink-0 tw-overflow-hidden tw-rounded-full ${className}`}
	style={size ? `max-width: ${size}px` : undefined}
	aria-hidden="true"
>
	{#if !vpc_approved}
		<!-- COPPA lock — parental consent required -->
		<div
			class="tw-relative tw-flex tw-h-full tw-w-full tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-red-500/30 tw-bg-slate-900/80 tw-backdrop-blur-md tw-shadow-[inset_0_0_40px_rgba(255,0,60,0.08),0_0_30px_rgba(255,0,60,0.15)]"
			role="img"
			aria-label="Avatar locked — parental consent required"
		>
			<div
				class="tw-pointer-events-none tw-absolute tw-inset-0 tw-rounded-full"
				style="background: radial-gradient(ellipse at 50% 38%, rgba(255,0,60,0.18) 0%, transparent 70%);"
				aria-hidden="true"
			></div>
			<Icon
				name="sys.lock-simple"
				size={Math.round(size * 0.38)}
				strokeWidth={1.75}
				class="tw-relative tw-z-[1] tw-block tw-text-red-400/80"
			/>
			<span
				class="tw-relative tw-z-[1] tw-mt-2 tw-text-center tw-font-mono tw-font-black tw-uppercase tw-tracking-wider tw-text-red-400/90"
				style="font-size: {Math.max(7, Math.round(size * 0.065))}px; line-height: 1.2;"
			>PARENTAL<br>CONSENT<br>REQUIRED</span>
		</div>
	{:else}
		{@html svgMarkup}
		{#if showInitializeCta && !resolvedPortrait}
			<a
				href={resolveAppPath('/player/armory')}
				class="oap-init-cta tw-absolute tw-bottom-2 tw-left-1/2 tw-z-[2] tw-inline-flex tw--translate-x-1/2 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-slate-700 tw-bg-slate-900/90 tw-px-2.5 tw-py-1.5 tw-font-mono tw-text-[0.48rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-200 tw-no-underline tw-backdrop-blur-sm tw-transition-colors tw-duration-150 hover:tw-border-slate-600 hover:tw-bg-slate-800 sm:tw-bottom-3 sm:tw-px-3 sm:tw-text-[0.52rem]"
				data-sveltekit-preload-data="hover"
			>
				Customize operative
			</a>
		{/if}
	{/if}
</div>

<style>
	.operative-avatar-preview :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		aspect-ratio: 1 / 1;
		object-fit: cover;
		border-radius: 9999px;
	}
</style>
