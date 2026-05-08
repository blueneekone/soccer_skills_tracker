<script>
	/** War-room engine — alias `engine` for drawer state writes (Svelte 5 runes getters/setters on model). */
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model: engine } = $props();

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff2a2a', '#ffff00', '#ffffff']);

	const segBtn =
		'tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/20 tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/60 tw-transition-colors hover:tw-border-[#00f0ff]/40 hover:tw-text-[#00f0ff]';
	const segBtnOn = 'tw-border-[#00f0ff]/55 !tw-bg-[#00f0ff]/12 !tw-text-[#00f0ff]';
	/** Route-shape palette: curve = Amber, cut = Deep Purple. */
	const curveBtnOn =
		'tw-text-[#ffaa00] tw-bg-[#ffaa00]/15 tw-border-[#ffaa00]/60 tw-shadow-[0_0_15px_rgba(255,170,0,0.4)] tw-drop-shadow-[0_0_4px_currentColor]';
	const cutBtnOn =
		'tw-text-[#ff2a2a] tw-bg-[#ff2a2a]/15 tw-border-[#ff2a2a]/60 tw-shadow-[0_0_15px_rgba(255,42,42,0.4)] tw-drop-shadow-[0_0_4px_currentColor]';
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
			<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00ff00] tw-drop-shadow-[0_0_6px_#00ff00]">
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
			<!--
			  Stark-Tech instrument switches: angled glass squares with a 1px
			  border in the ink color, semi-transparent fill, white-to-transparent
			  glass sheen, and a neon glow that intensifies on the active swatch.
			  Background uses 8-digit hex (color + "22" ≈ 13% opacity) so the
			  glass effect reads through without the button looking painted.
			-->
			<div class="tw-flex tw-gap-2.5">
				{#each INK_PALETTE as color (color)}
					<button
						type="button"
						class="tw-relative tw-h-8 tw-w-8 tw-shrink-0 tw-skew-x-[-8deg] tw-rounded-sm tw-border tw-overflow-hidden tw-transition-all tw-duration-200 tw-cursor-pointer
							{engine.activeRouteColor === color
								? 'tw-scale-110 tw-shadow-[0_0_14px_var(--ink),inset_0_0_6px_rgba(255,255,255,0.06)]'
								: 'hover:tw-scale-105 hover:tw-shadow-[0_0_8px_var(--ink)]'}"
						style="border-color:{engine.activeRouteColor === color ? color : color + '60'}; background:{color}22; --ink:{color};"
						onclick={(e) => {
							e.stopPropagation();
							engine.activeRouteColor = color;
						}}
						aria-label="Route color {color}"
						aria-pressed={engine.activeRouteColor === color}
					>
						<!-- Glass sheen: top-left to transparent diagonal highlight -->
						<div
							class="tw-absolute tw-inset-0 tw-bg-gradient-to-br tw-from-white/25 tw-to-transparent tw-pointer-events-none"
							aria-hidden="true"
						></div>
					</button>
				{/each}
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
</div>
