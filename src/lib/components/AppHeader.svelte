<script>
	import { goto } from '$app/navigation';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import { clubSportIconSuffix } from '$lib/utils/sport-icon.js';

	let { title = '' } = $props();

	const goHome = () =>
		goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });

	const displayName = $derived(
		authStore.userProfile?.playerName ||
			(authStore.role ? authStore.role.charAt(0).toUpperCase() + authStore.role.slice(1) : 'Player'),
	);

	const sportIcon = $derived(clubSportIconSuffix(clubBrandingStore.sport));
</script>

<!--
	Vanguard AppHeader — no hardcoded heights, mask-fade bottom, deep backdrop-blur on text overlay.
	The container fits the viewport via aspect-ratio + max-height; top corners are rounded-t-none
	so it docks flush with the page edge.
-->
<header class="vng-app-header tw-relative tw-z-30 tw-w-full tw-overflow-visible tw-rounded-t-none">
	<div class="vng-app-header__media" aria-hidden="true">
		<div class="vng-app-header__grid"></div>
		<div class="vng-app-header__glow vng-app-header__glow--a"></div>
		<div class="vng-app-header__glow vng-app-header__glow--b"></div>
	</div>

	<div
		class="tw-absolute tw-inset-x-3 tw-bottom-2 tw-z-20 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-2xl tw-border tw-border-[#00f0ff]/20 tw-bg-[#020202]/55 tw-px-4 tw-py-2.5 tw-backdrop-blur-md tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_18px_44px_rgba(0,0,0,0.5)] md:tw-inset-x-6"
	>
		<button
			class="tw-pointer-events-auto tw-flex tw-min-w-0 tw-shrink tw-items-center tw-gap-3 tw-border-0 tw-bg-transparent tw-p-0 tw-text-left tw-text-current tw-cursor-pointer"
			onclick={goHome}
			aria-label="Go to home"
		>
			{#if authStore.userProfile?.clubId}
				<ClubLogoMark size="md" />
			{:else}
				<i class="ph {sportIcon} tw-text-2xl tw-text-[#00f0ff] tw-drop-shadow-[0_0_8px_rgba(0,240,255,0.55)]" aria-hidden="true"></i>
			{/if}
			<div class="tw-min-w-0">
				<h3 class="tw-m-0 tw-font-mono tw-text-sm tw-font-black tw-uppercase tw-tracking-[0.16em] tw-text-white">
					{title.trim() || brandingStore.appName || 'SSTRACKER'}
				</h3>
				<p class="tw-m-0 tw-mt-0.5 tw-font-mono tw-text-[9px] tw-tracking-[0.22em] tw-text-[#00f0ff]/80 tw-uppercase">
					OPERATIVE · <span class="tw-text-slate-300">{displayName}</span>
				</p>
			</div>
		</button>

		<div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
			<button
				type="button"
				class="tw-pointer-events-auto tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-[#00f0ff]/25 tw-bg-[#020202]/70 tw-text-[#00f0ff] tw-backdrop-blur-md tw-transition-all hover:tw-border-[#00f0ff]/55 hover:tw-bg-[#00f0ff]/10 hover:tw-shadow-[0_0_18px_rgba(0,240,255,0.3)]"
				onclick={() => goto('/settings')}
				aria-label="Profile and settings"
			>
				<i class="ph ph-gear tw-text-base" aria-hidden="true"></i>
			</button>
			{#if authStore.role !== 'super_admin' && authStore.role !== 'global_admin'}
				<button
					type="button"
					class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-backdrop-blur-md tw-transition-all hover:tw-border-[#00f0ff]/75 hover:tw-bg-[#00f0ff]/10"
					onclick={() => goto('/support')}
				>
					<i class="ph ph-lifebuoy" aria-hidden="true"></i>
					<span>SUPPORT</span>
				</button>
			{/if}
			<button
				type="button"
				class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#ff003c]/40 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#ff003c] tw-backdrop-blur-md tw-transition-all hover:tw-border-[#ff003c]/75 hover:tw-bg-[#ff003c]/10"
				onclick={() => void handleSignOut()}
			>
				DISCONNECT
			</button>
		</div>
	</div>
</header>

<style>
	.vng-app-header {
		aspect-ratio: 32 / 5;
		min-height: 88px;
		max-height: 140px;
		mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
	}

	.vng-app-header__media {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background:
			radial-gradient(ellipse at 22% 30%, rgba(0, 240, 255, 0.22) 0%, transparent 55%),
			radial-gradient(ellipse at 78% 70%, rgba(168, 85, 247, 0.18) 0%, transparent 55%),
			linear-gradient(135deg, #020617 0%, #020202 60%, #050511 100%);
	}

	.vng-app-header__grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 240, 255, 0.08) 1px, transparent 1px);
		background-size: 28px 28px;
		mask-image: linear-gradient(to bottom, #000 0%, transparent 95%);
		-webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 95%);
	}

	.vng-app-header__glow {
		position: absolute;
		border-radius: 50%;
		filter: blur(36px);
		opacity: 0.7;
		pointer-events: none;
	}

	.vng-app-header__glow--a {
		top: -25%;
		left: 6%;
		width: 30%;
		height: 100%;
		background: radial-gradient(ellipse, rgba(0, 240, 255, 0.45), transparent 70%);
	}

	.vng-app-header__glow--b {
		bottom: -30%;
		right: 4%;
		width: 28%;
		height: 110%;
		background: radial-gradient(ellipse, rgba(168, 85, 247, 0.4), transparent 70%);
	}
</style>
