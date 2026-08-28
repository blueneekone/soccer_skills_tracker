<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-py-24">
	<div class="tw-flex tw-flex-col tw-items-center tw-text-center tw-mb-16">
		<span class="tw-font-mono tw-text-xs tw-text-[#ff007f] tw-tracking-widest tw-mb-4" style="font-family: 'Geist Mono', monospace;">SYS.ECOSYSTEM</span>
		<h2 class="tw-text-4xl tw-font-bold tw-text-[#FAFAFA] tw-tracking-tight" style="font-family: 'Geist Sans', sans-serif;">The Training Triangle</h2>
		<p class="tw-text-[#D4D4D8] tw-mt-4 tw-max-w-2xl" style="font-family: 'Switzer', sans-serif;">A unified ecosystem powering athletes, coaches, and parents.</p>
	</div>

	<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-4 md:tw-gap-6">
		<!-- Player OS -->
		<div class="tw-col-span-1 md:tw-col-span-4 tw-h-full">
			<div class="tw-w-full tw-h-full tw-border tw-border-[#334155] tw-p-8 tw-flex tw-flex-col tw-relative group"
				style="background-color: #0f172a; clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);">
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-6">
					<Icon name="game.rocket" size={28} strokeWidth={1} style="color: #daff0a;" />
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase" style="color: #daff0a; font-family: 'Geist Mono', monospace;">SYS.PLAYER</span>
				</div>
				<h3 class="tw-text-xl tw-font-bold tw-mb-3" style="font-family: 'Geist Sans', sans-serif; color: #daff0a;">Player OS</h3>
				<p class="tw-text-[#D4D4D8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1" style="font-family: 'Switzer', sans-serif;">
					Gamified tracking HUD, Vanguard Prism radars, and skill trees engineered to drive athlete engagement.
				</p>
			</div>
		</div>

		<!-- Coach OS -->
		<div class="tw-col-span-1 md:tw-col-span-4 tw-h-full">
			<div class="tw-w-full tw-h-full tw-border tw-border-[#334155] tw-p-8 tw-flex tw-flex-col tw-relative"
				style="background-color: #0f172a; border-radius: 0px; border-left: 3px solid #14b8a6;">
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-6">
					<Icon name="user.settings" size={28} strokeWidth={1} style="color: #14b8a6;" />
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase" style="color: #14b8a6; font-family: 'Geist Mono', monospace;">SYS.COACH</span>
				</div>
				<h3 class="tw-text-xl tw-font-bold tw-text-[#FAFAFA] tw-mb-3" style="font-family: 'Geist Mono', monospace; color: #14b8a6;">Coach OS</h3>
				<p class="tw-text-[#D4D4D8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1" style="font-family: 'Switzer', sans-serif;">
					The tactical sideline SIEM for real-time squad telemetry, drill mapping, and commanding every victory.
				</p>
			</div>
		</div>

		<!-- Parent OS -->
		<div class="tw-col-span-1 md:tw-col-span-4 tw-h-full">
			<div class="tw-w-full tw-h-full tw-border tw-border-[#334155] tw-p-8 tw-flex tw-flex-col tw-relative"
				style="background-color: #0f172a; border-radius: 24px;">
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-6">
					<Icon name="status.shield-check" size={28} strokeWidth={1} style="color: #ff007f;" />
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase" style="color: #ff007f; font-family: 'Geist Mono', monospace;">SYS.PARENT</span>
				</div>
				<h3 class="tw-text-xl tw-font-bold tw-mb-3" style="font-family: 'Geist Sans', sans-serif; color: #ff007f;">Parent OS</h3>
				<p class="tw-text-[#D4D4D8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1" style="font-family: 'Switzer', sans-serif;">
					The Compliance Vault. COPPA 2.0 WebAuthn biometric gating, SafeSport routing, and the Car Ride Home emotional safety protocol.
				</p>
			</div>
		</div>
	</div>
</section>
