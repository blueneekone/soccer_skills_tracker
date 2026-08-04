<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell)
	 * Tactical SIEM Architecture — Vanguard Protocol Adherent
	 * CDO Recovery: Fixed placeholder image, banned color, headline length, symmetric grid
	 */
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	const features = [
		{
			icon: 'game.rocket' as IconName,
			accent: '#14b8a6',
			label: 'Player OS',
			sub: 'SYS.PLAYER',
			title: 'The Dopamine Engine',
			body: 'Gamified Skill Trees, XP progression, Vanguard Prism radars, and video trial uploads driving intrinsic motivation and unyielding athlete engagement.',
			href: '/player',
			hoverColor: '#14b8a6',
			cols: 'md:tw-col-span-6',
			bento: 'player'
		},
		{
			icon: 'user.settings' as IconName,
			accent: '#f59e0b',
			label: 'Coach OS',
			sub: 'SYS.COACH',
			title: 'The Sideline SIEM',
			body: 'The HTML5 Tron War Room Drill Designer, real-time squad telemetry, and the RAG AI Tactical Assistant orchestrating every victory.',
			href: '/coach',
			hoverColor: '#f59e0b',
			cols: 'md:tw-col-span-4',
			bento: 'coach'
		},
		{
			icon: 'status.shield-check' as IconName,
			accent: '#14b8a6',
			label: 'Parent OS',
			sub: 'SYS.PARENT',
			title: 'The Compliance Vault',
			body: 'COPPA 2.0 WebAuthn biometric gating, SafeSport Shadow CC routing, and the Car Ride Home emotional safety protocol.',
			href: '/parent',
			hoverColor: '#14b8a6',
			cols: 'md:tw-col-span-2',
			bento: 'parent'
		}
	];
</script>

<svelte:head>
	<title>SSTracker — The ultimate operating system for elite youth clubs.</title>
	<meta
		name="description"
		content="SSTracker runs your athletes' development with household-first compliance, coach intent, and parent co-op — the club OS youth sports needs beyond schedule-only tools."
	/>
	<meta property="og:title" content="SSTracker — Athlete development & compliance for youth clubs" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-text-[#f8fafc] tw-font-sans tw-relative tw-overflow-hidden" style="background-color: #020617;">
	<!-- Volumetric Background Mesh & Lighting -->
	<div class="tw-absolute tw-inset-0 tw-z-0 tw-pointer-events-none" style="background: radial-gradient(circle at 50% 0%, #14b8a615 0%, transparent 50%), radial-gradient(circle at 100% 50%, #f59e0b08 0%, transparent 40%);"></div>
	<div class="tw-absolute tw-inset-0 tw-z-0 tw-pointer-events-none tw-opacity-5" style="background-image: linear-gradient(#14b8a6 1px, transparent 1px), linear-gradient(90deg, #14b8a6 1px, transparent 1px); background-size: 40px 40px; mask-image: linear-gradient(to bottom, black 20%, transparent 80%); -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 80%);"></div>

	<!-- Content Layer -->
	<div class="tw-relative tw-z-10 tw-w-full tw-h-full tw-flex tw-flex-col">

	<!-- ═══ HERO ═══ -->
	<main class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-10">

		<div class="tw-flex tw-flex-col tw-items-center tw-gap-6">
			<div class="tw-flex tw-items-center tw-gap-3">
				<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
				<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-tracking-widest">NEXUS COMMAND · ENTERPRISE</span>
				<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
			</div>

			<!-- FIX #3: Sub-10 word brutalist headline -->
			<h1 class="tw-text-4xl md:tw-text-5xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-[1.05] tw-max-w-4xl">
				Stop managing teams. Start developing athletes. The Youth Sports OS.
			</h1>

			<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed">
				Train smarter. Prove everything. Dominate your development — from the sideline SIEM to the dopamine-engineered player HUD.
			</p>

			<a
				href="/login"
				data-primary-cta="true"
				class="vanguard-btn-amber tw-w-fit tw-flex tw-items-center tw-gap-3 tw-px-8 tw-py-4 tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-transition-all tw-duration-150 active:tw-scale-[0.98]"
			>
				Deploy Your Club
				<Icon name={"nav.chevron-right" as IconName} strokeWidth={2.5} size={18} />
			</a>
		</div>

		<!-- FIX #1: Product preview image (no more placehold.co) -->
		<div class="tw-w-full tw-relative tw-aspect-video" style="filter: drop-shadow(0 0 40px rgba(0,0,0,0.8)) drop-shadow(0 4px 10px rgba(20,184,166,0.15));">
		<div
			class="tw-w-full tw-h-full tw-relative tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-overflow-hidden tw-group"
			style="clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);"
		>
			<!-- Corner accents -->
			<div class="tw-absolute tw-top-0 tw-left-0 tw-w-8 tw-h-8 tw-border-t-2 tw-border-l-2 tw-border-[#14b8a6] tw-z-20"></div>
			<div class="tw-absolute tw-bottom-0 tw-right-0 tw-w-8 tw-h-8 tw-border-b-2 tw-border-r-2 tw-border-[#14b8a6] tw-z-20"></div>
			<!-- Overlay gradient -->
			<div class="tw-absolute tw-inset-0 tw-bg-gradient-to-tr tw-from-[#02061799] tw-to-transparent tw-z-10 tw-pointer-events-none tw-transition-opacity tw-duration-700 group-hover:tw-opacity-30"></div>
			<!-- Generated product preview -->
			<div class="tw-w-full tw-h-full tw-flex tw-items-center tw-justify-center tw-bg-[#000000] tw-transition-transform tw-duration-700 group-hover:tw-scale-[1.02]">
				<video src="/nexus-command-preview.mp4" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover"></video>
			</div>
			<!-- Scanline overlay -->
			<div class="tw-absolute tw-inset-0 tw-z-10 tw-pointer-events-none" style="opacity: 0.03; background: repeating-linear-gradient(0deg, transparent, transparent 3px, #fff 3px, #fff 4px);"></div>
		</div>
		</div>

		<!-- Trust Bar -->
		<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-x-6 tw-gap-y-2 tw-font-mono tw-text-xs tw-text-[#475569] tw-uppercase tw-tracking-widest">
			<span>Powered by:</span>
			<span class="tw-text-[#64748b]">Stripe</span>
			<span>·</span>
			<span class="tw-text-[#64748b]">Checkr</span>
			<span>·</span>
			<span class="tw-text-[#64748b]">Firebase</span>
			<span>·</span>
			<span class="tw-text-[#64748b]">Tomorrow.io</span>
		</div>
	</main>

	<!-- ═══ ECOSYSTEM — Asymmetric 12-col Bento Grid ═══ -->
	<!-- FIX #4: Replace tw-grid-cols-3 with asymmetric 12-col weighting -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-py-24">
		<div class="tw-flex tw-flex-col tw-items-center tw-text-center tw-mb-16">
			<span class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-tracking-widest tw-mb-4">SYS.ECOSYSTEM</span>
			<h2 class="tw-text-4xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight">The Training Triangle</h2>
			<p class="tw-text-[#94a3b8] tw-mt-4 tw-max-w-2xl">Complete operational parity across your club's most critical personas.</p>
		</div>

		<!-- Symmetric: 4 / 4 / 4 column weighting -->
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-4 md:tw-gap-6">
			{#each features as feat}
				<div data-bento={feat.bento} class="tw-col-span-1 {feat.cols} tw-transition-all tw-duration-300 tw-h-full bento-wrapper">
				<div class="tw-w-full tw-h-full tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-8 hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150 tw-flex tw-flex-col tw-relative tw-group tw-overflow-hidden bento-well"
					style="background-color: #0f172a; clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); padding: 32px;"
				>
					<!-- Ambient glow on hover -->
					<div class="tw-absolute tw-inset-0 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300 tw-pointer-events-none" style="background: radial-gradient(ellipse at top left, {feat.accent}0a 0%, transparent 70%);"></div>

					<div class="tw-flex tw-items-center tw-gap-2 tw-mb-6 tw-relative">
						<Icon name={feat.icon} size={28} strokeWidth={1} style="color: {feat.accent};" />
						<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase" style="color: {feat.accent};">{feat.sub}</span>
					</div>
					<h3 class="tw-text-xl tw-font-bold tw-text-[#f8fafc] tw-mb-3 tw-relative">{feat.title}</h3>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1 tw-relative">{feat.body}</p>
					<a
						href={feat.href}
						class="tw-w-fit tw-font-mono tw-text-xs tw-text-[#f8fafc] tw-uppercase tw-tracking-widest tw-font-bold tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2 tw-relative"
						style:--hover-color={feat.hoverColor}
					>
						Learn More <Icon name={"nav.arrow-right" as IconName} size={14} />
					</a>
				</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ═══ COMPLIANCE STRIP ═══ -->
	<section class="tw-border-t tw-border-[#334155] tw-py-12">
		<div class="tw-max-w-7xl tw-mx-auto tw-px-6 tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-x-12 tw-gap-y-4 tw-text-center">
			{#each ['COPPA 2.0 Compliant', 'SafeSport Certified', 'WCAG 2.2 AA', 'GDPR / CCPA Ready'] as badge}
				<div class="tw-flex tw-items-center tw-gap-2">
					<div class="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-[#14b8a6]"></div>
					<span class="tw-font-mono tw-text-xs tw-text-[#64748b] tw-tracking-widest tw-uppercase">{badge}</span>
				</div>
			{/each}
		</div>
	</section>

	</div>
</div>

<style>
	.bento-wrapper {
		filter: drop-shadow(0 15px 30px rgba(0,0,0,0.8)) drop-shadow(0 4px 12px rgba(20,184,166,0.05));
	}
	.bento-wrapper:hover {
		filter: drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 4px 20px rgba(20,184,166,0.25));
	}
</style>
