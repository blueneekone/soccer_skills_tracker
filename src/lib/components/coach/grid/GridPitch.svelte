<script>
	let { showLabels = false } = $props();

	/** Razor-sharp neon-cyan stroke spec applied uniformly to every pitch line. */
	const NEON = '#00f0ff';
	const NEON_GLOW = 'filter: drop-shadow(0 0 4px #00f0ff);';
</script>

<!--
  Holographic Glass Pitch — translucent fill, razor-sharp neon-cyan strokes
  (1.5px) with a CSS drop-shadow halo. The physical Projector Base wrapping
  this SVG provides the frame; we no longer rely on an SVG mask vignette.
-->

<!-- Subtle cyber-grid backplate (kept faint so the projector base reads through). -->
<rect width="100%" height="100%" fill="url(#cyber-grid)" mask="url(#grid-mask)" />

<!-- Holographic glass fill — translucent cyan plate. -->
<rect
	x="2"
	y="2"
	width="1596"
	height="896"
	fill="rgba(0,240,255,0.02)"
	stroke={NEON}
	stroke-width="1.5"
	style={NEON_GLOW}
/>

<!-- Halfway line. -->
<line x1="800" y1="4" x2="800" y2="896" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />

<!-- Center circle + crisp center spot. -->
<circle cx="800" cy="450" r="148" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />
<circle cx="800" cy="450" r="6" fill={NEON} style={NEON_GLOW} />

<!-- Penalty boxes. -->
<rect x="4" y="183" width="248" height="534" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />
<rect x="1348" y="183" width="248" height="534" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />

<!-- Six-yard boxes. -->
<rect x="4" y="329" width="82" height="242" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />
<rect x="1514" y="329" width="82" height="242" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />

<!-- PK spots. -->
<circle cx="172" cy="450" r="5" fill={NEON} style={NEON_GLOW} />
<circle cx="1428" cy="450" r="5" fill={NEON} style={NEON_GLOW} />

<!-- Penalty arcs. -->
<path d="M 252 336 A 139 139 0 0 1 252 564" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />
<path d="M 1348 336 A 139 139 0 0 0 1348 564" fill="none" stroke={NEON} stroke-width="1.5" style={NEON_GLOW} />

<!--
  GOAL ANCHORS — SVG layer: only the solid goal-line face and glowing post
  markers remain here. The 3D cage walls (back net + top net) are CSS HTML
  planes in TacticalPitchBoard.svelte that pop up in holotable mode. Keeping
  the SVG anchors ensures the goal posts are always visible and correctly
  positioned in SVG user-unit space regardless of 3D state.
  Goal width ≈ 96px (7.32m / 68m × 896px), centered at y=450 → y=402–498.
-->

<!-- LEFT GOAL — face line + post markers -->
<g aria-label="Left goal anchors">
	<line x1="2" y1="402" x2="2" y2="498" stroke={NEON} stroke-width="2" style={NEON_GLOW} />
	<circle cx="2" cy="402" r="4" fill={NEON} style={NEON_GLOW} />
	<circle cx="2" cy="498" r="4" fill={NEON} style={NEON_GLOW} />
</g>

<!-- RIGHT GOAL — face line + post markers -->
<g aria-label="Right goal anchors">
	<line x1="1598" y1="402" x2="1598" y2="498" stroke={NEON} stroke-width="2" style={NEON_GLOW} />
	<circle cx="1598" cy="402" r="4" fill={NEON} style={NEON_GLOW} />
	<circle cx="1598" cy="498" r="4" fill={NEON} style={NEON_GLOW} />
</g>
