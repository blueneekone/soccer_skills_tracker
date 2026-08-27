<script>
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, isOpen: boolean, onClose: () => void, teamId?: string }} */
	let { model: engine, isOpen = false, onClose, teamId = '' } = $props();

	/** @type {'squad' | 'drills' | 'tools' | 'help'} */
	let activeTab = $state('squad');

	// ── Playbook Drills (from teams/{teamId}/drills where inPlaybook=true) ─────
	/** @type {Array<{id: string, name: string, focusArea?: string, durationMinutes?: number, entities: any[], routes: any[]}>} */
	let playbookDrills = $state([]);
	let loadingDrills = $state(false);
	let loadedForTeam = $state('');

	$effect(() => {
		if (!browser || !isOpen || activeTab !== 'drills') return;
		if (!db || !authStore.isAuthenticated) return;
		const tid = teamId ||
				authStore.teamId ||
				authStore.user?.teamId ||
				/** @type {any} */ (engine)?._teamId ||
				/** @type {any} */ (engine)?.teamId || '';
		if (!tid || tid === loadedForTeam) return;
		loadedForTeam = tid;
		loadingDrills = true;
		(async () => {
			try {
				const snap = await getDocs(
					query(collection(db, 'teams', tid, 'drills'), orderBy('createdAt', 'desc'))
				);
				/** @type {Array<{id: string, name: string, focusArea?: string, durationMinutes?: number, entities: any[], routes: any[]}>} */
				const list = [];
				snap.forEach((docSnap) => {
					const d = docSnap.data() || {};
					list.push({
						id: docSnap.id,
						name: d.name || d.title || 'Untitled Drill',
						focusArea: d.focusArea || d.category || '',
						durationMinutes: d.durationMinutes || 15,
						entities: Array.isArray(d.entities) ? d.entities : [],
						routes: Array.isArray(d.routes) ? d.routes : [],
					});
				});
				playbookDrills = list;
			} catch (e) {
				console.error('[TacticsHubDrawer] drills load error:', e);
			} finally {
				loadingDrills = false;
			}
		})();
	});

	/**
	 * Load a playbook drill's entities and routes onto the War Room pitch board.
	 * @param {{entities: any[], routes: any[]}} drill
	 */
	function loadDrillToPitch(drill) {
		if (!drill.entities?.length && !drill.routes?.length) return;
		try {
			if (typeof /** @type {any} */ (engine)?.loadCartridge === 'function') {
				/** @type {any} */ (engine).loadCartridge({
					id: drill.id,
					title: drill.name,
					schemaVersion: 1,
					entities: drill.entities,
					routes: drill.routes,
					metadata: { sport: 'soccer', duration: 4000, tags: [] },
				});
			} else if (/** @type {any} */ (engine)?.host) {
				if (drill.entities?.length) {
					/** @type {any} */ (engine).host.wrBucketPitch.set(
						drill.entities.filter((/** @type {any} */ e) => e.side !== 'opponent').map((/** @type {any} */ e) => ({ ...e }))
					);
					/** @type {any} */ (engine).host.wrOppPitch.set(
						drill.entities.filter((/** @type {any} */ e) => e.side === 'opponent').map((/** @type {any} */ e) => ({ ...e }))
					);
				}
				if (drill.routes?.length) {
					/** @type {any} */ (engine).host.drawnRoutes.set(drill.routes.map((/** @type {any} */ r) => ({ ...r })));
				}
			}
			onClose();
		} catch (err) {
			console.error('[TacticsHubDrawer] loadDrillToPitch error:', err);
		}
	}

	function getPlayerInitials(name) {
		if (!name) return 'PL';
		const parts = String(name).trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
		}
		return String(name).slice(0, 2).toUpperCase() || 'PL';
	}

	const rawHostXi = $derived(
		typeof engine?.host?.wrBucketXi?.get === 'function'
			? engine.host.wrBucketXi.get()
			: (Array.isArray(engine?.host?.wrBucketXi) ? engine.host.wrBucketXi : (Array.isArray(engine?.wrBucketXi) ? engine.wrBucketXi : []))
	);

	let fallbackRoster = $state([]);

	$effect(() => {
		if (rawHostXi.length > 0) return;
		if (!browser || !isOpen || activeTab !== 'squad') return;
		if (!db || !authStore.isAuthenticated) return;
		const tid = teamId ||
			authStore.teamId ||
			authStore.user?.teamId ||
			/** @type {any} */ (engine)?._teamId ||
			/** @type {any} */ (engine)?.teamId || '';
		if (!tid) return;

		const q = query(collection(db, 'player_lookup'), where('teamId', '==', tid));
		getDocs(q).then((snap) => {
			if (!snap.empty) {
				fallbackRoster = snap.docs.map((d) => {
					const data = d.data() || {};
					const name = data.playerName || data.displayName || d.id;
					return {
						id: d.id,
						name,
						number: data.jersey ? String(data.jersey) : getPlayerInitials(name),
						position: data.position || 'CM',
						side: 'friendly',
						color: '#14b8a6',
					};
				});
			}
		}).catch(() => {});
	});

	const rosterList = $derived(rawHostXi.length > 0 ? rawHostXi : fallbackRoster);

	function addPlayerToPitch(p) {
		const currentPitch = typeof engine?.host?.wrBucketPitch?.get === 'function'
			? engine.host.wrBucketPitch.get()
			: (Array.isArray(engine?.host?.wrBucketPitch) ? engine.host.wrBucketPitch : (engine?.wrBucketPitch || []));

		if (currentPitch.some((t) => t.id === p.id || t.name === p.name)) return;

		const count = currentPitch.length;
		const x = 25 + (count % 4) * 16;
		const y = 25 + Math.floor(count / 4) * 16;

		const newToken = {
			id: p.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			name: p.name,
			number: p.number || getPlayerInitials(p.name),
			position: p.position || '',
			x,
			y,
			side: 'friendly',
			color: '#14b8a6',
		};

		if (typeof engine?.host?.wrBucketPitch?.set === 'function') {
			engine.host.wrBucketPitch.set([...currentPitch, newToken]);
		} else if (engine?.wrBucketPitch) {
			engine.wrBucketPitch = [...currentPitch, newToken];
		}
	}
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
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div
										class="roster-player-token tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3.5 tw-py-2.5 tw-text-xs tw-text-[#fafafa] hover:tw-border-[#14b8a6] tw-cursor-pointer active:tw-scale-[0.98] tw-transition-all tw-rounded-lg"
										onclick={() => addPlayerToPitch(p)}
										role="button"
										tabindex="0"
									>
										<div class="tw-flex tw-items-center tw-gap-3 tw-min-w-0">
											<span class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-[#14b8a6] tw-bg-[#14b8a6]/20 tw-text-[11px] tw-font-mono tw-font-black tw-text-[#14b8a6] tw-rounded-md">
												{p.number || initials}
											</span>
											<span class="tw-truncate tw-font-mono tw-text-xs tw-font-bold tw-text-white">{p.name}</span>
										</div>
										<div class="tw-flex tw-items-center tw-gap-2">
											<span class="tw-border tw-border-[#334155] tw-bg-[#020617] tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-text-[#daff0a] tw-rounded">
												{p.position || initials}
											</span>
											<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-text-[#14b8a6]">
												+ ADD
											</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</section>
			{:else if activeTab === 'drills'}
				<section class="tw-space-y-4">
					<!-- Playbook Drills Header -->
					<div class="tw-flex tw-items-center tw-justify-between">
						<div>
							<p class="tw-text-[11px] tw-font-black tw-tracking-widest tw-text-[#14b8a6] tw-uppercase tw-mb-0">
								TEAM PLAYBOOK
							</p>
							<p class="tw-text-[10px] tw-text-slate-500 tw-mt-0.5">
								Drills saved in The Forge Drill Designer. Click Load to inject onto the pitch.
							</p>
						</div>
						<a
							href="/coach/forge?tab=designer"
							class="tw-flex-shrink-0 tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-[10px] tw-px-2 tw-py-1 tw-rounded-lg tw-no-underline tw-transition-all"
							title="Design new drill in The Forge"
						>
							+ New Drill
						</a>
					</div>

					{#if loadingDrills}
						<div class="tw-p-4 tw-text-center tw-text-slate-500 tw-font-mono tw-text-xs">
							Loading playbook…
						</div>
					{:else if playbookDrills.length === 0}
						<div class="tw-p-5 tw-bg-[#0f172a] tw-border tw-border-dashed tw-border-[#334155] tw-rounded-xl tw-text-center">
							<p class="tw-text-[11px] tw-font-bold tw-text-[#daff0a] tw-uppercase tw-tracking-widest tw-mb-1">
								No Playbook Drills Yet
							</p>
							<p class="tw-text-xs tw-text-slate-400 tw-leading-relaxed">
								Use <span class="tw-text-[#fbbf24] tw-font-bold">[ DEPLOY TO DESIGNER ]</span> in the dock below to send your War Room play to the Drill Designer, fill in the drill info, and save it to the Team Playbook.
							</p>
						</div>
					{:else}
						<div class="tw-flex tw-flex-col tw-gap-2 tw-max-h-[55vh] tw-overflow-y-auto tw-pr-1">
							{#each playbookDrills as drill (drill.id)}
								<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] hover:tw-border-[#14b8a6]/50 tw-rounded-xl tw-p-3 tw-flex tw-flex-col tw-gap-2.5 tw-transition-all">
									<div class="tw-flex tw-items-start tw-justify-between tw-gap-2">
										<div class="tw-min-w-0">
											<p class="tw-text-xs tw-font-bold tw-text-white tw-truncate tw-mb-0.5">
												{drill.name}
											</p>
											<div class="tw-flex tw-items-center tw-gap-1.5">
												{#if drill.focusArea}
													<span class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-text-[#14b8a6] tw-font-mono tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-rounded">
														{drill.focusArea}
													</span>
												{/if}
												<span class="tw-text-[9px] tw-text-slate-500 tw-font-mono">
													{drill.durationMinutes}min
												</span>
											</div>
										</div>
									</div>
									<div class="tw-flex tw-gap-1.5">
										{#if drill.entities?.length || drill.routes?.length}
											<button
												type="button"
												class="tw-flex-1 tw-bg-[#14b8a6]/20 hover:tw-bg-[#14b8a6]/40 tw-border tw-border-[#14b8a6]/50 tw-text-[#14b8a6] tw-font-mono tw-text-[10px] tw-font-bold tw-py-1.5 tw-rounded-lg tw-transition-all active:tw-scale-[0.97]"
												onclick={() => loadDrillToPitch(drill)}
												title="Load drill players and routes onto the War Room pitch"
											>
												▶ Load to Pitch
											</button>
										{/if}
										<a
											href="/coach/forge?tab=designer"
											class="tw-flex-shrink-0 tw-bg-[#020617] hover:tw-bg-[#0f172a] tw-border tw-border-[#334155] hover:tw-border-[#fbbf24]/40 tw-text-slate-400 hover:tw-text-[#fbbf24] tw-font-mono tw-text-[10px] tw-px-2.5 tw-py-1.5 tw-rounded-lg tw-no-underline tw-transition-all"
											title="Edit this drill in The Forge"
										>
											Edit
										</a>
									</div>
								</div>
							{/each}
						</div>
					{/if}
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