<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';


</script>

<svelte:head>
	<title>About Us — SSTracker</title>
	<meta name="description" content="Discover the team and technology behind SSTracker, the ultimate operating system for elite youth clubs." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#000000]">
	<!-- Header -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#14b8a6]">SYS.ABOUT_US</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			Forging the Future of Elite Development.
		</h1>
	</header>

	<!-- The Problem vs Solution Bento Grid -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-mb-24">
		<div class="tw-flex tw-flex-col tw-items-center tw-text-center tw-mb-12">
			<span class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-tracking-widest tw-mb-4">THE PARADIGM SHIFT</span>
			<h2 class="tw-text-4xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight">Escaping the Frankenstein Stack</h2>
			<p class="tw-text-[#94a3b8] tw-mt-4 tw-max-w-2xl">
				The legacy youth sports industry is fractured. Clubs are forced to stitch together 6 different apps just to operate. We built a unified Nexus.
			</p>
		</div>

		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-6">
			<!-- The Problem: The Frankenstein Stack (4 cols) -->
			<div class="tw-col-span-1 md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#ef4444]/30 tw-p-8 tw-relative tw-overflow-hidden">
				<div class="tw-absolute tw-inset-0 tw-opacity-[0.03] tw-pointer-events-none" style="background: repeating-linear-gradient(45deg, transparent, transparent 10px, #ef4444 10px, #ef4444 20px);"></div>

				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-6">
					<Icon name={"status.x-circle" as IconName} size={24} class="tw-text-[#ef4444]" />
					<h3 class="tw-font-mono tw-text-sm tw-font-bold tw-tracking-widest tw-text-[#ef4444] tw-uppercase">The Frankenstein Stack</h3>
				</div>

				<ul class="tw-flex tw-flex-col tw-gap-4 tw-text-sm tw-text-[#cbd5e1] tw-font-mono">
					<li class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-2">
						<span>Scheduling</span>
						<span class="tw-text-[#64748b]">App A</span>
					</li>
					<li class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-2">
						<span>Billing</span>
						<span class="tw-text-[#64748b]">App B</span>
					</li>
					<li class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-2">
						<span>Comms</span>
						<span class="tw-text-[#64748b]">App C</span>
					</li>
					<li class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-2">
						<span>Evaluation</span>
						<span class="tw-text-[#64748b]">App D</span>
					</li>
					<li class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-2">
						<span>Waivers</span>
						<span class="tw-text-[#64748b]">Paper/App E</span>
					</li>
					<li class="tw-flex tw-items-center tw-justify-between tw-pt-2 tw-text-[#ef4444] tw-font-bold">
						<span>Total Cost/Mo</span>
						<span>$500+ & Chaos</span>
					</li>
				</ul>
			</div>

			<!-- The Solution: SSTracker Ecosystem (8 cols) -->
			<div class="tw-col-span-1 md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#14b8a6]/50 tw-p-8 tw-relative tw-flex tw-flex-col">
				<div class="tw-absolute tw-top-0 tw-right-0 tw-w-16 tw-h-16 tw-border-t-2 tw-border-r-2 tw-border-[#14b8a6] tw-opacity-50"></div>

				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-6">
					<Icon name={"status.shield-check" as IconName} size={28} class="tw-text-[#14b8a6]" />
					<h3 class="tw-font-mono tw-text-lg tw-font-bold tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">SSTracker Unified Ecosystem</h3>
				</div>

				<p class="tw-text-[#94a3b8] tw-text-base tw-leading-relaxed tw-mb-8">
					We collapsed the entire youth sports operational stack into a single, cohesive operating system. Built on military-grade architecture, enforcing Vanguard Zero-Trust compliance, and designed with a brutalist focus on athlete development.
				</p>

				<div class="tw-grid tw-grid-cols-2 md:tw-grid-cols-3 tw-gap-4 tw-mt-auto">
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-2">
						<Icon name={"user.settings" as IconName} size={20} class="tw-text-[#14b8a6]" />
						<span class="tw-font-mono tw-text-xs tw-text-[#f8fafc]">Director OS</span>
					</div>
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-2">
						<Icon name={"game.rocket" as IconName} size={20} class="tw-text-[#14b8a6]" />
						<span class="tw-font-mono tw-text-xs tw-text-[#f8fafc]">Player HUD</span>
					</div>
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-2">
						<Icon name={"status.pulse" as IconName} size={20} class="tw-text-[#14b8a6]" />
						<span class="tw-font-mono tw-text-xs tw-text-[#f8fafc]">Sideline SIEM</span>
					</div>
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-2">
						<Icon name={"action.document" as IconName} size={20} class="tw-text-[#14b8a6]" />
						<span class="tw-font-mono tw-text-xs tw-text-[#f8fafc]">Compliance Vault</span>
					</div>
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-2">
						<Icon name={"game.star" as IconName} size={20} class="tw-text-[#14b8a6]" />
						<span class="tw-font-mono tw-text-xs tw-text-[#f8fafc]">Parent Co-op</span>
					</div>
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-2">
						<Icon name={"nav.search" as IconName} size={20} class="tw-text-[#14b8a6]" />
						<span class="tw-font-mono tw-text-xs tw-text-[#f8fafc]">Global Talent Index</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Founder Profile -->
	<section class="tw-max-w-5xl tw-mx-auto tw-w-full tw-px-6 tw-mb-24">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-8 md:tw-p-12 tw-flex tw-flex-col md:tw-flex-row tw-gap-12 tw-items-center md:tw-items-start">

			<!-- MANDATE: Styled placeholder slot for headshot -->
			<div class="tw-shrink-0 tw-w-48 tw-h-48 tw-rounded-sm tw-bg-[#0B0F19] tw-border-2 tw-border-dashed tw-border-[#334155] tw-flex tw-flex-col tw-items-center tw-justify-center tw-relative tw-group">
				<!-- Future implementation will replace this block with the actual img tag -->
				<Icon name={"user.profile" as IconName} size={48} class="tw-text-[#475569] tw-mb-2 group-hover:tw-text-[#14b8a6] tw-transition-colors tw-duration-300" />
				<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-uppercase tw-tracking-widest">Awaiting Upload</span>
				<div class="tw-absolute -tw-bottom-3 tw-bg-[#0f172a] tw-px-2 tw-border tw-border-[#334155] tw-font-mono tw-text-[9px] tw-text-[#14b8a6] tw-tracking-widest">HEADSHOT.SLOT</div>
			</div>

			<div class="tw-flex-1 tw-text-center md:tw-text-left">
				<h3 class="tw-text-3xl tw-font-bold tw-text-[#f8fafc] tw-mb-1">Evan Waechtler</h3>
				<span class="tw-font-mono tw-text-sm tw-text-[#14b8a6] tw-tracking-widest tw-uppercase tw-block tw-mb-6">Chief Executive Officer</span>

				<p class="tw-text-[#94a3b8] tw-text-base tw-leading-relaxed tw-mb-4">
					"We built SSTracker because the current state of youth sports technology is unacceptable. Coaches are drowning in administrative chaos, parents are disconnected from their child's actual development, and athletes are losing the intrinsic motivation that makes sports beautiful."
				</p>
				<p class="tw-text-[#94a3b8] tw-text-base tw-leading-relaxed">
					"Our mission is to arm elite academies with a platform that doesn't just manage schedules, but actively engineers dopamine-driven development while enforcing strict, uncompromising compliance. We are building the infrastructure for the next generation of champions."
				</p>

				<div class="tw-mt-8 tw-flex tw-items-center tw-justify-center md:tw-justify-start tw-gap-4">
					<a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="tw-font-mono tw-text-xs tw-text-[#64748b] hover:tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2">
						<Icon name={"nav.link" as IconName} size={14} /> Connect
					</a>
				</div>
			</div>

		</div>
	</section>

</div>