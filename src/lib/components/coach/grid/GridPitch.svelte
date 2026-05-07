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
  HOLO-GOAL CAGES — 3D cage illusion in 2D SVG.

  Goal dimensions (proportional to 1600×900 viewBox representing 105m×68m pitch):
    · Goal width ≈ 96px  (7.32m / 68m × 896px), centered at y=450 → y=402–y=498
    · Cage depth ≈ 42px  (≈3.2m, drawn INTO the pitch from the goal line so the
      geometry stays inside the viewBox; with the pitch tilted rotateX(55deg) on
      the projector base, this top-down box reads as a 3D cage rising from the
      table surface toward the viewer)

  The fill gives the cage a translucent "digital net" volume.
  stroke-dasharray="2 3" on the side rails / back wall / net lines simulates mesh.
  Solid "posts" at the front corners are the glowing goal-post markers.
  CSS 3D transforms (transform-style, rotateX) are not supported inside SVG;
  the 3D effect is achieved entirely through manual 2D coordinate layout.
-->

<!-- LEFT HOLO-GOAL (goal line at x=2, cage depth goes right to x=44) -->
<g aria-label="Left goal cage">
	<!-- Translucent cage volume fill. -->
	<rect x="2" y="402" width="42" height="96" fill="rgba(0,240,255,0.08)" stroke="none" />
	<!-- Goal-line face (solid — this IS the goal opening, facing the center of the pitch). -->
	<line x1="2" y1="402" x2="2" y2="498" stroke={NEON} stroke-width="2" style={NEON_GLOW} />
	<!-- Top + bottom rails (dashed — sides of the cage going into the pitch). -->
	<line x1="2" y1="402" x2="44" y2="402" stroke={NEON} stroke-width="1" stroke-dasharray="2 3" />
	<line x1="2" y1="498" x2="44" y2="498" stroke={NEON} stroke-width="1" stroke-dasharray="2 3" />
	<!-- Back wall (dashed). -->
	<line x1="44" y1="402" x2="44" y2="498" stroke={NEON} stroke-width="1" stroke-dasharray="2 3" />
	<!-- Net verticals (very faint mesh lines inside the cage). -->
	<line x1="17" y1="402" x2="17" y2="498" stroke={NEON} stroke-width="0.5" stroke-dasharray="2 6" opacity="0.35" />
	<line x1="31" y1="402" x2="31" y2="498" stroke={NEON} stroke-width="0.5" stroke-dasharray="2 6" opacity="0.35" />
	<!-- Goal post markers (bright neon circles at the two front corners). -->
	<circle cx="2" cy="402" r="4" fill={NEON} style={NEON_GLOW} />
	<circle cx="2" cy="498" r="4" fill={NEON} style={NEON_GLOW} />
</g>

<!-- RIGHT HOLO-GOAL (goal line at x=1598, cage depth goes left to x=1556) -->
<g aria-label="Right goal cage">
	<!-- Translucent cage volume fill. -->
	<rect x="1556" y="402" width="42" height="96" fill="rgba(0,240,255,0.08)" stroke="none" />
	<!-- Goal-line face (solid). -->
	<line x1="1598" y1="402" x2="1598" y2="498" stroke={NEON} stroke-width="2" style={NEON_GLOW} />
	<!-- Top + bottom rails (dashed). -->
	<line x1="1556" y1="402" x2="1598" y2="402" stroke={NEON} stroke-width="1" stroke-dasharray="2 3" />
	<line x1="1556" y1="498" x2="1598" y2="498" stroke={NEON} stroke-width="1" stroke-dasharray="2 3" />
	<!-- Back wall (dashed). -->
	<line x1="1556" y1="402" x2="1556" y2="498" stroke={NEON} stroke-width="1" stroke-dasharray="2 3" />
	<!-- Net verticals. -->
	<line x1="1569" y1="402" x2="1569" y2="498" stroke={NEON} stroke-width="0.5" stroke-dasharray="2 6" opacity="0.35" />
	<line x1="1583" y1="402" x2="1583" y2="498" stroke={NEON} stroke-width="0.5" stroke-dasharray="2 6" opacity="0.35" />
	<!-- Goal post markers. -->
	<circle cx="1598" cy="402" r="4" fill={NEON} style={NEON_GLOW} />
	<circle cx="1598" cy="498" r="4" fill={NEON} style={NEON_GLOW} />
</g>
