<script>
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, isOpen: boolean, onClose: () => void }} */
	let { model: engine, isOpen = false, onClose } = $props();

	/** @type {'squad' | 'drills'} */
	let activeTab = $state('squad');

	const INK_PALETTE = /** @type {const} */ (['#14b8a6', '#ef4444', '#d97706', '#ffffff', '#daff0a']);

	function getPlayerInitials(name) {
		if (!name) return '??';
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	const rosterList = $derived(
		Array.isArray(engine?.host?.wrBucketXi) && engine.host.wrBucketXi.length > 0
			? engine.host.wrBucketXi
			: [
					{ id: 'def_1', name: 'John Smith', position: 'CB' },
					{ id: 'def_2', name: 'Marcus Price', position: 'ST' },
					{ id: 'def_3', name: 'Alex Johnson', position: 'CDM' },
					{ id: 'def_4', name: 'David Lee', position: 'LWB' },
					{ id: 'def_5', name: 'Sam Taylor', position: 'GK' }
				]
	);
</script>

<div class="tw-pointer-events-none tw-fixed tw-inset-y-0 tw-left-0 tw-z-50 tw-w-96 tw-max-w-[90vw]" role="region" aria-label="Tactics Hub">
	<div
		class="tw-pointer-events-auto tw-flex tw-h-full tw-w-full tw-flex-col tw-border-r tw-border-[#334155] tw-bg-[#0a0a0a]/95 tw-font-mono tw-text-slate-200 tw-backdrop-blur-xl tw-shadow-[15px_0_30px_rgba(0,0,0,0.8)] tw-transition-transform tw-duration-300"
		style="transform: translateX({isOpen ? '0%' : '-100%'}); border-radius: 0px;"
		aria-hidden={!isOpen}
	>
		<!-- Header -->
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-bg-[#0f172a]/90 tw-px-4 tw-py-3">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-bg-[#daff0a]"></span>
				<h2 class="tw-m-0 tw-text-xs tw-font-bold tw-tracking-widest tw-text-slate-100 tw-uppercase">
					[ TACTICS HUB ]
				</h2>
			</div>
			<button
				type="button"
				class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-slate-700 tw-bg-[#0a0a0a] tw-text-slate-400 hover:tw-border-[#daff0a] hover:tw-text-[#daff0a] tw-transition-colors"
				onclick={onClose}
				title="Close Tactics Hub"
				style="border-radius: 0px;"
			>✕</button>
		</div>

		<!-- Nav Tabs -->
		<div class="tw-grid tw-grid-cols-2 tw-border-b tw-border-[#334155] tw-bg-[#050811] tw-text-[10px] tw-font-bold tw-tracking-wider">
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-border-r tw-border-[#334155] tw-transition-colors {activeTab === 'squad' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-b-[#14b8a6]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'squad'}
			>
				SQUAD
			</button>
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-transition-colors {activeTab === 'drills' ? 'tw-bg-[#0f172a] tw-text-[#daff0a] tw-border-b-2 tw-border-b-[#daff0a]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'drills'}
			>
				DRILLS
			</button>
		</div>

		<!-- Tab Body -->
		<div class="tw-flex-1 tw-overflow-y-auto tw-p-4 tw-space-y-6">
			{#if activeTab === 'squad'}
				<section>
					<div class="sstracker-roster-tray tw-flex tw-flex-col tw-gap-2">
						<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-1">
							ACTIVE MATCH SQUAD ({rosterList.length})
						</p>
						<p class="tw-text-[11px] tw-text-slate-400 tw-mb-3 tw-leading-relaxed">
							Drag player tokens to position them on the tactical arena.
						</p>
						<div class="tw-flex tw-flex-col tw-gap-1.5 tw-max-h-[60vh] tw-overflow-y-auto tw-pr-1">
							{#each rosterList as p (p.id)}
								{@const initials = getPlayerInitials(p.name)}
								<div
									class="roster-player-token tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-2 tw-text-xs tw-text-[#d4d4d8] hover:tw-border-[#14b8a6] tw-cursor-grab active:tw-scale-[0.98] tw-transition-all"
									style="border-radius: 0px;"
								>
									<div class="tw-flex tw-items-center tw-gap-2.5 tw-min-w-0">
										<span class="tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center tw-border tw-border-[#14b8a6] tw-bg-[#14b8a6]/20 tw-text-[10px] tw-font-bold tw-text-[#14b8a6]">
											{initials}
										</span>
										<span class="tw-truncate tw-font-mono tw-text-xs tw-text-slate-100">{p.name}</span>
									</div>
									<span class="tw-border tw-border-slate-700 tw-bg-[#050811] tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-[#fbbf24]">
										{p.position || 'MID'}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{:else if activeTab === 'drills'}
				<section>
					<div class="coach-tac-z2-placeholder">
						<span>[ DRILL LIBRARY SYNCING... ]</span>
					</div>
					<div class="tw-mt-4 tw-space-y-2">
						<p class="tw-text-[10px] tw-text-slate-500 tw-uppercase tw-tracking-widest">Available drills will appear here.</p>
					</div>
				</section>
			{/if}
		</div>
	</div>
</div>