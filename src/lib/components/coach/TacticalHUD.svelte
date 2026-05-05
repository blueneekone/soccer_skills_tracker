<script>
	import { scale, fade } from 'svelte/transition';
	import GridHUD from './grid/GridHUD.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model, warRoomTool = $bindable('DRAG') } = $props();

	/**
	 * @param {PointerEvent} ev
	 * @param {HTMLElement} el
	 */
	function scrubNormFromPointer(ev, el) {
		const rect = el.getBoundingClientRect();
		const w = rect.width || 1;
		return Math.max(0, Math.min(1, (ev.clientX - rect.left) / w));
	}

	/** @param {PointerEvent} e */
	function onRailPointerDown(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (e.pointerId != null) {
			try {
				el.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
		model.scrubTimelineNorm(scrubNormFromPointer(e, el));
	}

	/** @param {PointerEvent} e */
	function onRailPointerMove(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (e.pointerId != null && !el.hasPointerCapture(e.pointerId)) return;
		model.scrubTimelineNorm(scrubNormFromPointer(e, el));
	}

	/** @param {PointerEvent} e */
	function onRailPointerUp(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (e.pointerId != null) {
			try {
				el.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
	}

	// ── Deploy sequence ────────────────────────────────────────────────────────
	let deployPhase = $state(/** @type {'idle' | 'deploying' | 'success'} */ ('idle'));
	let deployProgress = $state(0);
	let deployXpBounty = $state(0);
	let deployCartridgeId = $state('');

	function computeXpBounty() {
		const totalDist = model.routesLive.reduce((acc, r) => {
			const chord = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
			const arms = Math.hypot(r.cx - r.x1, r.cy - r.y1) + Math.hypot(r.x2 - r.cx, r.y2 - r.cy);
			return acc + (chord + arms) / 2;
		}, 0);
		return Math.max(50, Math.round(totalDist / 8) + 50 * Math.max(1, model.routesLive.length));
	}

	function handleDeploy() {
		const cartridge = model.serializeToCartridge();
		deployCartridgeId = cartridge.id.slice(0, 8).toUpperCase();
		deployXpBounty = computeXpBounty();
		deployPhase = 'deploying';
		deployProgress = 0;

		const start = performance.now();
		const duration = 1800;

		function step() {
			deployProgress = Math.min(1, (performance.now() - start) / duration);
			if (deployProgress < 1) {
				requestAnimationFrame(step);
			} else {
				setTimeout(() => {
					deployPhase = 'success';
				}, 180);
			}
		}
		requestAnimationFrame(step);
	}

	function closeDeploy() {
		deployPhase = 'idle';
		deployProgress = 0;
	}
</script>

<div
	class="tw-pointer-events-auto tw-relative tw-z-50 tw-min-h-28 tw-shrink-0 tw-overflow-visible tw-border-t tw-border-white/10 tw-bg-[#020202]/85 tw-py-2 tw-pb-20 tw-backdrop-blur-2xl tw-transition-[box-shadow] tw-duration-300 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_-12px_40px_rgba(0,0,0,0.45)] {model.focusedPlayerId
		? 'tw-shadow-[inset_0_1px_0_rgba(255,0,60,0.35)]'
		: ''}"
>
	<GridHUD
		bind:warRoomTool
		pickTool={(t) => model.setActiveTool(t)}
		bind:isHolotableMode={model.isHolotableMode}
		simulator={model.simulator}
		bind:showLabels={model.showLabels}
		bind:activeRouteColor={model.activeRouteColor}
		bind:routeDrawKind={model.routeDrawKind}
		focusedPlayerId={model.focusedPlayerId}
		allTokens={model.allPitchTokens}
		recallBench={model.recallBench}
		clearRoutesOnly={model.clearRoutesOnly}
	/>

	<!-- DEPLOY TO SQUAD ─────────────────────────────────────────────────────── -->
	<div class="tw-pointer-events-auto tw-absolute tw-bottom-2 tw-right-4 tw-z-20">
		<button
			type="button"
			class="tw-pointer-events-auto tw-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-[#00f0ff]/40 tw-bg-[#020202]/80 tw-px-5 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-backdrop-blur-xl tw-transition-all hover:tw-border-[#00f0ff]/80 hover:tw-bg-[#00f0ff]/10 hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.35)] active:tw-scale-95 disabled:tw-cursor-not-allowed disabled:tw-opacity-30"
			onclick={handleDeploy}
			disabled={deployPhase !== 'idle' || model.routesLive.length === 0}
		>
			<span
				class="tw-block tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-[#00f0ff] tw-shadow-[0_0_8px_rgba(0,240,255,0.9)]"
			></span>
			DEPLOY TO SQUAD
		</button>
	</div>

	<!-- Playback reactor: physical scrub + clock (no native range) ─────────── -->
	<div
		class="tw-pointer-events-none tw-absolute tw-left-1/2 tw-top-full tw-z-[60] tw-flex tw--translate-x-1/2 tw-justify-center tw-pt-2"
		aria-hidden="false"
	>
		<div class="tw-pointer-events-auto tw-flex tw-flex-col tw-items-center tw-gap-2">
			<div
				class="tw-pointer-events-auto tw-rounded-full tw-border tw-border-white/10 tw-bg-[#020202]/90 tw-px-6 tw-py-2 tw-backdrop-blur-xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
			>
				<span
					class="tw-font-mono tw-text-lg tw-font-bold tw-tracking-widest tw-tabular-nums tw-text-[#00f0ff]"
				>
					{model.formatTimelineMs(model.simulator.currentTime)}
				</span>
			</div>

			<div
				class="tw-pointer-events-auto tw-relative tw-h-2 tw-w-[min(24rem,92vw)] tw-cursor-pointer tw-overflow-hidden tw-rounded-full tw-bg-white/10 tw-shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]"
				role="slider"
				tabindex="0"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={Math.round(model.timelineNorm * 100)}
				aria-label="Simulation timeline"
				onpointerdown={onRailPointerDown}
				onpointermove={onRailPointerMove}
				onpointerup={onRailPointerUp}
				onpointercancel={onRailPointerUp}
			>
				<div
					class="tw-pointer-events-none tw-absolute tw-left-0 tw-top-0 tw-h-full tw-bg-gradient-to-r tw-from-[#00f0ff]/25 tw-to-[#00f0ff] tw-shadow-[0_0_12px_rgba(0,240,255,0.45)]"
					style="width: {model.timelineNorm * 100}%;"
				></div>
			</div>

			<button
				type="button"
				class="tw-pointer-events-auto tw-mt-1 tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-[#00f0ff]/50 tw-bg-[#020202]/80 tw-text-[#00f0ff] tw-backdrop-blur-xl tw-transition-transform hover:tw-scale-110 hover:tw-bg-[#00f0ff]/15 hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.35)]"
				aria-pressed={model.simulator.isPlaying}
				aria-label={model.simulator.isPlaying ? 'Pause simulation' : 'Play simulation'}
				onclick={() => model.toggleTimelinePlayback()}
			>
				{#if model.simulator.isPlaying}
					<span class="tw-flex tw-items-center tw-gap-1 tw-text-current" aria-hidden="true">
						<span class="tw-block tw-h-3 tw-w-1 tw-rounded-sm tw-bg-current"></span>
						<span class="tw-block tw-h-3 tw-w-1 tw-rounded-sm tw-bg-current"></span>
					</span>
				{:else}
					<span
						class="tw-ml-0.5 tw-block tw-h-0 tw-w-0 tw-border-y-[6px] tw-border-y-transparent tw-border-l-[10px] tw-border-l-current"
						aria-hidden="true"
					></span>
				{/if}
			</button>
		</div>
	</div>
</div>

<!-- ── Deploy Modal ─────────────────────────────────────────────────────────── -->
{#if deployPhase !== 'idle'}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-pointer-events-auto tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 200 }}
	>
		<!-- Backdrop: click-to-close only in success state -->
		<div
			class="tw-absolute tw-inset-0 tw-bg-black/75 tw-backdrop-blur-sm"
			onclick={() => deployPhase === 'success' && closeDeploy()}
		></div>

		<!-- Panel -->
		<div
			class="tw-relative tw-w-[min(400px,90vw)] tw-rounded-2xl tw-border tw-border-white/10 tw-bg-[#020202]/96 tw-p-8 tw-text-center tw-backdrop-blur-2xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_0_80px_rgba(0,240,255,0.12),_0_40px_80px_rgba(0,0,0,0.8)]"
			in:scale={{ duration: 350, start: 0.85 }}
			out:scale={{ duration: 200, start: 0.92 }}
		>
			{#if deployPhase === 'deploying'}
				<p
					class="tw-mb-1 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.3em] tw-text-white/25"
				>
					CARTRIDGE {deployCartridgeId}
				</p>
				<h2
					class="tw-mb-6 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff]"
				>
					DEPLOYING PLAY...
				</h2>

				<!-- Progress bar -->
				<div
					class="tw-mb-2 tw-h-1.5 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10 tw-shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
				>
					<div
						class="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-[#00f0ff]/50 tw-to-[#00f0ff] tw-shadow-[0_0_12px_rgba(0,240,255,0.6)]"
						style="width: {deployProgress * 100}%; transition: none;"
					></div>
				</div>
				<p class="tw-mb-6 tw-font-mono tw-text-xs tw-text-white/35">
					{Math.round(deployProgress * 100)}% TRANSMITTED
				</p>

				<div
					class="tw-flex tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-[#00f0ff]/20 tw-bg-[#00f0ff]/5 tw-px-4 tw-py-3"
				>
					<span
						class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/40"
						>XP BOUNTY</span
					>
					<span class="tw-font-mono tw-text-lg tw-font-bold tw-text-[#00f0ff]">+{deployXpBounty}</span>
				</div>
			{:else}
				<!-- Success state -->
				<div class="tw-mb-5 tw-flex tw-items-center tw-justify-center">
					<div
						class="tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-[#00f0ff]/40 tw-bg-[#00f0ff]/10 tw-shadow-[0_0_30px_rgba(0,240,255,0.25)]"
					>
						<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
							<polyline
								points="6,14 11,20 22,9"
								stroke="#00f0ff"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
				</div>

				<h2
					class="tw-mb-1 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff]"
				>
					TRANSMITTING TO FIELD UNITS
				</h2>
				<p class="tw-mb-5 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/25">
					CARTRIDGE {deployCartridgeId} · CONFIRMED
				</p>

				<div class="tw-mb-4 tw-h-1.5 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10">
					<div
						class="tw-h-full tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-[#00f0ff]/50 tw-to-[#00f0ff] tw-shadow-[0_0_12px_rgba(0,240,255,0.6)]"
					></div>
				</div>

				<div
					class="tw-mb-6 tw-flex tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-[#00f0ff]/25 tw-bg-[#00f0ff]/10 tw-px-4 tw-py-3"
				>
					<span
						class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/40"
						>XP AWARDED</span
					>
					<span class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#00f0ff]">+{deployXpBounty}</span>
				</div>

				<button
					type="button"
					class="tw-pointer-events-auto tw-w-full tw-rounded-full tw-border tw-border-white/15 tw-bg-white/5 tw-py-2.5 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/50 tw-transition-all hover:tw-border-white/30 hover:tw-bg-white/10 hover:tw-text-white/90"
					onclick={closeDeploy}
				>
					CLOSE
				</button>
			{/if}
		</div>
	</div>
{/if}
