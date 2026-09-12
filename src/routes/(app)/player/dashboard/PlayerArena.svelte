<script lang="ts">
	import type { PlayerDashboardEngine } from './PlayerDashboardEngine.svelte.js';
	import OperativeHub from '$lib/components/player/dashboard/OperativeHub.svelte';
	import IdentityBentoModule from '$lib/components/player/dashboard/IdentityBentoModule.svelte';
	import PlayerActivityStreak from '$lib/components/shell/PlayerActivityStreak.svelte';
	import ActiveBounties from '$lib/components/player/dashboard/ActiveBounties.svelte';
	import AdaptiveHomework from './AdaptiveHomework.svelte';
	import OperativeQuickOps from '$lib/components/player/dashboard/OperativeQuickOps.svelte';
	import OperativePathwayPreview from '$lib/components/player/dashboard/OperativePathwayPreview.svelte';
	import VanguardProtocolPanel from '$lib/components/player/dashboard/VanguardProtocolPanel.svelte';
	import CarRideHome from '$lib/components/compliance/CarRideHome.svelte';
	import MemoryCapsuleArena from '$lib/components/player/trajectory/MemoryCapsuleArena.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';

	let { engine }: { engine: PlayerDashboardEngine } = $props();
</script>

<div class="player-arena-wrapper tw-w-full">
	<OperativeHub>
		{#snippet identity()}
			<IdentityBentoModule
				embedded={true}
				hideDisplayName={true}
				uid={engine.uid}
				operativeAvatar={engine.operativeAvatarForHud}
				operativeLoadout={engine.activePlayer?.operativeLoadout as any}
				ownedCosmetics={Array.isArray(engine.activePlayer?.ownedCosmetics)
					? (engine.activePlayer.ownedCosmetics as string[]).filter((id) => typeof id === 'string')
					: []}
				displayName={engine.callsign}
				clubName={engine.clubDisplayName}
				teamLabel={engine.teamAssignmentLabel}
				rankName={engine.rankProgress.rank}
				level={engine.osLevel}
				totalXp={engine.totalXpHud}
				currentStreak={engine.streak}
				longestStreak={engine.longestStreak}
				xpInTier={engine.rankProgress.xpInCurrentTier}
				xpToNextRank={engine.rankProgress.xpToNextRank}
				nextRank={engine.rankProgress.nextRank}
				rankProgressPercent={engine.rankProgress.progressPercent}
				atMaxRank={engine.rankProgress.atMaxRank}
				lastTrainingUtc={engine.lastTrainingUtc}
				profileIncomplete={!engine.hasArmoryProfile}
				cardMetadata={engine.hqCardMetadata}
				onProfileSetup={() => (engine.showInitModal = true)}
			/>
		{/snippet}
		{#snippet metrics()}
			<PlayerActivityStreak armory={engine.armory} />
			{#if !engine.telemetryReady}
				<p class="hmp-vectors-collapsed hmp-vectors-collapsed--premium" role="status">
					AWAITING TELEMETRY · LOG A SESSION TO UNLOCK VECTORS
				</p>
			{/if}
		{/snippet}
		{#snippet quests()}
			<ActiveBounties
				embedded
				lastTrainingUtc={engine.lastTrainingUtc}
				onCoachBountyCount={(count) => (engine.coachBountyCount = count)}
				onHeroQuestId={(id) => (engine.heroQuestId = id)}
			/>
		{/snippet}
	</OperativeHub>

	<AdaptiveHomework />

	<OperativeQuickOps />

	<OperativePathwayPreview level={engine.osLevel} />

	<section
		class="bento-span-12 player-analytics-void pd-os-deck pd-os-deck--recessed tw-relative tw-z-30 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col"
		class:player-analytics-void--compact={!engine.telemetryReady}
		aria-label="Player analytics deck"
		data-region="player-analytics-void"
	>
		<header class="pd-hq-section-head player-analytics-void__head">
			<h2 class="pd-hq-section-head__title player-analytics-void__title">Vanguard telemetry</h2>
			<p class="pd-hq-section-head__eyebrow pd-label player-analytics-void__eyebrow">Performance</p>
		</header>
		{#if authStore.isConsented}
			<div class="tw-relative tw-min-w-0">
				{#if engine.isEmbargoed && !engine.attestationSigned}
					<CarRideHome
						matchData={engine.matchData}
						isEmbargoed={engine.isEmbargoed}
						attestationSigned={engine.attestationSigned}
						countdown={engine.countdown}
						signAttestation={() => engine.signAttestation()}
					/>
				{:else}
					<div class="vanguard-prism-svg prism-chart tw-w-full">
						<VanguardProtocolPanel
							prismValues={engine.attrRadarValues}
							bind:selectedAxis={engine.selectedVanguardAxis}
							compact={!engine.telemetryReady}
							hideHeadTitle={true}
						/>
					</div>
					<div class="tw-mt-4 tw-flex tw-justify-center">
						<button class="tw-bg-[#fbbf24] cta-gold tw-text-black tw-font-bold tw-px-6 tw-py-2 tw-rounded-none">
							LAUNCH MISSION
						</button>
					</div>
				{/if}
			</div>
			<footer class="player-capsules-strip player-capsules-strip--void" aria-labelledby="lobby-capsules-h">
				{#if vanguardFlags.capsulesEnabled && engine.trajectoryEngine.activeCapsule}
					<header class="pd-hq-section-head player-capsules-strip__head">
						<h2 id="lobby-capsules-h" class="pd-hq-section-head__title player-capsules-strip__title">
							Time-lapse memory capsules
						</h2>
						<p class="pd-hq-section-head__eyebrow pd-label player-capsules-strip__eyebrow">Self comparison</p>
					</header>
					<MemoryCapsuleArena
						dossierMode={true}
						capsule={engine.trajectoryEngine.activeCapsule}
						baselineDaysAgo={engine.trajectoryEngine.baselineDaysAgo}
						capsuleHeadline={engine.trajectoryEngine.capsuleHeadline}
					/>
				{:else}
					<header class="pd-hq-section-head player-capsules-strip__head">
						<h2 id="lobby-capsules-h" class="pd-hq-section-head__title player-capsules-strip__title">
							Memory capsules
						</h2>
						<p class="pd-hq-section-head__eyebrow pd-label player-capsules-strip__eyebrow">Self comparison</p>
					</header>
					<div class="lobby-capsule-ghost-wrap">
						<div
							class="pd-empty-state pd-empty-state--compact lobby-capsule-ghost-card"
							role="status"
							aria-labelledby="lobby-capsules-h"
						>
							<div class="tw-drop-shadow-[0_0_12px_rgba(20,184,166,0.18)]" aria-hidden="true">
								<div class="pd-empty-state__icon"></div>
							</div>
							<div class="pd-empty-state__copy">
								<p class="pd-empty-state__title">Ghost profile</p>
								<p class="pd-empty-state__lede">Awaiting first memory capsule</p>
							</div>
						</div>
					</div>
				{/if}
			</footer>
		{:else}
			<div class="tw-p-6 tw-text-center tw-bg-slate-900/50 tw-border tw-border-slate-800 tw-rounded-lg tw-m-4">
				<p class="tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-[#fbbf24]">
					Telemetry blocked: Verifiable Parental Consent (VPC) Required
				</p>
			</div>
		{/if}
	</section>

	<section class="player-hud-grid bento-span-12 tw-gap-4 tw-mt-6" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
		<div data-chamfer="true" class="chamfered-card hud-biometrics-card pd-panel tw-min-w-0 tw-bg-slate-900/50 tw-p-4 tw-border tw-border-slate-800" style="clip-path: polygon(16px 0px, 100% 0px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0px 100%, 0px 16px);">
			<h3 class="tw-font-mono tw-text-xs tw-text-teal-400 tw-mb-2 tw-uppercase tw-tracking-widest">Biometrics</h3>
			<div class="tw-text-slate-300 tw-text-sm tw-min-w-0">Cardiac Module Offline</div>
		</div>

		<div data-chamfer="true" class="chamfered-card hud-tactical-map pd-panel tw-min-w-0 tw-bg-slate-900/50 tw-p-4 tw-border tw-border-slate-800" style="clip-path: polygon(16px 0px, 100% 0px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0px 100%, 0px 16px);">
			<h3 class="tw-font-mono tw-text-xs tw-text-teal-400 tw-mb-2 tw-uppercase tw-tracking-widest">Tactical</h3>
			<div class="tw-text-slate-300 tw-text-sm tw-min-w-0">Live Play Map</div>
		</div>

		<div data-chamfer="true" class="chamfered-card hud-equipment-schematic pd-panel tw-min-w-0 tw-bg-slate-900/50 tw-p-4 tw-border tw-border-slate-800" style="clip-path: polygon(16px 0px, 100% 0px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0px 100%, 0px 16px);">
			<h3 class="tw-font-mono tw-text-xs tw-text-teal-400 tw-mb-2 tw-uppercase tw-tracking-widest">Armory</h3>
			<div class="tw-text-slate-300 tw-text-sm tw-min-w-0">Equipment Durability Schematic</div>
		</div>

		<div data-chamfer="true" class="chamfered-card hud-avatar-station pd-panel tw-min-w-0 tw-bg-slate-900/50 tw-p-4 tw-border tw-border-slate-800" style="clip-path: polygon(16px 0px, 100% 0px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0px 100%, 0px 16px);">
			<h3 class="tw-font-mono tw-text-xs tw-text-teal-400 tw-mb-2 tw-uppercase tw-tracking-widest">Identity</h3>
			<div class="tw-text-slate-300 tw-text-sm tw-min-w-0">Avatar Customization Station</div>
		</div>
	</section>
</div>
