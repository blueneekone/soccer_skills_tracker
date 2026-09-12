<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import HUDContainer from '$lib/components/hud/HUDContainer.svelte';
	import '$lib/styles/player-dashboard-hud.css';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import { PlayerDashboardEngine } from './PlayerDashboardEngine.svelte.js';
	import PlayerArena from './PlayerArena.svelte';
	import PlayerHUD from './PlayerHUD.svelte';

	const engine = new PlayerDashboardEngine();
	engine.subscribe();
</script>

<svelte:head>
	<title>Player Dashboard · SSTRACKER</title>
</svelte:head>

{#if authStore.isLoading}
	<div
		class="player-dossier-root tw-flex tw-h-64 tw-min-h-[40vh] tw-w-full tw-items-center tw-justify-center tw-py-16 player-os-root"
		style="background: var(--pd-bg, #000); color: var(--pd-text-muted, #A1A1AA);"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<Icon name="status.loading" class="tw-animate-spin tw-text-4xl tw-text-[color:var(--pd-text-muted)]" />
		<span class="tw-sr-only">Loading player dashboard</span>
	</div>
{:else if !engine.activePlayer}
	<div
		class="tw-mx-auto tw-flex tw-min-h-[40vh] tw-max-w-lg tw-flex-col tw-items-center tw-justify-center bento-gap-md tw-rounded-xl tw-border tw-border-amber-500/25 tw-bg-slate-950/90 tw-px-6 tw-py-14 tw-text-center tw-text-slate-200"
		role="alert"
	>
		<Icon name="status.warning-circle" class="tw-text-4xl tw-text-amber-400" />
		<p class="tw-m-0 tw-text-base tw-font-semibold tw-text-slate-100">
			Unable to load this operative profile. Try refreshing the page.
		</p>
		{#if impersonationStore.active}
			<p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Impersonation is active for
				<span class="tw-font-mono tw-text-slate-400">
					{impersonationStore.targetEmail || impersonationStore.targetUid}
				</span>. If this keeps happening, exit impersonation from the banner and try again.
			</p>
		{/if}
	</div>
{:else}
<div
	class="lobby-page player-hud-root pd-page-root pd-grain tw-relative tw-isolate tw-min-w-0 tw-overflow-x-hidden tw-text-slate-50"
	style="background: var(--pd-bg, #000);"
	data-region="player-lobby"
	data-dopamine={vanguardFlags.dopamineEnabled ? 'on' : 'off'}
>
	<div class="pd-content-wrap">
		<HUDContainer ariaLabel="Player operations HUD">
			<PlayerHUD {engine} />
			<PlayerArena {engine} />
		</HUDContainer>
	</div>
</div>

<!-- Sprint 9.2: Initialize Operative — distinct one-time setup modal -->
{#if engine.showInitModal}
<div
	class="init-modal-scrim tw-fixed tw-inset-0 tw-z-[500] tw-flex tw-items-center tw-justify-center tw-p-4"
	style="background: var(--surface-modal-scrim, rgba(0,0,0,0.75)); backdrop-filter: blur(4px);"
	role="presentation"
	onclick={(e) => { if (e.target === e.currentTarget) engine.showInitModal = false; }}
>
	<div
		class="init-modal pd-panel tw-relative tw-w-full tw-max-w-md tw-p-6 tw-shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="init-modal-h"
	>
		<button
			type="button"
			class="init-modal__close tw-absolute tw-right-3 tw-top-3 tw-flex tw-min-h-[44px] tw-min-w-[44px] tw-items-center tw-justify-center tw-rounded-lg"
			onclick={() => (engine.showInitModal = false)}
			aria-label="Close"
		>
			<Icon name="sys.close" size={14} />
		</button>

		<div class="init-modal__head bento-mb-md tw-pb-3">
			<p class="pd-eyebrow tw-m-0">
				One-time setup · SOAR
			</p>
			<h2
				id="init-modal-h"
				class="pd-strap__title tw-m-0 tw-mt-1.5 tw-text-lg"
			>
				Finish your profile
			</h2>
		</div>

		<p class="init-modal__body tw-m-0 tw-text-sm tw-leading-relaxed">
			Your player profile is not complete yet. Set your avatar, position, and sport in the Armory
			to unlock the full Player OS.
		</p>

		<ul class="init-modal__steps bento-mt-md tw-list-none tw-m-0 tw-p-0 tw-space-y-1.5">
			{#each ['Choose your player avatar', 'Set your position and sport', 'Review your gear unlocks'] as step, i}
				<li class="init-modal__step tw-flex tw-min-w-0 tw-items-center tw-gap-2.5 tw-font-mono tw-text-[0.6rem] tw-font-semibold tw-uppercase tw-tracking-[0.12em]">
					<span class="init-modal__step-num tw-flex tw-h-4 tw-w-4 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-sm tw-text-[0.5rem] tw-font-black">{i + 1}</span>
					{step}
				</li>
			{/each}
		</ul>

		<div class="bento-mt-lg tw-flex tw-flex-wrap tw-items-center tw-gap-3">
			<a
				href="/player/armory?tab=studio"
				class="init-modal__cta init-modal__cta--primary tw-inline-flex tw-min-h-[44px] tw-w-fit tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-no-underline tw-transition-all tw-duration-150 active:tw-scale-[0.98]"
				data-sveltekit-preload-data="hover"
				onclick={() => (engine.showInitModal = false)}
			>
				<Icon name="status.shield-check" size={13} />
				Open Identity Studio
			</a>
			<button
				type="button"
				class="init-modal__cta init-modal__cta--secondary tw-inline-flex tw-min-h-[44px] tw-w-fit tw-items-center tw-justify-center tw-px-4 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-transition-all tw-duration-150 active:tw-scale-[0.98]"
				onclick={() => (engine.showInitModal = false)}
			>
				Later
			</button>
		</div>
	</div>
</div>
{/if}

{/if}

<style>
	.lobby-page {
		color: var(--vanguard-text-1, #f8fafc);
	}

	/* Lifted dossier panels — void-first gradient (6j closure J-06) */
	:global(.player-dossier-root .bento-card), .bento-card {
		overflow: hidden;
		min-width: 0;
		background: var(--pd-depth-panel-gradient, var(--pd-panel, #05050a));
		border-color: var(--pd-line, rgba(255, 255, 255, 0.1));
		box-shadow: var(--shadow-liquid);
	}
</style>
