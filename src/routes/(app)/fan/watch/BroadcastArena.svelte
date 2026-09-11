<script lang="ts">
	import type { BroadcastEngine } from './BroadcastEngine.svelte.js';

	let { engine }: { engine: BroadcastEngine } = $props();
	let votingSubmitting = $state(false);
	let voteStatusMsg = $state<string | null>(null);

	async function castVote(candidateId: string) {
		if (votingSubmitting || !engine.isVotingOpen) return;
		votingSubmitting = true;
		voteStatusMsg = null;
		try {
			const ok = await engine.submitVote(candidateId);
			voteStatusMsg = ok ? 'Vote recorded in real-time batch!' : 'Vote submission failed.';
		} finally {
			votingSubmitting = false;
		}
	}
</script>

<div class="fan-broadcast-arena tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
	<!-- Main Live Stream / Video Frame (8 cols) -->
	<section class="lg:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-4 tw-flex tw-flex-col tw-gap-4">
		<div class="tw-relative tw-w-full tw-aspect-video tw-bg-black tw-rounded-xl tw-overflow-hidden tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-800">
			<!-- Video Frame Placeholder / Live WebRTC feed -->
			<div class="tw-text-center tw-p-6">
				<div class="tw-inline-flex tw-items-center tw-justify-center tw-w-16 tw-h-16 tw-rounded-full tw-bg-slate-900/80 tw-border tw-border-[#14b8a6] tw-mb-4">
					<svg class="tw-w-8 tw-h-8 tw-text-[#14b8a6] tw-translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				</div>
				<h2 class="tw-font-mono tw-text-sm tw-font-bold tw-tracking-wider tw-text-[#fafafa] tw-uppercase">SIDELINE BROADCAST FEED</h2>
				<p class="tw-text-xs tw-text-[#94a3b8] tw-mt-1">High-Definition SafeSport Certified Broadcast Relay</p>
			</div>
			<div class="tw-absolute tw-bottom-3 tw-left-3 tw-flex tw-items-center tw-gap-2 tw-bg-black/60 tw-backdrop-blur-sm tw-px-3 tw-py-1 tw-rounded-md tw-border tw-border-slate-700/50">
				<span class="tw-inline-block tw-w-2 tw-h-2 tw-rounded-full tw-bg-red-500"></span>
				<span class="tw-font-mono tw-text-[11px] tw-text-slate-200">1080p 60FPS</span>
			</div>
		</div>

		<!-- Match Banner Details -->
		<div class="tw-flex tw-items-center tw-justify-between tw-px-2">
			<div>
				<h1 class="tw-text-lg tw-font-bold tw-text-[#fafafa]">Championship Match Day Telemetry</h1>
				<p class="tw-text-xs tw-text-[#94a3b8]">Live broadcast stream with protected minor telemetry</p>
			</div>
		</div>
	</section>

	<!-- Side Interactive Panel: MVP Voting & Candidates (4 cols) -->
	<aside class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-4">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-gap-4">
			<div class="tw-flex tw-items-center tw-justify-between">
				<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-wider tw-text-[#14b8a6] tw-uppercase">FAN MVP VOTING</h3>
				<span class="tw-text-[10px] tw-font-mono tw-text-slate-400">COPPA 2.0 SHIELDED</span>
			</div>

			{#if voteStatusMsg}
				<div class="tw-text-xs tw-font-mono tw-text-emerald-400 tw-bg-emerald-500/10 tw-border tw-border-emerald-500/20 tw-p-2 tw-rounded">
					{voteStatusMsg}
				</div>
			{/if}

			<div class="tw-flex tw-flex-col tw-gap-2.5 tw-max-h-[380px] tw-overflow-y-auto">
				{#each engine.candidates as candidate (candidate.id)}
					<div class="tw-flex tw-items-center tw-justify-between tw-bg-slate-900/60 tw-border tw-border-[#334155]/60 tw-rounded-xl tw-p-3 hover:tw-border-[#14b8a6]/40 tw-transition-colors">
						<div class="tw-flex tw-flex-col">
							<span class="tw-text-sm tw-font-medium tw-text-[#fafafa]">{candidate.name}</span>
							<span class="tw-font-mono tw-text-[11px] tw-text-[#14b8a6]">
								Votes: {engine.results[candidate.id] || 0}
							</span>
						</div>

						<button
							type="button"
							class="tw-px-3 tw-py-1.5 tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-slate-950 tw-font-bold tw-text-xs tw-rounded-lg tw-transition-colors disabled:tw-opacity-50"
							disabled={!engine.isVotingOpen || votingSubmitting}
							onclick={() => castVote(candidate.id)}
						>
							VOTE
						</button>
					</div>
				{:else}
					<div class="tw-text-center tw-py-8 tw-text-xs tw-text-slate-500 tw-font-mono">
						No active candidate nominations for this session.
					</div>
				{/each}
			</div>
		</div>
	</aside>
</div>
