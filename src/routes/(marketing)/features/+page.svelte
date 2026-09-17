<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import Modal from '$lib/components/Modal.svelte';

	let isModalOpen = $state(false);
	let currentVideo = $state('');
	let currentTitle = $state('');

	function openVideo(src: string, title: string) {
		currentVideo = src;
		currentTitle = title;
		isModalOpen = true;
	}
</script>

<svelte:head>
	<title>Features — SSTracker</title>
	<meta
		name="description"
		content="Player, Parent, Coach, and Director workspaces plus compliance architecture — the development OS for youth clubs."
	/>
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#000000]">
	
	<!-- Header -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#f59e0b]">PERSONA SURFACES</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight" style="font-family: 'Geist Sans', sans-serif;">
			What SSTracker ships today.
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed" style="font-family: 'Switzer', sans-serif;">
			Four workspaces and a compliance moat — aligned with Wave 4 launch parity. No fantasy modules; each section maps to live routes on our production infrastructure.
		</p>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="st-bento tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-6">
			
			<!-- Player OS (Dopamine Engine) - Spans 8 Cols -->
			<div id="development" class="md:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-8 hover:tw-border-[#f59e0b] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"game.rocket" as IconName} size={28} class="tw-text-[#f59e0b]" />
					<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Player OS: The Dopamine Engine</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8" style="font-family: 'Switzer', sans-serif;">
					Player HQ surfaces missions, telemetry, and adaptive homework. Drive intrinsic motivation with the dark-mode HUD, Gamified Skill Trees, and strict XP progression.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-video tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
					<!-- Media Container -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10 tw-bg-[#0f172a]/40 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300 tw-cursor-pointer" onclick={() => openVideo('/videos/player-os-demo.webm', 'PLAYER OS')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideo('/videos/player-os-demo.webm', 'PLAYER OS'); } }} tabindex="0" role="button" aria-label="Play video">
						<button class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-all tw-duration-300 group-hover:tw-text-[#fbbf24] tw-shadow-[0_0_20px_rgba(251,191,36,0.3)] tw-transform tw-scale-90 group-hover:tw-scale-100" aria-hidden="true" tabindex="-1">
							<Icon name={"media.play" as IconName} size={32} />
						</button>
					</div>
					<video src="/videos/player-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
				</div>
			</div>

			<!-- Coach OS (Sideline SIEM) - Spans 4 Cols -->
			<div id="logistics" class="md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-8 hover:tw-border-[#f59e0b] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"user.settings" as IconName} size={28} class="tw-text-[#f59e0b]" />
					<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Coach OS: Sideline SIEM</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8" style="font-family: 'Switzer', sans-serif;">
					Orchestrate your tactical vision. Leverage the RAG AI Tactical Assistant and Intent Engine to draft session plans instantly.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-square tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
					<!-- Media Container -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10 tw-bg-[#0f172a]/40 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300 tw-cursor-pointer" onclick={() => openVideo('/videos/coach-os-demo.webm', 'COACH OS')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideo('/videos/coach-os-demo.webm', 'COACH OS'); } }} tabindex="0" role="button" aria-label="Play video">
						<button class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-all tw-duration-300 group-hover:tw-text-[#f59e0b] tw-shadow-[0_0_20px_rgba(245,158,11,0.3)] tw-transform tw-scale-90 group-hover:tw-scale-100" aria-hidden="true" tabindex="-1">
							<Icon name={"media.play" as IconName} size={32} />
						</button>
					</div>
					<video src="/videos/coach-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
				</div>
			</div>

			<!-- Parent OS (Co-Op Trust Center) - Spans 4 Cols -->
			<div id="household" class="md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-8 hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"security.lock" as IconName} size={28} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Parent OS: Co-Op Trust Center</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8" style="font-family: 'Switzer', sans-serif;">
					Ensure complete emotional safety. The Car Ride Home embargo locks match metrics for 15 minutes post-game. Verified guardians receive Tremendous bounty payouts for squad-level commitments.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-square tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
					<!-- Media Container -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10 tw-bg-[#0f172a]/40 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300 tw-cursor-pointer" onclick={() => openVideo('/videos/parent-os-demo.webm', 'PARENT OS')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideo('/videos/parent-os-demo.webm', 'PARENT OS'); } }} tabindex="0" role="button" aria-label="Play video">
						<button class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-all tw-duration-300 group-hover:tw-text-[#14b8a6] tw-shadow-[0_0_20px_rgba(20,184,166,0.3)] tw-transform tw-scale-90 group-hover:tw-scale-100" aria-hidden="true" tabindex="-1">
							<Icon name={"media.play" as IconName} size={32} />
						</button>
					</div>
					<video src="/videos/parent-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
				</div>
			</div>

			<!-- Director OS (God Mode) - Spans 8 Cols -->
			<div id="director-ops" class="md:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-8 hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"sys.server" as IconName} size={28} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Director OS: God Mode</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8" style="font-family: 'Switzer', sans-serif;">
					Complete administrative panopticon. Director surfaces cover deployment calendar, eligibility matrix, coach clearance (Checkr embed), and Stripe Financial Telemetry. Maintain club compliance health at a glance.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-video tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
					<!-- Media Container -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10 tw-bg-[#0f172a]/40 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300 tw-cursor-pointer" onclick={() => openVideo('/videos/director-os-demo.webm', 'DIRECTOR OS')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideo('/videos/director-os-demo.webm', 'DIRECTOR OS'); } }} tabindex="0" role="button" aria-label="Play video">
						<button class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-all tw-duration-300 group-hover:tw-text-[#14b8a6] tw-shadow-[0_0_20px_rgba(20,184,166,0.3)] tw-transform tw-scale-90 group-hover:tw-scale-100" aria-hidden="true" tabindex="-1">
							<Icon name={"media.play" as IconName} size={32} />
						</button>
					</div>
					<video src="/videos/director-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
				</div>
			</div>

		</div>

		<!-- Footer CTA -->
		<div class="tw-mt-24 tw-text-center">
			<h2 class="tw-text-3xl tw-font-bold tw-mb-8" style="font-family: 'Geist Sans', sans-serif;">Ready to secure your club's future?</h2>
			<div class="tw-flex tw-items-center tw-justify-center tw-gap-6 tw-flex-wrap">
				<a href="/pricing" class="tw-bg-[#f59e0b] tw-text-[#000000] hover:tw-bg-[#f59e0b]/90 tw-px-8 tw-py-4 tw-rounded-sm tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2 tw-shadow-[0_0_20px_rgba(251,191,36,0.25)]">
					View Commercial Pricing
					<Icon name={"nav.arrow-right" as IconName} size={16} />
				</a>
				<a href="/acquisition" class="tw-font-mono tw-text-xs tw-text-[#94a3b8] hover:tw-text-[#f8fafc] tw-font-bold tw-tracking-widest tw-uppercase tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2">
					Read Acquisition Brief
					<Icon name={"nav.arrow-right" as IconName} size={14} />
				</a>
			</div>
		</div>
	</section>

</div>

<Modal bind:open={isModalOpen} maxWidth="1200px">
	{#snippet titleSlot()}
		<div class="tw-font-mono tw-font-bold tw-text-lg tw-text-white tw-tracking-widest">
			SSTRACKER DEMO: {currentTitle}
		</div>
	{/snippet}
	<div class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-overflow-hidden tw-shadow-[0_0_30px_rgba(20,184,166,0.15)] tw-p-1">
		{#if currentVideo}
			<video
				class="tw-w-full tw-h-auto tw-rounded-lg tw-bg-[#000000]"
				src={currentVideo}
				controls
				playsinline
				autoplay
			>
				<track kind="captions" />
			</video>
		{/if}
	</div>
</Modal>
