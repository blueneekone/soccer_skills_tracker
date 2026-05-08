<!--
  VanguardCard.svelte
  ───────────────────
  Stark-tech digital collectible — a 5:7 obsidian-glass player card with a
  gyroscopic parallax tilt, holographic-foil glare, Scout's Six data grid,
  VAN RATING hero number, and an XP progress bar.

  Strict Svelte 5 runes (`$props`, `$state`, `$derived`). Pure CSS — no
  WebGL, no Three.js, no external libs. All effects are GPU-accelerated
  via `transform`, `backdrop-filter`, and a `mix-blend-overlay` foil.

  Architecture
  ────────────
  • Wrapper (.vc-wrapper)
      ▸ Owns `onpointermove` / `onpointerleave` so events fire reliably
        regardless of how the inner card is rotated.
      ▸ Holds the aspect-locked footprint (5:7) and `max-w-sm` cap.
  • Card (.vc-card)
      ▸ Receives the perspective + rotateX/Y transform.
      ▸ While hovering: `transition: transform 0.12s ease-out` for a snappy
        gyro feel.
      ▸ On pointer-leave: `transition: transform 0.5s ease-out` so the
        card glides back to flat instead of snapping.
  • Foil (.vc-foil)
      ▸ Sits absolute on top of all content with `mix-blend-mode: overlay`.
      ▸ Background is a radial gradient anchored to the cursor's normalised
        position over the card → simulates a moving specular highlight.
  • Edge glow (.vc-edge)
      ▸ Inset shadow tinted by the team accent (cyan friendly / Ares red).

  Tilt math
  ─────────
  Let (nx, ny) be cursor offset from card centre, normalised −1…1.
    rotateX =  ny * MAX_TILT     (cursor below centre → bottom toward viewer)
    rotateY = -nx * MAX_TILT     (cursor right of centre → right edge toward viewer)
  This is the "tilt-toward-cursor" feel used by Apple product cards and
  Marvel Snap, not the inverse "peer-around" feel.
-->
<script>
	import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte';
	import VanguardPrism from './VanguardPrism.svelte';

	// ── External API ──────────────────────────────────────────────────────
	// Identity fields (name, jersey, position) are props because they come
	// from the player profile — the engine doesn't own them.
	// XP, tier, Scout's Six, and derived colours are fully owned by the
	// ArmoryEngine instance below.
	//
	// Callers can seed the engine via `initialXP` and `initialStats`; after
	// that, call `armory.awardXP(…)` / `armory.updateStat(…)` directly and
	// the card re-renders automatically.
	/**
	 * @type {{
	 *   engine?: import('$lib/states/ArmoryEngine.svelte').ArmoryEngine;
	 *   name?: string;
	 *   classification?: string;
	 *   number?: string | number;
	 *   side?: 'friendly' | 'opponent';
	 *   initialXP?: number;
	 *   initialStats?: import('$lib/states/ArmoryEngine.svelte').ScoutsSix;
	 *   maxTiltDeg?: number;
	 *   class?: string;
	 * }}
	 */
	let {
		engine: externalEngine = undefined,
		name = 'ALEX HUNTER',
		classification = 'FORWARD',
		number = '—',
		side = 'friendly',
		initialXP = 10_240,
		initialStats = {
			PAC: '21.4 MPH',
			ACC: '1.52s',
			AGI: '4.12s',
			STM: 'Lvl 18',
			POW: '32 in',
			VAN: '94',
		},
		maxTiltDeg = 10,
		class: extraClass = ''
	} = $props();

	// ── Engine instantiation ──────────────────────────────────────────────
	// Self-contained fallback for standalone / demo use. When a parent
	// (e.g. ArmoryDashboard) owns the player's engine and passes it via the
	// `engine` prop, `armory` proxies to that external instance so the
	// roster drives the card.  `$derived` re-evaluates whenever `externalEngine`
	// changes, keeping reactivity intact in both modes.
	const _selfEngine = new ArmoryEngine({ totalXP: initialXP, playerStats: initialStats });
	const armory = $derived(externalEngine ?? _selfEngine);

	// ── Derived accent colour ─────────────────────────────────────────────
	// Opponents are always Ares Red regardless of tier — their tier is the
	// coach's assessment, not the gamification track.
	// Friendly players use the tier's accent so the card visually evolves:
	//   ROOKIE → gray, PRO → violet, ELITE → amber, VANGUARD → cyan.
	const ACCENT_OPPONENT = '#ff2a2a';
	const accent = $derived(
		side === 'opponent' ? ACCENT_OPPONENT : armory.currentTier.accent
	);

	// ── Scout's Six display array ─────────────────────────────────────────
	// VAN is the hero number shown in the top-right block, not in the grid.
	// Object.entries preserves insertion order (ES2015+), so the grid always
	// reads PAC → ACC → AGI → STM → POW regardless of hydration order.
	const scoutSix = $derived(
		Object.entries(armory.playerStats)
			.filter(([key]) => key !== 'VAN')
			.map(([label, value]) => ({ label, value }))
	);

	// Parsed VAN rating for the hero number. Falls back to 0 while loading.
	const vanRating = $derived(parseInt(armory.playerStats.VAN, 10) || 0);

	// ── Gyroscopic tilt physics (UNTOUCHED) ──────────────────────────────
	// All pointer state, tilt math, foil gradient, and card transform logic
	// is isolated below this comment. Nothing above modifies it.
	let isHover = $state(false);
	let nx = $state(0);
	let ny = $state(0);
	let glareX = $state(50);
	let glareY = $state(50);

	const tiltX = $derived(ny * maxTiltDeg);
	const tiltY = $derived(-nx * maxTiltDeg);

	const cardTransform = $derived(
		`perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`
	);

	const cardTransition = $derived(
		isHover ? 'transform 0.12s ease-out' : 'transform 0.5s ease-out'
	);

	const foilBackground = $derived(
		`radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 25%, transparent 55%)`
	);

	function onPointerMove(/** @type {PointerEvent} */ ev) {
		const target = /** @type {HTMLElement} */ (ev.currentTarget);
		const rect = target.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const relX = ev.clientX - rect.left;
		const relY = ev.clientY - rect.top;
		nx = Math.max(-1, Math.min(1, (relX / rect.width) * 2 - 1));
		ny = Math.max(-1, Math.min(1, (relY / rect.height) * 2 - 1));
		glareX = Math.max(0, Math.min(100, (relX / rect.width) * 100));
		glareY = Math.max(0, Math.min(100, (relY / rect.height) * 100));
		isHover = true;
	}

	function onPointerLeave() {
		nx = 0;
		ny = 0;
		glareX = 50;
		glareY = 50;
		isHover = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="vc-wrapper tw-relative tw-w-full tw-aspect-[5/7] tw-max-w-sm tw-select-none {extraClass}"
	style:--vc-accent={accent}
	onpointermove={onPointerMove}
	onpointerleave={onPointerLeave}
>
	<div
		class="vc-card tw-absolute tw-inset-0 tw-rounded-2xl tw-border tw-border-white/10 tw-bg-[#010409]/80 tw-backdrop-blur-xl tw-overflow-hidden"
		style:transform={cardTransform}
		style:transition={cardTransition}
	>
		<!--
		  Edge glow: an inset shadow tinted by the accent paints a soft halo
		  inside the card's border. Two layers — a tight inner ring and a
		  wider bleed — sell the Stark-glass depth without a halo bloom hack.
		-->
		<div
			class="vc-edge tw-pointer-events-none tw-absolute tw-inset-0 tw-rounded-2xl"
			aria-hidden="true"
		></div>

		<!-- Faint diagonal HUD scanline grid (pure CSS, no images). -->
		<div
			class="vc-scanlines tw-pointer-events-none tw-absolute tw-inset-0 tw-opacity-[0.06]"
			aria-hidden="true"
		></div>

		<!-- ── Card content ─────────────────────────────────────────────── -->
		<div class="tw-relative tw-z-10 tw-flex tw-h-full tw-flex-col tw-p-5 tw-font-mono tw-text-white">
			<!--
			  HEADER — two columns:
			  Left  : classification label + player name + tier line.
			  Right : VAN RATING (hero number) + jersey badge.
			  The VAN RATING is the dominant visual anchor; it must pop at
			  a glance without the recruiter needing to read the name first.
			-->
			<header class="tw-flex tw-items-start tw-justify-between tw-gap-3">
				<!-- Left column -->
				<div class="tw-min-w-0 tw-flex-1">
					<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.32em] tw-text-white/35">
						OPERATIVE · {classification}
					</p>
					<h2
						class="tw-mt-1 tw-truncate tw-text-[15px] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-white"
					>
						{name}
					</h2>
					<!-- Tier line immediately below the name -->
					<div class="tw-mt-2.5 tw-flex tw-items-baseline tw-gap-2">
						<span
							class="tw-text-[22px] tw-font-bold tw-leading-none tw-tracking-[0.06em]"
							style:color={accent}
							style:text-shadow="0 0 12px {accent}55"
						>
							{armory.currentTier.label}
						</span>
						<span
							class="tw-h-px tw-flex-1 tw-translate-y-[-2px]"
							style:background="linear-gradient(to right, {accent}99, transparent)"
							aria-hidden="true"
						></span>
					</div>
					<p class="tw-mt-0.5 tw-text-[7px] tw-uppercase tw-tracking-[0.36em] tw-text-white/30">
						TIER · CLEARANCE LVL
					</p>
				</div>

				<!-- Right column: VAN RATING hero block -->
				<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-end tw-gap-1">
					<!--
					  The hero number. drop-shadow tints the text with cyan
					  bloom. tabular-nums locks glyph widths so the number
					  doesn't shift when the card is tilted and re-renders.
					-->
					<span
						class="tw-text-4xl tw-font-bold tw-leading-none tw-tabular-nums"
						style:color={accent}
						style:filter="drop-shadow(0 0 8px {accent}cc)"
					>
						{vanRating}
					</span>
					<span class="tw-text-[7px] tw-uppercase tw-tracking-[0.45em] tw-text-white/35">
						VAN
					</span>
					<!-- Jersey badge sits below the rating -->
					<span
						class="tw-mt-1 tw-rounded-sm tw-border tw-px-2 tw-py-0.5 tw-text-[8px] tw-tracking-[0.22em] tw-uppercase tw-tabular-nums"
						style:color={accent}
						style:border-color="{accent}55"
						style:background="{accent}10"
					>
						#{number}
					</span>
				</div>
			</header>

		<!--
		  VANGUARD PRISM — dynamic hexagonal stat radar.
		  Centred between the header and the Scout's Six grid.
		  Size 96px keeps it compact inside the 5:7 card footprint.
		  accent is driven by the tier / side so the prism colour evolves
		  as the player progresses (ROOKIE gray → VANGUARD cyan).
		-->
		<div class="tw-flex tw-justify-center tw-mt-3">
			<VanguardPrism
				stats={armory.playerStats}
				accent={accent}
				size={96}
				showLabels={false}
				animated={true}
			/>
		</div>

		<!--
		  SCOUT'S SIX — 3-column grid of Scout's Six metrics.

			  `tw-divide-x tw-divide-white/10` draws a 1px hairline between
			  every pair of adjacent columns. We zero out horizontal gap so
			  the dividers sit flush; vertical spacing is handled by padding
			  inside each cell. Row-separator is a full-width border-top on
			  the 4th+ cell (nth-child(n+4) via the vc-row-break helper
			  class below) to separate the two rows cleanly.
			-->
			<section
				class="tw-mt-6 tw-grid tw-grid-cols-3 tw-divide-x tw-divide-white/10 tw-w-full"
				aria-label="Scout's Six performance metrics"
			>
				{#each scoutSix as metric, i (metric.label)}
					<div
						class="vc-stat tw-flex tw-flex-col tw-items-center tw-py-3 tw-px-2"
						class:vc-stat--row2={i >= 3}
					>
						<span
							class="tw-text-[10px] tw-tracking-widest tw-text-gray-500 tw-font-mono tw-mb-1 tw-uppercase"
						>
							{metric.label}
						</span>
						<span class="tw-text-lg tw-font-bold tw-text-white tw-tracking-wide tw-tabular-nums">
							{metric.value}
						</span>
					</div>
				{/each}
			</section>

			<!-- Spacer -->
			<div class="tw-flex-1"></div>

			<!-- XP BAR -->
			<footer class="tw-mt-4">
				<div
					class="tw-mb-1.5 tw-flex tw-items-center tw-justify-between tw-text-[8px] tw-uppercase tw-tracking-[0.3em] tw-text-white/40"
				>
					<span>XP</span>
					<span class="tw-tabular-nums tw-text-white/60">
						{armory.totalXP.toLocaleString()} / {armory.nextTierFloor.toLocaleString()}
					</span>
				</div>
				<div
					class="tw-relative tw-h-1 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10"
				>
					<!--
					  `transition-all duration-500` smoothly animates the bar
					  whenever awardXP() writes to the engine's $state. The
					  width is clamped by the engine to [0, 100].
					-->
					<div
						class="tw-absolute tw-inset-y-0 tw-left-0 tw-rounded-full tw-transition-all tw-duration-500"
						style:width="{armory.progressToNextTier}%"
						style:background={accent}
						style:box-shadow="0 0 10px {accent}, 0 0 4px {accent}"
					></div>
				</div>
				<p class="tw-mt-2 tw-text-[7px] tw-uppercase tw-tracking-[0.4em] tw-text-white/30">
					NEXT TIER · <span style:color="{accent}99">{armory.nextTier?.label ?? 'MAX'}</span>
				</p>
			</footer>
		</div>

		<!--
		  Holographic foil — radial highlight tracking the cursor; sits above
		  all content with `mix-blend-overlay` so it "lights up" whatever it
		  passes over (lighter on dark glass, brighter against neon edges).
		-->
		<div
			class="vc-foil tw-pointer-events-none tw-absolute tw-inset-0"
			style:background={foilBackground}
			aria-hidden="true"
		></div>
	</div>
</div>

<style>
	/*
	 * Edge-glow pseudo: tight inner ring (1px) + soft outer bleed.
	 * Both shadows live in --vc-accent so the same component flips between
	 * cyan and Ares red purely from the parent passing `side="opponent"`.
	 */
	.vc-edge::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--vc-accent, #00f0ff) 35%, transparent),
			inset 0 0 24px color-mix(in srgb, var(--vc-accent, #00f0ff) 18%, transparent),
			0 0 32px color-mix(in srgb, var(--vc-accent, #00f0ff) 16%, transparent);
		pointer-events: none;
	}

	.vc-foil {
		mix-blend-mode: overlay;
	}

	/*
	 * Scanline texture: 1px diagonal lines at 45° rendered with a tiny
	 * repeating linear gradient. Cheap; no images.
	 */
	.vc-scanlines {
		background-image: repeating-linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.5) 0,
			rgba(255, 255, 255, 0.5) 1px,
			transparent 1px,
			transparent 4px
		);
	}

	/*
	 * Scout's Six grid row separator.
	 * `vc-stat--row2` marks cells in the second row (index ≥ 3). The top
	 * border spans the full cell width; combined with `divide-x` on the
	 * parent grid, this gives every interior edge a hairline — column lines
	 * between cells in the same row, a row line between the two rows.
	 */
	.vc-stat--row2 {
		border-top: 1px solid rgba(255, 255, 255, 0.10);
	}

	.vc-card {
		will-change: transform;
		transform-style: preserve-3d;
		/*
		 * `transition` is set inline so it can flip between the active
		 * 0.12s gyro and the 0.5s snap-back without re-attaching listeners.
		 */
	}

	@media (prefers-reduced-motion: reduce) {
		.vc-card {
			transition: none !important;
			transform: none !important;
		}
		.vc-foil {
			background: transparent !important;
		}
	}
</style>
