<script>
	/** War-room engine — alias `engine` for drawer state writes (Svelte 5 runes getters/setters on model). */
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model: engine } = $props();

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const segBtn =
		'tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/20 tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/60 tw-transition-colors hover:tw-border-[#00f0ff]/40 hover:tw-text-[#00f0ff]';
	const segBtnOn = 'tw-border-[#00f0ff]/55 !tw-bg-[#00f0ff]/12 !tw-text-[#00f0ff]';
	/** Route-shape palette: curve = Amber, cut = Deep Purple. */
	const curveBtnOn =
		'tw-text-[#ffaa00] tw-bg-[#ffaa00]/15 tw-border-[#ffaa00]/60 tw-shadow-[0_0_15px_rgba(255,170,0,0.4)] tw-drop-shadow-[0_0_4px_currentColor]';
	const cutBtnOn =
		'tw-text-[#ff00ff] tw-bg-[#ff00ff]/15 tw-border-[#ff00ff]/60 tw-shadow-[0_0_15px_rgba(255,0,255,0.4)] tw-drop-shadow-[0_0_4px_currentColor]';
</script>

<!--
  STARK-TECH DRAWER:
    Outer wrapper: fixed-position, pointer-events-none so the Tron pitch stays
    click-through outside the pane. tw-overflow-hidden clips the slide-out pane.
    Inner glass pane: absolute, pointer-events-auto, slides on the X axis via a
    direct ternary on `engine.isDrawerOpen`. Class binding is on a single line
    so Svelte parses the ternary cleanly.
-->
<div
	class="tw-fixed tw-top-0 tw-right-0 tw-h-full tw-w-[350px] tw-z-[9999] tw-pointer-events-none tw-overflow-hidden"
	role="complementary"
	aria-label="Command drawer"
>
	<!--
	  Inline transform is intentional: Tailwind's tw-translate-x-{0|full} rules
	  exist in the cascade (verified via runtime instrumentation) but resolve to
	  computed transform "none" because the project's Tailwind config doesn't
	  emit the transform shorthand alongside the --tw-translate-x variable.
	  An inline style bypasses the cascade entirely and guarantees the slide.
	-->
	<div
		class="tw-absolute tw-inset-0 tw-bg-[#02060d]/85 tw-backdrop-blur-[50px] tw-border-l tw-border-[#00f0ff]/20 tw-shadow-[-20px_0_50px_-10px_rgba(0,240,255,0.15)] tw-pointer-events-auto tw-overflow-y-auto tw-overflow-x-hidden tw-transition-transform tw-duration-500 tw-ease-[cubic-bezier(0.16,1,0.3,1)]"
		style="transform: translateX({engine.isDrawerOpen ? '0%' : '100%'});"
		aria-hidden={!engine.isDrawerOpen}
	>
		<!-- HUD greeble — top-edge laser scanner. -->
		<div
			class="tw-h-[1px] tw-w-full tw-bg-gradient-to-r tw-from-transparent tw-via-[#00f0ff]/50 tw-to-transparent tw-shadow-[0_0_10px_rgba(0,240,255,1)]"
			aria-hidden="true"
		></div>
		<div
			class="tw-pointer-events-none tw-absolute tw-inset-y-0 tw-left-0 tw-w-px tw-bg-gradient-to-b tw-from-transparent tw-via-[#00f0ff]/45 tw-to-transparent"
			aria-hidden="true"
		></div>

		<div
			class="tw-sticky tw-top-0 tw-z-10 tw-flex tw-items-center tw-border-b tw-border-[#00f0ff]/20 tw-bg-[#040f16]/70 tw-px-5 tw-py-4 tw-backdrop-blur-xl"
		>
			<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#ffaa00]">
				[ COMMAND_CONSOLE ]
			</h2>
		</div>

		<div class="tw-space-y-6 tw-p-5 tw-pt-2">
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/35">
				ROUTE_SHAPE
			</p>
			<div class="tw-flex tw-gap-2">
				<button
					type="button"
					class="{segBtn} {engine.routeDrawKind === 'curve' ? curveBtnOn : ''}"
					onclick={(e) => {
						e.stopPropagation();
						engine.routeDrawKind = 'curve';
					}}
					aria-pressed={engine.routeDrawKind === 'curve'}
				>
					[ CURVE ]
				</button>
				<button
					type="button"
					class="{segBtn} {engine.routeDrawKind === 'cut' ? cutBtnOn : ''}"
					onclick={(e) => {
						e.stopPropagation();
						engine.routeDrawKind = 'cut';
					}}
					aria-pressed={engine.routeDrawKind === 'cut'}
				>
					[ CUT ]
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
</div>
