<script>
	let { showLabels = false } = $props();

	/** Flat SIEM data-cyan stroke — no glow (VS-3b). */
	const NEON = '#14b8a6';
</script>

<!--
  SIEM pitch geometry — flat data-cyan strokes, no drop-shadow or glass fill.
-->

<!-- Subtle grid backplate -->
<rect width="100%" height="100%" fill="url(#cyber-grid)" mask="url(#grid-mask)" />

<!-- Pitch boundary -->
<rect
	x="2"
	y="2"
	width="1596"
	height="896"
	fill="rgba(20, 184, 166, 0.02)"
	stroke={NEON}
	stroke-width="1.5"
/>

<!-- Halfway line -->
<line x1="800" y1="4" x2="800" y2="896" stroke={NEON} stroke-width="1.5" />

<!-- Center circle + center spot -->
<circle cx="800" cy="450" r="148" fill="none" stroke={NEON} stroke-width="1.5" />
<circle cx="800" cy="450" r="6" fill={NEON} />

<!-- Penalty boxes -->
<rect x="4" y="183" width="248" height="534" fill="none" stroke={NEON} stroke-width="1.5" />
<rect x="1348" y="183" width="248" height="534" fill="none" stroke={NEON} stroke-width="1.5" />

<!-- Six-yard boxes -->
<rect x="4" y="329" width="82" height="242" fill="none" stroke={NEON} stroke-width="1.5" />
<rect x="1514" y="329" width="82" height="242" fill="none" stroke={NEON} stroke-width="1.5" />

<!-- PK spots -->
<circle cx="172" cy="450" r="5" fill={NEON} />
<circle cx="1428" cy="450" r="5" fill={NEON} />

<!-- Penalty arcs -->
<path d="M 252 336 A 139 139 0 0 1 252 564" fill="none" stroke={NEON} stroke-width="1.5" />
<path d="M 1348 336 A 139 139 0 0 0 1348 564" fill="none" stroke={NEON} stroke-width="1.5" />

<!-- LEFT GOAL -->
<g aria-label="Left goal anchors">
	<line x1="2" y1="402" x2="2" y2="498" stroke={NEON} stroke-width="2" />
	<circle cx="2" cy="402" r="4" fill={NEON} />
	<circle cx="2" cy="498" r="4" fill={NEON} />
</g>

<!-- RIGHT GOAL -->
<g aria-label="Right goal anchors">
	<line x1="1598" y1="402" x2="1598" y2="498" stroke={NEON} stroke-width="2" />
	<circle cx="1598" cy="402" r="4" fill={NEON} />
	<circle cx="1598" cy="498" r="4" fill={NEON} />
</g>
