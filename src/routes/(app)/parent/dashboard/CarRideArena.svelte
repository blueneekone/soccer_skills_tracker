<script lang="ts">
	import type { CarRideEngine } from './CarRideEngine.svelte.js';

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
			class="tw-rounded-xl tw-border tw-border-[#00f0ff]/15 tw-bg-[#040f16]/80 tw-backdrop-blur-sm tw-p-5 tw-flex tw-flex-col tw-gap-4"
		>
			<!-- Header -->
			<div class="tw-flex tw-items-center tw-justify-between">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase">
					// MATCH RESULT
				</span>
				<span
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-px-2 tw-py-0.5 tw-rounded tw-border {score.outcome === 'W' ? 'tw-text-[#00f0ff] tw-border-[#00f0ff]/40 tw-bg-[#00f0ff]/10' : score.outcome === 'L' ? 'tw-text-[#ff0055] tw-border-[#ff0055]/40 tw-bg-[#ff0055]/10' : 'tw-text-[#a0a0a0] tw-border-[#a0a0a0]/30 tw-bg-[#a0a0a0]/10'}"
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
				<div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
					<div class="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-[#ff0055] tw-animate-pulse"></div>
					<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ff0055]/70 tw-uppercase">
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
			class="tw-rounded-xl tw-border tw-border-[#00f0ff]/25 tw-bg-[#00f0ff]/5 tw-px-5 tw-py-3 tw-flex tw-items-center tw-gap-3"
		>
			<span class="tw-text-[#00f0ff] tw-text-[14px]">✓</span>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/80 tw-uppercase">
				EQ ATTESTATION CONFIRMED — FULL METRICS UNLOCKED
			</span>
		</div>

		<!-- Player stats table -->
		{#if Object.keys(metrics.playerStats).length > 0}
			<div class="tw-rounded-xl tw-border tw-border-[#ffffff]/8 tw-bg-[#040f16]/80 tw-backdrop-blur-sm tw-overflow-hidden">
				<div class="tw-px-5 tw-py-3 tw-border-b tw-border-[#ffffff]/5">
					<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase">
						// PLAYER PERFORMANCE
					</span>
				</div>

				<div class="tw-overflow-x-auto">
					<table class="tw-w-full">
						<thead>
							<tr class="tw-border-b tw-border-[#ffffff]/5">
								<th class="tw-px-4 tw-py-2 tw-text-left tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a0a0a0]/50 tw-uppercase">PLAYER</th>
								<th class="tw-px-3 tw-py-2 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a0a0a0]/50 tw-uppercase">MIN</th>
								<th class="tw-px-3 tw-py-2 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a0a0a0]/50 tw-uppercase">G</th>
								<th class="tw-px-3 tw-py-2 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a0a0a0]/50 tw-uppercase">A</th>
								<th class="tw-px-3 tw-py-2 tw-text-center tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#a0a0a0]/50 tw-uppercase">RTG</th>
							</tr>
						</thead>
						<tbody>
							{#each Object.entries(metrics.playerStats) as [email, stat]}
								<tr class="tw-border-b tw-border-[#ffffff]/4 last:tw-border-b-0 hover:tw-bg-[#00f0ff]/3 tw-transition-colors tw-duration-150">
									<td class="tw-px-4 tw-py-2.5 tw-font-mono tw-text-[10px] tw-text-[#e0e0e0] tw-max-w-[140px] tw-truncate">{email}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[11px] tw-text-[#a0a0a0]">{fmt(stat.minutesPlayed)}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[11px] tw-text-[#00f0ff]">{fmt(stat.goals)}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center tw-font-mono tw-text-[11px] tw-text-[#a78bfa]">{fmt(stat.assists)}</td>
									<td class="tw-px-3 tw-py-2.5 tw-text-center">
										{#if stat.rating !== undefined && stat.rating !== null}
											<span
												class="tw-font-mono tw-text-[11px] tw-font-bold {stat.rating >= 8 ? 'tw-text-[#00f0ff]' : stat.rating >= 6 ? 'tw-text-[#a0a0a0]' : 'tw-text-[#ff6b6b]'}"
											>
												{stat.rating}/10
											</span>
										{:else}
											<span class="tw-font-mono tw-text-[11px] tw-text-[#a0a0a0]/40">—</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Coach notes -->
		{#if metrics.coachNotes && metrics.coachNotes.trim().length > 0}
			<div class="tw-rounded-xl tw-border tw-border-[#ffffff]/8 tw-bg-[#040f16]/80 tw-backdrop-blur-sm tw-p-5 tw-flex tw-flex-col tw-gap-3">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase">
					// COACH NOTES
				</span>
				<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-[#c0c0c0] tw-whitespace-pre-wrap">
					{metrics.coachNotes}
				</p>
			</div>
		{/if}

		<!-- Highlights -->
		{#if metrics.highlights && metrics.highlights.trim().length > 0}
			<div class="tw-rounded-xl tw-border tw-border-[#ffffff]/8 tw-bg-[#040f16]/80 tw-backdrop-blur-sm tw-p-5 tw-flex tw-flex-col tw-gap-3">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase">
					// HIGHLIGHTS
				</span>
				<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-[#c0c0c0]">
					{metrics.highlights}
				</p>
			</div>
		{/if}
	{/if}

	<!-- ── Error state ────────────────────────────────────────────────────── -->
	{#if engine.error}
		<div
			class="tw-rounded-xl tw-border tw-border-[#ff6b6b]/30 tw-bg-[#ff6b6b]/5 tw-p-4 tw-font-mono tw-text-[10px] tw-text-[#ff6b6b] tw-tracking-wide"
		>
			{engine.error}
		</div>
	{/if}
</div>
