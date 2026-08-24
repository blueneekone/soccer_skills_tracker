<script>
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, isOpen: boolean, onClose: () => void }} */
	let { model: engine, isOpen = false, onClose } = $props();

	/** @type {'roster' | 'tools' | 'help'} */
	let activeTab = $state('roster');

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
		<div class="tw-grid tw-grid-cols-3 tw-border-b tw-border-[#334155] tw-bg-[#050811] tw-text-[10px] tw-font-bold tw-tracking-wider">
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-border-r tw-border-[#334155] tw-transition-colors {activeTab === 'roster' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-b-[#14b8a6]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'roster'}
			>
				ROSTER ({rosterList.length})
			</button>
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-border-r tw-border-[#334155] tw-transition-colors {activeTab === 'tools' ? 'tw-bg-[#0f172a] tw-text-[#daff0a] tw-border-b-2 tw-border-b-[#daff0a]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'tools'}
			>
				DRAW TOOLS
			</button>
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-transition-colors {activeTab === 'help' ? 'tw-bg-[#0f172a] tw-text-[#fbbf24] tw-border-b-2 tw-border-b-[#fbbf24]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'help'}
			>
				HELP & LAWS
			</button>
		</div>

		<!-- Tab Body -->
		<div class="tw-flex-1 tw-overflow-y-auto tw-p-4 tw-space-y-6">
			{#if activeTab === 'roster'}
				<section>
					<div class="sstracker-roster-tray tw-flex tw-flex-col tw-gap-2">
						<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-1">
							SQUAD ACTIVE ROSTER ({rosterList.length})
						</p>
						<p class="tw-text-[11px] tw-text-slate-400 tw-mb-3 tw-leading-relaxed">
							Drag player tokens or click to position them on the tactical arena.
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
			{:else if activeTab === 'tools'}
				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">ROUTE_SHAPE</p>
					<div class="tw-grid tw-grid-cols-3 tw-gap-2">
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2 tw-text-xs tw-text-center tw-transition-all {engine.routeDrawKind === 'curve' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300 hover:tw-border-slate-500'}"
							onclick={(e) => { e.stopPropagation(); engine.routeDrawKind = 'curve'; engine.updateSelectedRouteShape?.('curve'); }}
							style="border-radius: 0px;"
						>[ CURVE ]</button>
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2 tw-text-xs tw-text-center tw-transition-all {engine.routeDrawKind === 'cut' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300 hover:tw-border-slate-500'}"
							onclick={(e) => { e.stopPropagation(); engine.routeDrawKind = 'cut'; engine.updateSelectedRouteShape?.('cut'); }}
							style="border-radius: 0px;"
						>[ CUT ]</button>
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2 tw-text-xs tw-text-center tw-transition-all {engine.routeDrawKind === 'pass' ? 'tw-bg-[#fbbf24]/20 tw-border-[#fbbf24] tw-text-[#fbbf24] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300 hover:tw-border-slate-500'}"
							onclick={(e) => { e.stopPropagation(); engine.routeDrawKind = 'pass'; engine.updateSelectedRouteShape?.('pass'); }}
							style="border-radius: 0px;"
						>[ PASS ]</button>
					</div>
				</section>
				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">INK_COLOR</p>
					<div class="tw-flex tw-items-center tw-gap-3">
						{#each INK_PALETTE as color (color)}
							<button
								type="button"
								class="tw-h-7 tw-w-7 tw-border tw-transition-transform active:tw-scale-90 {engine.activeRouteColor === color ? 'tw-border-white tw-scale-110 tw-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'tw-border-transparent hover:tw-border-slate-500'}"
								style="background: {color}; border-radius: 0px;"
								onclick={(e) => { e.stopPropagation(); engine.activeRouteColor = color; engine.updateSelectedRouteColor?.(color); }}
								aria-label="Route color {color}"
							></button>
						{/each}
					</div>
				</section>
				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">DRAW_MODES</p>
					<div class="tw-grid tw-grid-cols-2 tw-gap-2">
						<button
							type="button"
							class="tw-border tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-transition-all {engine.activeTool === 'ROUTE' && engine.routeDrawKind === 'cut' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300'}"
							onclick={() => { engine.setActiveTool('ROUTE'); engine.routeDrawKind = 'cut'; }}
							style="border-radius: 0px;"
						>🏃 PLAYER RUN</button>
						<button
							type="button"
							class="tw-border tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-transition-all {engine.activeTool === 'ROUTE' && engine.routeDrawKind === 'pass' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300'}"
							onclick={() => { engine.setActiveTool('ROUTE'); engine.routeDrawKind = 'pass'; }}
							style="border-radius: 0px;"
						>⚽ BALL PASS</button>
					</div>
				</section>
				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">BOARD_OPERATIONS</p>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<button
							type="button"
							class="tw-border tw-border-slate-700 tw-bg-[#0f172a] tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-slate-200 hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6] tw-transition-colors"
							onclick={(e) => { e.stopPropagation(); engine.injectBall(); }}
							style="border-radius: 0px;"
						>⚽ INJECT BALL TO PITCH</button>
						<button
							type="button"
							class="tw-border tw-border-slate-700 tw-bg-[#0f172a] tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-slate-200 hover:tw-border-[#fbbf24] hover:tw-text-[#fbbf24] tw-transition-colors"
							onclick={(e) => { e.stopPropagation(); engine.recallBench(); }}
							style="border-radius: 0px;"
						>👥 RECALL BENCH</button>
						<button
							type="button"
							class="tw-border tw-border-red-900/60 tw-bg-red-950/30 tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-red-400 hover:tw-bg-red-950/60 hover:tw-border-red-500 tw-transition-colors"
							onclick={(e) => { e.stopPropagation(); engine.clearRoutesOnly(); }}
							style="border-radius: 0px;"
						>⊗ CLEAR ALL ROUTES</button>
						<button
							type="button"
							class="tw-border tw-border-red-800 tw-bg-red-950/60 tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-red-300 hover:tw-bg-red-900 hover:tw-text-white tw-font-bold tw-transition-colors"
							onclick={(e) => { e.stopPropagation(); engine.clearPitch?.(); }}
							style="border-radius: 0px;"
						>✕ CLEAR ENTIRE PITCH</button>
					</div>
				</section>
			{:else if activeTab === 'help'}
				<div class="tw-space-y-6">
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">1. Core Maturation & Positional Blueprint</h4>
						<ul class="tw-space-y-2 tw-text-slate-400 tw-text-xs">
							<li><strong class="tw-text-slate-200">CB (Center Back):</strong> Spatial anchor; accelerated tactical orientation (sensitive ages 12–14).</li>
							<li><strong class="tw-text-slate-200">CDM (Defensive Midfielder):</strong> Transition engine; kinesthetic differentiation (sensitive ages 10–11).</li>
							<li><strong class="tw-text-slate-200">LWB (Wing Back):</strong> High-speed overlapping; aligns with agility adaptation (ages 8–13).</li>
							<li><strong class="tw-text-slate-200">ST (Striker):</strong> Peak spatial reaction and synchronization (sensitive ages 6–10).</li>
							<li><strong class="tw-text-slate-200">GK (Goalkeeper):</strong> Visual reactions and upper-body hand-eye coordination.</li>
						</ul>
					</div>
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">2. Pitch Dimensions per Age Group</h4>
						<ul class="tw-space-y-2 tw-text-slate-400 tw-text-xs">
							<li><strong class="tw-text-slate-200">U6 / U8 (FUNdamentals):</strong> 4v4 (No GK) | 25 × 15 Yards</li>
							<li><strong class="tw-text-slate-200">U10 (Learn to Train):</strong> 7v7 (With GK) | 55 × 35 Yards</li>
							<li><strong class="tw-text-slate-200">U12 (Learn to Train):</strong> 9v9 (With GK) | 75 × 50 Yards</li>
							<li><strong class="tw-text-slate-200">U14+ (Train to Train):</strong> 11v11 | 110 × 70 Yards</li>
						</ul>
					</div>
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">3. Pediatric Safety & Laws</h4>
						<ul class="tw-space-y-2 tw-text-slate-400 tw-text-xs">
							<li>Requires a <strong class="tw-text-slate-200">2:1 or 3:1 training-to-competition ratio</strong>.</li>
							<li>Organized training limit: age in hours per week maximum.</li>
							<li>Max 8 months cumulative per year in single sport.</li>
							<li>Minimum 2 complete, consecutive rest days per week.</li>
						</ul>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>