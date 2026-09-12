<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import { WORKOUT_FOCUS_AREAS } from '$lib/player/workout/focusDrillCatalog.js';
	import type { ParentWorkoutEngine } from './ParentWorkoutEngine.svelte';
	import ParentWorkoutHUD from './ParentWorkoutHUD.svelte';

	let { engine }: { engine: ParentWorkoutEngine } = $props();

	const TELEMETRY_INTEL = {
		title: 'GUARDIAN TELEMETRY',
		instructions: [
			"1. Select the Operative (household player) who performed the work.",
			'2. Set focus, sub-drill, duration, and RPE to match the session.',
			'3. Log training — XP follows the same engine as the Player OS and updates their profile and stats.',
		],
	};

	let durGaugeEl = $state<HTMLDivElement | null>(null);
	let rpeGaugeEl = $state<HTMLDivElement | null>(null);
	let xpTrackEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (durGaugeEl) durGaugeEl.style.setProperty('--gauge', `${((Math.max(1, Math.min(1440, engine.duration)) - 1) / 1439) * 100}%`);
	});
	$effect(() => {
		if (rpeGaugeEl) rpeGaugeEl.style.setProperty('--gauge', `${((Math.max(1, Math.min(10, engine.intensity)) - 1) / 9) * 100}%`);
	});
	$effect(() => {
		if (xpTrackEl) xpTrackEl.style.setProperty('--fill', `${engine.xpLoadPct}%`);
	});
</script>

<div class="tw-bg-[#000000] tw-min-h-dvh tw-text-white tw-font-sans tw-overflow-y-auto tw-p-4 lg:tw-p-8">
	<div class="tw-max-w-5xl tw-mx-auto tw-space-y-6">
		<header class="tw-bg-[#0F172A] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4 tw-rounded-none">
			<div class="tw-flex tw-items-center tw-gap-4">
				<div class="tw-w-12 tw-h-12 tw-bg-black tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#14b8a6] tw-rounded-none">
					<Icon name="data.activity" size={24} />
				</div>
				<div>
					<h1 class="tw-text-xl tw-font-bold tw-uppercase tw-tracking-widest tw-m-0">Log Operative Workout</h1>
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs tw-mt-1">XP TELEMETRY · GUARDIAN OVERRIDE</p>
				</div>
			</div>
			<IntelModal {...TELEMETRY_INTEL} dossierMode={false} />
		</header>

		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-w-full">
			<!-- Profile Card -->
			<section class="lg:tw-col-span-4 tw-bg-[#0F172A] tw-border tw-border-[#334155] tw-p-6 tw-rounded-none tw-flex tw-flex-col tw-gap-6">
				<div>
					<label class="tw-text-[#a5b4fc] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-block tw-mb-2" for="operative-select">Operative</label>
					{#if engine.childrenLoading}
						<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs">Connecting to roster...</p>
					{:else if engine.children.length === 0}
						<p class="tw-text-red-400 tw-font-mono tw-text-xs">No operatives found in household.</p>
					{:else}
						<select id="operative-select" class="tw-w-full tw-bg-black tw-border tw-border-[#334155] tw-text-white tw-p-3 tw-font-mono tw-text-sm focus:tw-outline-none focus:tw-border-[#fbbf24] tw-rounded-none tw-transition-colors" bind:value={engine.selectedChildEmail} onchange={() => engine.handleChildChange()}>
							<option value="">— Select Operative —</option>
							{#each engine.children as c}
								<option value={c.email}>{c.playerName}</option>
							{/each}
						</select>
					{/if}
				</div>

				{#if engine.childProfileLoading}
					<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs">Syncing telemetry...</p>
				{:else if engine.childProfileError}
					<p class="tw-text-red-400 tw-font-mono tw-text-xs">{engine.childProfileError}</p>
				{:else if engine.selectedChildEmail && engine.childProfile}
					<div class="tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-rounded-none">
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-2">
							<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest">Rank</span>
							<span class="tw-text-white tw-font-bold tw-text-sm">Lvl {engine.level}</span>
						</div>
						<div class="tw-w-full tw-h-1.5 tw-bg-[#1E293B] tw-mb-4" bind:this={xpTrackEl}>
							<div class="tw-h-full tw-bg-[#fbbf24] tw-transition-all tw-duration-500" style="width: var(--fill, 0%);"></div>
						</div>
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-1">
							<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest">Total XP</span>
							<span class="tw-text-[#14b8a6] tw-font-mono tw-text-xs">{engine.childXp.toLocaleString()}</span>
						</div>
						<div class="tw-flex tw-justify-between tw-items-center">
							<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest">Active Streak</span>
							<span class="tw-text-[#f59e0b] tw-font-mono tw-text-xs">{engine.streak} Days</span>
						</div>
					</div>
				{/if}
			</section>

			<!-- Workout Form -->
			<section class="lg:tw-col-span-8 tw-bg-[#0F172A] tw-border tw-border-[#334155] tw-p-6 tw-rounded-none tw-flex tw-flex-col tw-gap-8">
				<div>
					<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-mb-3 tw-block">1 · Focus Area</span>
					<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-2">
						{#each WORKOUT_FOCUS_AREAS as focus}
							<button class="tw-flex tw-flex-col tw-items-center tw-p-3 tw-border tw-border-[#334155] tw-rounded-none tw-transition-colors {engine.selectedFocus === focus.id ? 'tw-bg-[#14b8a6]/10 tw-border-[#14b8a6]' : 'tw-bg-black hover:tw-border-[#94a3b8]'}" disabled={!engine.selectedChildEmail} onclick={() => { engine.selectedFocus = focus.id; engine.selectedDrill = null; engine.loadDrills(); }}>
								<span class="tw-font-mono tw-text-[10px] tw-mb-1 {engine.selectedFocus === focus.id ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{focus.op}</span>
								<span class="tw-text-xs tw-font-bold {engine.selectedFocus === focus.id ? 'tw-text-white' : 'tw-text-[#94a3b8]'}">{focus.label}</span>
							</button>
						{/each}
					</div>
				</div>

				<div>
					<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-mb-3 tw-block">2 · Sub-Drill (Catalog)</span>
					{#if engine.drillsLoading}
						<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs">Loading drill catalog...</p>
					{/if}
					<div class="tw-flex tw-flex-wrap tw-gap-2">
						{#each engine.availableDrills as drill}
							<button class="tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-border tw-rounded-none tw-transition-colors {engine.selectedDrill === drill ? 'tw-bg-[#fbbf24]/10 tw-border-[#fbbf24] tw-text-[#fbbf24]' : 'tw-bg-black tw-border-[#334155] tw-text-[#94a3b8] hover:tw-border-[#94a3b8]'}" disabled={!engine.selectedChildEmail} onclick={() => engine.selectedDrill = drill}>
								{drill}
							</button>
						{/each}
					</div>
				</div>

				<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-6">
					<div class="tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-rounded-none">
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-3">
							<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest">Time on task (min)</span>
							<span class="tw-text-[#14b8a6] tw-font-mono tw-text-sm tw-font-bold">{engine.duration}</span>
						</div>
						<div class="tw-w-full tw-h-1 tw-bg-[#1E293B] tw-mb-3" bind:this={durGaugeEl}>
							<div class="tw-h-full tw-bg-[#14b8a6]" style="width: var(--gauge, 0%);"></div>
						</div>
						<input type="range" min="1" max="1440" step="1" bind:value={engine.duration} class="tw-w-full tw-accent-[#14b8a6]" />
					</div>
					<div class="tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-rounded-none">
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-3">
							<span class="tw-text-[#a5b4fc] tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest">RPE (1-10)</span>
							<span class="tw-text-[#f59e0b] tw-font-mono tw-text-sm tw-font-bold">{engine.intensity} / 10</span>
						</div>
						<div class="tw-w-full tw-h-1 tw-bg-[#1E293B] tw-mb-3" bind:this={rpeGaugeEl}>
							<div class="tw-h-full tw-bg-[#f59e0b]" style="width: var(--gauge, 0%);"></div>
						</div>
						<input type="range" min="1" max="10" step="1" bind:value={engine.intensity} class="tw-w-full tw-accent-[#f59e0b]" />
					</div>
				</div>

				<ParentWorkoutHUD {engine} />

				<button class="tw-w-full tw-py-4 tw-px-6 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#f59e0b] hover:tw-shadow-[0_0_20px_rgba(251,191,36,0.4)] tw-transition-all tw-rounded-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" disabled={!engine.selectedChildEmail || !engine.selectedDrill || engine.logSubmitting || !engine.parentVerifiedAck || !engine.verifierLegalName.trim()} onclick={() => engine.submitWorkout()}>
					{#if engine.logSubmitting}
						<span>TRANSMITTING...</span>
					{:else}
						<Icon name="game.zap" size={18} />
						<span>LOG FOR OPERATIVE · +{engine.estimatedLogXp} XP</span>
					{/if}
				</button>
			</section>
		</div>
	</div>
</div>
