<script lang="ts">
	import type { CarRideEngine } from './CarRideEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: CarRideEngine } = $props();

	/** Format a stat value for display — null/undefined renders as '—'. */
	function fmt(val: number | undefined | null): string {
		if (val === undefined || val === null) return '—';
		return String(val);
	}
</script>

<!--
	CarRideArena.svelte — Phase 4, Epic 8 (Glass Layer)
	The pure presentation layer for The Car Ride Home Protocol.
	Never imports Firestore or auth directly — all state comes from the Engine.
-->

<div class="tw-relative tw-w-full tw-flex tw-flex-col tw-gap-6">

	<!-- ── Score panel (always visible) ──────────────────────────────────── -->
	{#if engine.publicScore}
		{@const score = engine.publicScore}
		<div
			class="tw-rounded-none tw-border tw-border-[#1E293B] tw-bg-[#0B0F19] tw-p-5 tw-flex tw-flex-col tw-gap-4"
		>
			<!-- Header -->
			<div class="tw-flex tw-items-center tw-justify-between">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-amber-500 tw-uppercase tw-flex tw-items-center tw-gap-1.5">
					<Icon name={"data.activity" as IconName} size={12} class="tw-text-amber-500" />
					<span>// MATCH RESULT TELEMETRY</span>
				</span>
				<span
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-px-2.5 tw-py-1 tw-rounded-none tw-border {score.outcome === 'W' ? 'tw-text-amber-500 tw-border-amber-500/40 tw-bg-amber-500/10' : score.outcome === 'L' ? 'tw-text-[#ff0055] tw-border-[#ff0055]/40 tw-bg-[#ff0055]/10' : 'tw-text-[#a0a0a0] tw-border-[#a0a0a0]/30 tw-bg-[#a0a0a0]/10'}"
				>
					{score.outcome === 'W' ? 'VICTORY' : score.outcome === 'L' ? 'DEFEAT' : 'DRAW'}
				</span>
			</div>

			<!-- Score display -->
			<div class="tw-flex tw-items-center tw-justify-center tw-gap-6 tw-py-3">
				<span class="tw-font-mono tw-text-[48px] tw-font-bold tw-text-white tw-leading-none tw-tabular-nums">
					{score.scoreHome}
				</span>
				<span class="tw-font-mono tw-text-[20px] tw-text-[#a0a0a0]/40">—</span>
				<span class="tw-font-mono tw-text-[48px] tw-font-bold tw-text-[#a0a0a0]/60 tw-leading-none tw-tabular-nums">
					{score.scoreAway}
				</span>
			</div>

			<!-- EQ interceptor label (metrics locked badge) -->
			{#if !engine.attested}
				<div class="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-1.5 tw-bg-[#ff0055]/10 tw-border tw-border-[#ff0055]/30">
					<Icon name={"status.warning" as IconName} size={14} class="tw-text-amber-500 tw-animate-pulse" />
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-amber-500 tw-uppercase tw-font-bold">
						PLAYER METRICS LOCKED — EQ ATTESTATION REQUIRED
					</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── Locked metrics grid (visible ONLY after attestation) ───────────── -->
	{#if engine.attested && engine.lockedMetrics}
		{@const metrics = engine.lockedMetrics}

		<!-- Unlock confirmation banner -->
		<div
			class="tw-rounded-none tw-border tw-border-amber-500/40 tw-bg-amber-500/10 tw-px-5 tw-py-3 tw-flex tw-items-center tw-gap-3"
		>
			<Icon name={"status.check" as IconName} size={16} class="tw-text-amber-500" />
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-amber-500 tw-uppercase tw-font-bold">
				EQ ATTESTATION CONFIRMED — FULL METRICS UNLOCKED
			</span>
		</div>

		<!-- Player stats table -->
		{#if Object.keys(metrics.playerStats).length > 0}
			<div class="tw-rounded-none tw-border tw-border-[#1E293B] tw-bg-[#0B0F19] tw-overflow-hidden">
				<div class="tw-px-5 tw-py-3 tw-border-b tw-border-[#1E293B] tw-flex tw-items-center tw-gap-2">
					<Icon name={"data.chart-bar" as IconName} size={14} class="tw-text-[#14b8a6]" />
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
						// PLAYER PERFORMANCE
					</span>
				</div>

				<div class="tw-overflow-x-auto">
					<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-4 tw-min-w-0 tw-overflow-x-auto"><table class="tw-w-full tw-font-mono tw-text-sm" class="tw-w-full">
						<thead>
							<tr class="tw-border-b tw-border-[#1E293B]">
								<th class="tw-px-4 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">PLAYER</th>
								<th class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">MIN</th>
								<th class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">G</th>
								<th class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">A</th>
								<th class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">RTG</th>
							</tr>
						</thead>
						<tbody>
							{#each Object.entries(metrics.playerStats) as [email, stat]}
								<tr class="tw-border-b tw-border-[#1E293B]/50 last:tw-border-b-0 hover:tw-bg-[#14b8a6]/5 tw-transition-colors tw-duration-150">
									<td class="tw-px-4 tw-py-2.5 tw-font-mono tw-text-[10px] tw-text-slate-200 tw-max-w-[140px] tw-truncate">{email}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[11px] tw-text-slate-300">{fmt(stat.minutesPlayed)}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[11px] tw-text-amber-500 tw-font-bold">{fmt(stat.goals)}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[11px] tw-text-[#14b8a6]">{fmt(stat.assists)}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center">
										{#if stat.rating !== undefined && stat.rating !== null}
											<span
												class="tw-font-mono tw-text-[11px] tw-font-bold {stat.rating >= 8 ? 'tw-text-amber-500' : stat.rating >= 6 ? 'tw-text-[#14b8a6]' : 'tw-text-[#ff6b6b]'}"
											>
												{stat.rating}/10
											</span>
										{:else}
											<span class="tw-font-mono tw-text-[11px] tw-text-slate-500">—</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table></div>
				</div>
			</div>
		{/if}

		<!-- Coach notes -->
		{#if metrics.coachNotes && metrics.coachNotes.trim().length > 0}
			<div class="tw-rounded-none tw-border tw-border-[#1E293B] tw-bg-[#0B0F19] tw-p-5 tw-flex tw-flex-col tw-gap-3">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-amber-500 tw-uppercase tw-flex tw-items-center tw-gap-1.5">
					<Icon name={"comm.chat" as IconName} size={14} />
					<span>// COACH NOTES</span>
				</span>
				<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-slate-300 tw-whitespace-pre-wrap">
					{metrics.coachNotes}
				</p>
			</div>
		{/if}

		<!-- Highlights -->
		{#if metrics.highlights && metrics.highlights.trim().length > 0}
			<div class="tw-rounded-none tw-border tw-border-[#1E293B] tw-bg-[#0B0F19] tw-p-5 tw-flex tw-flex-col tw-gap-3">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase tw-flex tw-items-center tw-gap-1.5">
					<Icon name={"game.sparkles" as IconName} size={14} />
					<span>// HIGHLIGHTS</span>
				</span>
				<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-slate-300">
					{metrics.highlights}
				</p>
			</div>
		{/if}
	{/if}

	<!-- ── Error state ────────────────────────────────────────────────────── -->
	{#if engine.error}
		<div
			class="tw-rounded-none tw-border tw-border-red-500/40 tw-bg-red-950/30 tw-p-4 tw-font-mono tw-text-[10px] tw-text-red-300 tw-tracking-wide tw-flex tw-items-center tw-gap-2"
		>
			<Icon name={"status.error" as IconName} size={14} class="tw-text-red-400" />
			<span>{engine.error}</span>
		</div>
	{/if}
</div>
