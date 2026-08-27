<script>
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, isOpen: boolean, onClose: () => void }} */
	let { model: engine, isOpen = false, onClose } = $props();

	/** @type {'squad' | 'drills' | 'tools' | 'help'} */
	let activeTab = $state('squad');


	function getPlayerInitials(name) {
		if (!name) return 'PL';
		const parts = String(name).trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
		}
		return String(name).slice(0, 2).toUpperCase() || 'PL';
	}

	const rosterList = $derived(
		Array.isArray(engine?.host?.wrBucketXi) ? engine.host.wrBucketXi : []
	);
</script>

<div class="tw-pointer-events-none tw-fixed tw-inset-y-0 tw-left-0 tw-z-50 tw-w-96 tw-max-w-[90vw]" role="region" aria-label="Tactics Hub">
	<div
		class="tw-pointer-events-auto tw-flex tw-h-full tw-w-full tw-flex-col tw-border-r tw-border-[#334155] tw-bg-[#020617] tw-font-mono tw-text-[#fafafa] tw-shadow-[15px_0_30px_rgba(0,0,0,0.8)] tw-transition-transform tw-duration-300"
		style="transform: translateX({isOpen ? '0%' : '-100%'});"
		aria-hidden={!isOpen}
	>
		<!-- Header -->
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-bg-[#0f172a] tw-px-5 tw-py-4">
			<div class="tw-flex tw-items-center tw-gap-2.5">
				<span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-bg-[#daff0a] tw-shadow-[0_0_8px_#daff0a]"></span>
				<h2 class="tw-m-0 tw-text-xs tw-font-black tw-tracking-widest tw-text-white tw-uppercase">
					[ TACTICS HUB ]
				</h2>
			</div>
			<button
				type="button"
				class="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-bg-[#020617] tw-text-[#94a3b8] hover:tw-border-[#daff0a] hover:tw-text-[#daff0a] tw-transition-colors tw-rounded"
				onclick={onClose}
				title="Close Tactics Hub"
			>✕</button>
		</div>

		<!-- Nav Tabs -->
		<div class="tw-grid tw-grid-cols-4 tw-border-b tw-border-[#334155] tw-bg-[#020617] tw-text-[11px] tw-font-bold tw-tracking-wider">
			<button
				type="button"
				class="tw-py-3 tw-text-center tw-border-r tw-border-[#334155] tw-transition-all {activeTab === 'squad' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-b-[#14b8a6] tw-font-black' : 'tw-text-[#94a3b8] hover:tw-text-[#fafafa] hover:tw-bg-[#0f172a]/50'}"
				onclick={() => activeTab = 'squad'}
			>
				SQUAD
			</button>
			<button
				type="button"
				class="tw-py-3 tw-text-center tw-border-r tw-border-[#334155] tw-transition-all {activeTab === 'drills' ? 'tw-bg-[#0f172a] tw-text-[#daff0a] tw-border-b-2 tw-border-b-[#daff0a] tw-font-black' : 'tw-text-[#94a3b8] hover:tw-text-[#fafafa] hover:tw-bg-[#0f172a]/50'}"
				onclick={() => activeTab = 'drills'}
			>
				DRILLS
			</button>
			<button
				type="button"
				class="tw-py-3 tw-text-center tw-border-r tw-border-[#334155] tw-transition-all {activeTab === 'tools' ? 'tw-bg-[#0f172a] tw-text-[#daff0a] tw-border-b-2 tw-border-b-[#daff0a] tw-font-black' : 'tw-text-[#94a3b8] hover:tw-text-[#fafafa] hover:tw-bg-[#0f172a]/50'}"
				onclick={() => activeTab = 'tools'}
			>
				TOOLS
			</button>
			<button
				type="button"
				class="tw-py-3 tw-text-center tw-transition-all {activeTab === 'help' ? 'tw-bg-[#0f172a] tw-text-[#fbbf24] tw-border-b-2 tw-border-b-[#fbbf24] tw-font-black' : 'tw-text-[#94a3b8] hover:tw-text-[#fafafa] hover:tw-bg-[#0f172a]/50'}"
				onclick={() => activeTab = 'help'}
			>
				HELP
			</button>
		</div>

		<!-- Tab Body -->
		<div class="tw-flex-1 tw-overflow-y-auto tw-p-5 tw-space-y-6">
			{#if activeTab === 'squad'}
				<section>
					<div class="sstracker-roster-tray tw-flex tw-flex-col tw-gap-2">
						<div class="tw-flex tw-items-center tw-justify-between tw-mb-1">
							<p class="tw-text-xs tw-font-bold tw-tracking-widest tw-text-[#14b8a6] tw-uppercase tw-m-0">
								ACTIVE SQUAD ({rosterList.length})
							</p>
						</div>
						<p class="tw-text-xs tw-text-[#94a3b8] tw-mb-3 tw-leading-relaxed">
							Drag player tokens with their two-letter initials onto the tactical arena.
						</p>
						{#if rosterList.length === 0}
							<div class="tw-p-6 tw-bg-[#0f172a] tw-border tw-border-dashed tw-border-[#334155] tw-rounded-lg tw-text-center">
								<p class="tw-text-xs tw-text-[#94a3b8] tw-m-0">Loading team roster…</p>
							</div>
						{:else}
							<div class="tw-flex tw-flex-col tw-gap-2 tw-max-h-[60vh] tw-overflow-y-auto tw-pr-1">
								{#each rosterList as p (p.id)}
									{@const initials = getPlayerInitials(p.name)}
									<div
										class="roster-player-token tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3.5 tw-py-2.5 tw-text-xs tw-text-[#fafafa] hover:tw-border-[#14b8a6] tw-cursor-grab active:tw-scale-[0.98] tw-transition-all tw-rounded-lg"
									>
										<div class="tw-flex tw-items-center tw-gap-3 tw-min-w-0">
											<span class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-[#14b8a6] tw-bg-[#14b8a6]/20 tw-text-[11px] tw-font-mono tw-font-black tw-text-[#14b8a6] tw-rounded-md">
												{initials}
											</span>
											<span class="tw-truncate tw-font-mono tw-text-xs tw-font-bold tw-text-white">{p.name}</span>
										</div>
										<span class="tw-border tw-border-[#334155] tw-bg-[#020617] tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-text-[#daff0a] tw-rounded">
											{p.position || initials}
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</section>
			{:else if activeTab === 'drills'}
				<section class="tw-space-y-4">
					<div class="tw-p-5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-lg tw-text-left">
						<span class="tw-text-xs tw-font-bold tw-text-[#daff0a] tw-tracking-widest tw-uppercase">[ PHYSICAL DRILL CREATOR ]</span>
						<p class="tw-text-xs tw-text-[#94a3b8] tw-mt-2 tw-leading-relaxed">
							Convert this tactical whiteboard into a structured, printable physical drill sheet complete with cones, flags, time constraints, and coaching cues.
						</p>
						<a
							href="/coach/forge?tab=designer"
							class="tw-mt-3 tw-inline-flex tw-items-center tw-justify-center tw-w-full tw-gap-2 tw-border tw-border-[#fbbf24] tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-py-2.5 tw-uppercase hover:tw-bg-amber-400 tw-transition-colors tw-rounded"
						>
							➕ Open Drill Designer Sheet
						</a>
					</div>
					<div class="tw-border tw-border-[#334155] tw-bg-[#020617] tw-p-3 tw-rounded">
						<p class="tw-text-[11px] tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-mb-1">Available Tactics</p>
						<p class="tw-text-xs tw-text-slate-400">Save your play in the dock below to persist this pattern to your team playbook.</p>
					</div>
				</section>
			{:else if activeTab === 'tools'}
				<section>
					<p class="tw-text-xs tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase tw-mb-2">ROUTE SHAPE</p>
					<div class="tw-grid tw-grid-cols-3 tw-gap-2">
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2.5 tw-text-xs tw-text-center tw-transition-all tw-rounded {engine.routeDrawKind === 'curve' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-[#94a3b8] hover:tw-border-[#14b8a6]'}"
							onclick={(e) => { e.stopPropagation(); engine.routeDrawKind = 'curve'; engine.updateSelectedRouteShape?.('curve'); }}
						>[ CURVE ]</button>
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2.5 tw-text-xs tw-text-center tw-transition-all tw-rounded {engine.routeDrawKind === 'cut' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-[#94a3b8] hover:tw-border-[#14b8a6]'}"
							onclick={(e) => { e.stopPropagation(); engine.routeDrawKind = 'cut'; engine.updateSelectedRouteShape?.('cut'); }}
						>[ CUT ]</button>
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2.5 tw-text-xs tw-text-center tw-transition-all tw-rounded {engine.routeDrawKind === 'pass' ? 'tw-bg-[#fbbf24]/20 tw-border-[#fbbf24] tw-text-[#fbbf24] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-[#94a3b8] hover:tw-border-[#14b8a6]'}"
							onclick={(e) => { e.stopPropagation(); engine.routeDrawKind = 'pass'; engine.updateSelectedRouteShape?.('pass'); }}
						>[ PASS ]</button>
					</div>
				</section>
				<section>
					<p class="tw-text-xs tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase tw-mb-2">DRAW MODES</p>
					<div class="tw-grid tw-grid-cols-2 tw-gap-2">
						<button
							type="button"
							class="tw-border tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-transition-all tw-rounded {engine.activeTool === 'ROUTE' && engine.routeDrawKind === 'cut' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-[#fafafa] hover:tw-border-[#daff0a]'}"
							onclick={() => { engine.setActiveTool('ROUTE'); engine.routeDrawKind = 'cut'; }}
						>🏃 PLAYER RUN</button>
						<button
							type="button"
							class="tw-border tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-transition-all tw-rounded {engine.activeTool === 'ROUTE' && engine.routeDrawKind === 'pass' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-[#fafafa] hover:tw-border-[#14b8a6]'}"
							onclick={() => { engine.setActiveTool('ROUTE'); engine.routeDrawKind = 'pass'; }}
						>⚽ BALL PASS (PIVOT)</button>
					</div>
				</section>
				<section>
					<p class="tw-text-xs tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase tw-mb-2">BOARD OPERATIONS</p>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<button
							type="button"
							class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-text-[#fafafa] hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6] tw-transition-colors tw-rounded"
							onclick={(e) => { e.stopPropagation(); engine.injectBall(); }}
						>⚽ INJECT BALL TO PITCH</button>
						<button
							type="button"
							class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-text-[#fafafa] hover:tw-border-[#fbbf24] hover:tw-text-[#fbbf24] tw-transition-colors tw-rounded"
							onclick={(e) => { e.stopPropagation(); engine.recallBench(); }}
						>👥 RECALL BENCH</button>
						<button
							type="button"
							class="tw-border tw-border-red-900/60 tw-bg-red-950/40 tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-text-red-400 hover:tw-bg-red-950/80 hover:tw-border-red-500 tw-transition-colors tw-rounded"
							onclick={(e) => { e.stopPropagation(); engine.clearRoutesOnly(); }}
						>⊗ CLEAR ALL ROUTES</button>
						<button
							type="button"
							class="tw-border tw-border-amber-700/60 tw-bg-amber-950/40 tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-text-amber-300 hover:tw-bg-amber-900/60 hover:tw-border-amber-500 tw-transition-colors tw-rounded"
							onclick={(e) => { e.stopPropagation(); engine.clearOpponents?.(); }}
						>🛡 CLEAR OPPONENTS ONLY</button>
						<button
							type="button"
							class="tw-border tw-border-red-700 tw-bg-red-950/70 tw-px-3 tw-py-2.5 tw-text-xs tw-text-left tw-text-red-200 hover:tw-bg-red-900 hover:tw-text-white tw-font-bold tw-transition-colors tw-rounded"
							onclick={(e) => { e.stopPropagation(); engine.clearPitch?.(); }}
						>✕ CLEAR ENTIRE PITCH</button>
					</div>
				</section>
			{:else if activeTab === 'help'}
				<div class="tw-space-y-6">
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">1. Comprehensive Positional Blueprint</h4>
						<ul class="tw-space-y-2 tw-text-slate-300 tw-text-xs">
							<li><strong class="tw-text-[#daff0a]">GK (Goalkeeper):</strong> Visual reactions, spatial command, shot-stopping, progressive distribution.</li>
							<li><strong class="tw-text-[#14b8a6]">CB / LCB / RCB (Center Back):</strong> Spatial defense anchor, aerial dominance, progressive line-breaking passes.</li>
							<li><strong class="tw-text-[#14b8a6]">LB / RB (Fullback):</strong> 1v1 flank containment, channel progression, crossing & overlap capability.</li>
							<li><strong class="tw-text-[#14b8a6]">LWB / RWB (Wing Back):</strong> High-speed dual-phase wing motor; width generator and recovery sprinter.</li>
							<li><strong class="tw-text-[#fbbf24]">CDM / LDM / RDM (Defensive Mid):</strong> Central pivot shield, transition distribution, counter-press disruptor.</li>
							<li><strong class="tw-text-[#fbbf24]">CM / LCM / RCM (Central Mid):</strong> Box-to-box engine, tempo controller, spatial linker (half-space shifts).</li>
							<li><strong class="tw-text-[#fbbf24]">CAM / LAM / RAM (Attacking Mid):</strong> Half-space unlocker, creative playmaker, line-penetrating final passes.</li>
							<li><strong class="tw-text-[#06b6d4]">LM / RM (Wide Mid):</strong> Flank balance, diagonal tracking, combination crossing service.</li>
							<li><strong class="tw-text-[#06b6d4]">LW / RW (Winger):</strong> 1v1 isolation dribbling, cut-in shooting, aggressive wing penetration.</li>
							<li><strong class="tw-text-[#ef4444]">CF / SS (Center Forward / Second Striker):</strong> False-9 link play, combining midfield to attack, pocket receiver.</li>
							<li><strong class="tw-text-[#ef4444]">ST (Striker):</strong> Box penetration, target play, blind-side runs, clinical finishing.</li>
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