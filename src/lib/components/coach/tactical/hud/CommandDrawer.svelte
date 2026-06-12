<script>
	/** War-room engine — alias `engine` for drawer state writes (Svelte 5 runes getters/setters on model). */
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model: engine } = $props();

	const INK_PALETTE = /** @type {const} */ (['#14b8a6', '#ef4444', '#d97706', '#ffffff']);
</script>

<!-- Z2 squad / drill sidebar -->
<div
	class="coach-tac-z2-drawer-wrap"
	role="complementary"
	aria-label="Command drawer"
>
	<div
		class="coach-tac-z2-drawer"
		style="transform: translateX({engine.isDrawerOpen ? '0%' : '100%'});"
		aria-hidden={!engine.isDrawerOpen}
	>
		<div class="coach-tac-z2-header">
			<h2 class="coach-tac-z2-title">[ COMMAND_CONSOLE ]</h2>
		</div>

		<div class="tw-space-y-6 tw-p-5 tw-pt-2">
			<section>
				<p class="coach-tac-z2-section-label">ROUTE_SHAPE</p>
				<div class="tw-flex tw-gap-2">
					<button
						type="button"
						class="coach-tac-z2-seg {engine.routeDrawKind === 'curve' ? 'coach-tac-z2-seg--curve-active' : ''}"
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
						class="coach-tac-z2-seg {engine.routeDrawKind === 'cut' ? 'coach-tac-z2-seg--active' : ''}"
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
				<p class="coach-tac-z2-section-label">INK_COLOR</p>
				<div class="tw-flex tw-gap-2.5">
					{#each INK_PALETTE as color (color)}
						<button
							type="button"
							class="coach-tac-z2-ink {engine.activeRouteColor === color ? 'coach-tac-z2-ink--active' : ''}"
							style="--ink-color: {color}; background: {color};"
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
				<p class="coach-tac-z2-section-label">BOARD_OPS</p>
				<div class="tw-flex tw-flex-col tw-gap-2">
					<button
						type="button"
						class="coach-tac-z2-seg"
						onclick={(e) => {
							e.stopPropagation();
							engine.recallBench();
						}}
					>
						RECALL_BENCH
					</button>
					<button
						type="button"
						class="coach-tac-z2-seg coach-tac-z2-seg--danger"
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
				<p class="coach-tac-z2-section-label">ROSTER / BENCH</p>
				<div class="coach-tac-z2-placeholder">
					<span>ROSTER_PANEL · NEXT_EPOCH</span>
				</div>
			</section>

			<section>
				<p class="coach-tac-z2-section-label">TACTIC_BANK</p>
				<div class="coach-tac-z2-placeholder">
					<span>LOAD · SAVE · NEXT_EPOCH</span>
				</div>
			</section>
		</div>
	</div>
</div>
