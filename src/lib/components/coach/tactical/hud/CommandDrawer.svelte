<script>
	/** War-room engine — alias `engine` for drawer state writes (Svelte 5 runes getters/setters on model). */
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model: engine } = $props();

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const segBtn =
		'tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/20 tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/60 tw-transition-colors hover:tw-border-[#00f0ff]/40 hover:tw-text-[#00f0ff]';
	const segBtnOn = 'tw-border-[#00f0ff]/55 !tw-bg-[#00f0ff]/12 !tw-text-[#00f0ff]';
</script>

<!--
  Edge toggle — stopPropagation so HUD / pitch parents never swallow the click.
-->
<button
	type="button"
	class="tw-pointer-events-auto tw-absolute tw-right-0 tw-top-[42%] -tw-translate-y-1/2 tw-z-30 tw-flex tw-h-16 tw-w-6 tw-items-center tw-justify-center tw-rounded-l-lg tw-border tw-border-r-0 tw-border-[#00f0ff]/35 tw-bg-[#041d2c]/75 tw-backdrop-blur-xl tw-text-[#00f0ff]/60 tw-transition-all hover:tw-border-[#00f0ff]/60 hover:tw-text-[#00f0ff] hover:tw-shadow-[-4px_0_20px_rgba(0,240,255,0.2)]"
	onclick={(e) => {
		e.stopPropagation();
		engine.isDrawerOpen = !engine.isDrawerOpen;
	}}
	aria-label={engine.isDrawerOpen ? 'Close command drawer' : 'Open command drawer'}
	aria-expanded={engine.isDrawerOpen}
>
	<span class="tw-font-mono tw-text-[8px] tw-font-bold tw-tracking-widest [writing-mode:vertical-rl] tw-select-none">
		{engine.isDrawerOpen ? '▶' : '◀'}
	</span>
</button>

<!--
  Slide panel — translucent blue glass; transform on one line (avoids broken class string).
-->
<div
	class="tw-pointer-events-auto tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-80 tw-overflow-y-auto tw-overflow-x-hidden tw-border-l tw-border-[#00f0ff]/40 tw-bg-[#041d2c]/60 tw-shadow-[-10px_0_30px_rgba(0,240,255,0.1)] tw-backdrop-blur-2xl tw-will-change-transform tw-transition-transform tw-duration-300 tw-ease-[cubic-bezier(0.23,1,0.32,1)] {engine.isDrawerOpen
		? 'tw-translate-x-0'
		: 'tw-translate-x-full'}"
	aria-hidden={!engine.isDrawerOpen}
	role="complementary"
	aria-label="Command drawer"
>
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-y-0 tw-left-0 tw-w-px tw-bg-gradient-to-b tw-from-transparent tw-via-[#00f0ff]/45 tw-to-transparent"
		aria-hidden="true"
	></div>

	<!-- Hard-wired close — top-left inside panel, always hits engine state. -->
	<button
		type="button"
		class="tw-pointer-events-auto tw-absolute tw-left-3 tw-top-3 tw-z-50 tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-lg tw-border-2 tw-border-[#00f0ff]/50 tw-bg-[#020202]/70 tw-font-mono tw-text-sm tw-font-bold tw-text-[#00f0ff] tw-shadow-[0_0_18px_rgba(0,240,255,0.35)] tw-backdrop-blur-md tw-transition-all hover:tw-border-[#00f0ff] hover:tw-bg-[#00f0ff]/15 hover:tw-shadow-[0_0_28px_rgba(0,240,255,0.45)]"
		onclick={(e) => {
			e.stopPropagation();
			engine.isDrawerOpen = false;
		}}
		aria-label="Close drawer"
	>
		<span aria-hidden="true">✕</span>
	</button>

	<div
		class="tw-sticky tw-top-0 tw-z-10 tw-flex tw-items-center tw-justify-end tw-border-b tw-border-[#00f0ff]/25 tw-bg-[#041d2c]/55 tw-px-5 tw-py-4 tw-pl-16 tw-backdrop-blur-xl"
	>
		<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-[#00f0ff]/80">
			COMMAND_CONSOLE
		</span>
	</div>

	<div class="tw-space-y-6 tw-p-5 tw-pt-2">
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				ROUTE_SHAPE
			</p>
			<div class="tw-flex tw-gap-2">
				<button
					type="button"
					class="{segBtn} {engine.routeDrawKind === 'curve' ? segBtnOn : ''}"
					onclick={(e) => {
						e.stopPropagation();
						engine.routeDrawKind = 'curve';
					}}
					aria-pressed={engine.routeDrawKind === 'curve'}
				>
					CURVE
				</button>
				<button
					type="button"
					class="{segBtn} {engine.routeDrawKind === 'cut' ? segBtnOn : ''}"
					onclick={(e) => {
						e.stopPropagation();
						engine.routeDrawKind = 'cut';
					}}
					aria-pressed={engine.routeDrawKind === 'cut'}
				>
					CUT
				</button>
			</div>
		</section>

		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				INK_COLOR
			</p>
			<div class="tw-flex tw-gap-2">
				{#each INK_PALETTE as color (color)}
					<button
						type="button"
						class="tw-h-7 tw-flex-1 tw-skew-x-[-12deg] tw-border tw-transition-all
							{engine.activeRouteColor === color
								? 'tw-scale-105 tw-border-white tw-shadow-[0_0_10px_var(--ink)]'
								: 'tw-border-white/25 hover:tw-border-[#00f0ff]/55'}"
						style="background:{color}; --ink:{color};"
						onclick={(e) => {
							e.stopPropagation();
							engine.activeRouteColor = color;
						}}
						aria-label="Route color {color}"
						aria-pressed={engine.activeRouteColor === color}
					></button>
				{/each}
			</div>
		</section>

		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				VIEW
			</p>
			<div class="tw-flex tw-flex-col tw-gap-2">
				<button
					type="button"
					class="{segBtn} {engine.showLabels ? segBtnOn : ''}"
					onclick={(e) => {
						e.stopPropagation();
						engine.showLabels = !engine.showLabels;
					}}
					aria-pressed={engine.showLabels}
				>
					SHOW_LABELS
				</button>
				<button
					type="button"
					class="tw-w-full tw-rounded-lg tw-border tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-transition-colors
						{engine.isHolotableMode
							? 'tw-border-[#ff003c]/50 tw-bg-[#ff003c]/10 tw-text-[#ff003c]'
							: 'tw-border-white/10 tw-bg-black/20 tw-text-white/60 hover:tw-border-[#ff003c]/40 hover:tw-text-[#ff003c]'}"
					onclick={(e) => {
						e.stopPropagation();
						engine.isHolotableMode = !engine.isHolotableMode;
					}}
					aria-pressed={engine.isHolotableMode}
				>
					3D_HOLOTABLE
				</button>
			</div>
		</section>

		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				BOARD_OPS
			</p>
			<div class="tw-flex tw-flex-col tw-gap-2">
				<button
					type="button"
					class={segBtn}
					onclick={(e) => {
						e.stopPropagation();
						engine.recallBench();
					}}
				>
					RECALL_BENCH
				</button>
				<button
					type="button"
					class="tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/20 tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/60 tw-transition-colors hover:tw-border-[#ff003c]/40 hover:tw-text-[#ff003c]"
					onclick={(e) => {
						e.stopPropagation();
						engine.clearRoutesOnly();
					}}
				>
					CLR_ROUTES
				</button>
			</div>
		</section>

		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				ROSTER / BENCH
			</p>
			<div
				class="tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-[#00f0ff]/15 tw-bg-black/15 tw-px-4 tw-py-6"
			>
				<span class="tw-font-mono tw-text-[8px] tw-text-white/30">ROSTER_PANEL · NEXT_EPOCH</span>
			</div>
		</section>

		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				TACTIC_BANK
			</p>
			<div
				class="tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-[#00f0ff]/15 tw-bg-black/15 tw-px-4 tw-py-6"
			>
				<span class="tw-font-mono tw-text-[8px] tw-text-white/30">LOAD · SAVE · NEXT_EPOCH</span>
			</div>
		</section>
	</div>
</div>
