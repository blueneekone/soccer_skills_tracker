<script>
	import { base } from '$app/paths';

	const taglines = ['The Player OS', 'The Club Command', 'The AI Coach'];

	let taglineIndex = $state(0);
	const activeTagline = $derived(taglines[taglineIndex]);

	$effect(() => {
		const id = setInterval(() => {
			taglineIndex = (taglineIndex + 1) % taglines.length;
		}, 2500);
		return () => clearInterval(id);
	});

	// Hex radar chart geometry
	const axes = [
		{ label: 'PII', value: 96 },
		{ label: 'RPG', value: 92 },
		{ label: 'AI',  value: 88 },
		{ label: 'XP',  value: 94 },
		{ label: 'EQ',  value: 85 },
		{ label: 'RL',  value: 91 },
	];

	const CX = 140;
	const CY = 140;
	const R  = 100;
	const INNER_RINGS = [0.25, 0.5, 0.75, 1];

	function polar(angleDeg, radius) {
		const rad = ((angleDeg - 90) * Math.PI) / 180;
		return {
			x: CX + radius * Math.cos(rad),
			y: CY + radius * Math.sin(rad),
		};
	}

	function hexPath(radiusFraction) {
		return axes
			.map((_, i) => {
				const { x, y } = polar(i * 60, R * radiusFraction);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
			})
			.join(' ') + 'Z';
	}

	const dataPath = axes
		.map((ax, i) => {
			const { x, y } = polar(i * 60, R * (ax.value / 100));
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(' ') + 'Z';

	function axisEnd(i) {
		return polar(i * 60, R * 1.05);
	}

	function labelPos(i) {
		return polar(i * 60, R * 1.24);
	}

	function valuePos(i) {
		return polar(i * 60, R * (axes[i].value / 100) - 14);
	}
</script>

<section class="hero" aria-label="SSTracker Nexus Command hero">
	<!-- Atmospheric glows -->
	<div class="hero__glow hero__glow--a" aria-hidden="true"></div>
	<div class="hero__glow hero__glow--b" aria-hidden="true"></div>

	<div class="hero__inner">
		<!-- ── Left copy ── -->
		<div class="hero__copy">
			<!-- Badge -->
			<span class="hero__badge">
				<span class="hero__badge-dot" aria-hidden="true"></span>
				NEXUS COMMAND · v5.0 ENTERPRISE
			</span>

			<!-- Headline -->
			<h1 class="hero__h1">
				SSTracker: The Ultimate Youth Sports Management &amp; Player OS
				<span class="hero__tagline" aria-live="polite">{activeTagline}</span>
			</h1>

			<!-- Sub-headline -->
			<p class="hero__sub">
				Zero-liability PII protection, real-life RPG mechanics, and reinforcement learning —
				engineered for the next generation of elite youth clubs.
			</p>

			<!-- CTAs -->
			<div class="hero__ctas">
				<a href="{base}/setup" class="hero__cta hero__cta--primary glass-panel">
					DEPLOY YOUR CLUB →
				</a>
				<a href="{base}/features" class="hero__cta hero__cta--ghost">
					EXPLORE PLATFORM
				</a>
			</div>

			<!-- Disclaimer -->
			<p class="hero__disclaimer">
				$0 base fee · COPPA 2.0 hardened · WebAuthn biometric consent
			</p>
		</div>

		<!-- ── Right hex visualization ── -->
		<div class="hero__hex-wrap" aria-label="Capability radar: PII 96, RPG 92, AI 88, XP 94, EQ 85, RL 91">
			<svg
				class="hero__hex-svg"
				viewBox="0 0 280 280"
				width="360"
				height="360"
				role="img"
				aria-hidden="true"
			>
				<!-- Outer ring spinner -->
				<g class="hex-ring-spin">
					<circle cx={CX} cy={CY} r={R * 1.38} fill="none" stroke="var(--vanguard-cyan)" stroke-width="0.5" stroke-dasharray="4 8" stroke-opacity="0.35" />
				</g>

				<!-- Grid rings -->
				{#each INNER_RINGS as frac (frac)}
					<path
						d={hexPath(frac)}
						fill="none"
						stroke="var(--vanguard-border)"
						stroke-width={frac === 1 ? 1 : 0.5}
						stroke-opacity={frac === 1 ? 0.55 : 0.25}
					/>
				{/each}

				<!-- Axis spokes -->
			{#each axes as _, i (i)}
				{@const end = axisEnd(i)}
					<line
						x1={CX} y1={CY}
						x2={end.x} y2={end.y}
						stroke="var(--vanguard-border)"
						stroke-width="0.5"
						stroke-opacity="0.35"
					/>
				{/each}

				<!-- Data polygon fill -->
				<path d={dataPath} fill="var(--vanguard-cyan)" fill-opacity="0.08" stroke="none" />

				<!-- Data polygon stroke -->
				<path d={dataPath} fill="none" stroke="var(--vanguard-cyan)" stroke-width="1.5" stroke-opacity="0.9" stroke-linejoin="round" />

			<!-- Axis dots + value labels -->
			{#each axes as ax, i (ax.label + '-dot')}
					{@const dot  = polar(i * 60, R * (ax.value / 100))}
					{@const vpos = valuePos(i)}
					<circle cx={dot.x} cy={dot.y} r="3.5" fill="var(--vanguard-cyan)" fill-opacity="0.9" />
					<text
						x={vpos.x}
						y={vpos.y}
						text-anchor="middle"
						dominant-baseline="middle"
						font-family="'JetBrains Mono', monospace"
						font-size="6"
						fill="var(--vanguard-cyan)"
						fill-opacity="0.7"
					>{ax.value}</text>
				{/each}

			<!-- Axis labels -->
			{#each axes as ax, i (ax.label + '-label')}
					{@const lp = labelPos(i)}
					<text
						x={lp.x}
						y={lp.y}
						text-anchor="middle"
						dominant-baseline="middle"
						font-family="'JetBrains Mono', monospace"
						font-size="9"
						font-weight="700"
						letter-spacing="0.08em"
						fill="white"
						fill-opacity="0.82"
					>{ax.label}</text>
				{/each}

				<!-- Center OS badge -->
				<circle cx={CX} cy={CY} r="22" fill="var(--vanguard-glass, rgba(10,10,30,0.6))" stroke="var(--vanguard-cyan)" stroke-width="1" stroke-opacity="0.6" />
				<text
					x={CX}
					y={CY}
					text-anchor="middle"
					dominant-baseline="middle"
					font-family="'JetBrains Mono', monospace"
					font-size="13"
					font-weight="900"
					letter-spacing="0.12em"
					fill="var(--vanguard-cyan)"
				>OS</text>
			</svg>
		</div>
	</div>

	<!-- Scroll cue -->
	<div class="hero__scroll-cue" aria-hidden="true">
		<span class="hero__scroll-line"></span>
		<span class="hero__scroll-label">SCROLL</span>
	</div>
</section>

<style>
	/* ── Layout ── */
	.hero {
		position: relative;
		min-height: 100dvh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: clamp(5rem, 10vw, 8rem) clamp(1rem, 5vw, 3rem);
		font-family: 'JetBrains Mono', monospace;
	}

	.hero__inner {
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: clamp(2rem, 5vw, 5rem);
		flex-wrap: wrap;
	}

	.hero__copy {
		flex: 1;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ── Badge ── */
	.hero__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		letter-spacing: 0.18em;
		border: 1px solid var(--vanguard-border);
		border-radius: 9999px;
		padding: 4px 14px;
		color: var(--vanguard-cyan);
		background: color-mix(in srgb, var(--vanguard-cyan) 6%, transparent);
		width: fit-content;
	}

	.hero__badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--vanguard-cyan);
		flex-shrink: 0;
		animation: badge-pulse 2s ease-in-out infinite;
	}

	/* ── Headline ── */
	.hero__h1 {
		font-size: clamp(1.9rem, 5vw, 3.4rem);
		font-weight: 900;
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: white;
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
	}

	.hero__tagline {
		display: block;
		margin-top: 0.5rem;
		font-size: clamp(0.75rem, 2vw, 1rem);
		font-weight: 700;
		color: var(--vanguard-cyan);
		font-family: 'JetBrains Mono', monospace;
		letter-spacing: 0.04em;
	}

	/* ── Sub-headline ── */
	.hero__sub {
		font-size: clamp(0.68rem, 1.8vw, 0.84rem);
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.75;
		max-width: 440px;
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── CTAs ── */
	.hero__ctas {
		display: flex;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.hero__cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1.5rem;
		border-radius: var(--vanguard-radius-sm, 0.75rem);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-decoration: none;
		min-height: 48px;
		transition: all 0.25s ease;
		cursor: pointer;
	}

	.hero__cta--primary {
		background: color-mix(in srgb, var(--vanguard-cyan) 10%, transparent);
		border: 1px solid var(--vanguard-border);
		color: var(--vanguard-cyan);
		box-shadow: var(--vanguard-elev-3, 0 8px 32px rgba(0, 230, 255, 0.12));
	}

	.hero__cta--primary:hover {
		background: color-mix(in srgb, var(--vanguard-cyan) 18%, transparent);
		box-shadow: var(--vanguard-elev-3, 0 8px 32px rgba(0, 230, 255, 0.12)),
			0 0 24px color-mix(in srgb, var(--vanguard-cyan) 30%, transparent);
		transform: translateY(-2px);
	}

	.hero__cta--ghost {
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
	}

	.hero__cta--ghost:hover {
		border-color: rgba(255, 255, 255, 0.32);
		color: white;
		transform: translateY(-2px);
	}

	/* ── Disclaimer ── */
	.hero__disclaimer {
		font-size: 0.46rem;
		color: rgba(255, 255, 255, 0.22);
		letter-spacing: 0.08em;
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── Hex wrap ── */
	.hero__hex-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.hero__hex-svg {
		display: block;
		filter: drop-shadow(0 0 32px color-mix(in srgb, var(--vanguard-cyan) 22%, transparent))
			drop-shadow(0 0 64px color-mix(in srgb, var(--vanguard-cyan) 10%, transparent));
		animation: hex-float 6s ease-in-out infinite;
	}

	.hex-ring-spin {
		transform-origin: 140px 140px;
		animation: hex-ring-spin 24s linear infinite;
	}

	/* ── Atmospheric glows ── */
	.hero__glow {
		position: absolute;
		pointer-events: none;
		border-radius: 50%;
		filter: blur(100px);
	}

	.hero__glow--a {
		width: clamp(400px, 50vw, 700px);
		height: clamp(400px, 50vw, 700px);
		top: -15%;
		right: -10%;
		background: radial-gradient(
			ellipse at center,
			color-mix(in srgb, var(--vanguard-cyan) 8%, transparent) 0%,
			transparent 70%
		);
	}

	.hero__glow--b {
		width: clamp(300px, 40vw, 500px);
		height: clamp(300px, 40vw, 500px);
		bottom: 5%;
		left: -8%;
		background: radial-gradient(
			ellipse at center,
			color-mix(in srgb, var(--vanguard-cyan) 5%, transparent) 0%,
			transparent 70%
		);
	}

	/* ── Scroll cue ── */
	.hero__scroll-cue {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	.hero__scroll-line {
		display: block;
		width: 1px;
		height: 40px;
		background: linear-gradient(to bottom, var(--vanguard-cyan), transparent);
		transform-origin: top center;
		animation: scroll-line 2.4s ease-in-out infinite;
	}

	.hero__scroll-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.44rem;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.22);
	}

	/* ── Keyframes ── */
	@keyframes badge-pulse {
		0%, 100% {
			opacity: 1;
			box-shadow: 0 0 6px color-mix(in srgb, var(--vanguard-cyan) 60%, transparent);
		}
		50% {
			opacity: 0.4;
			box-shadow: 0 0 2px transparent;
		}
	}

	@keyframes hex-float {
		0%, 100% { transform: translateY(0); }
		50%       { transform: translateY(-14px); }
	}

	@keyframes hex-ring-spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}

	@keyframes scroll-line {
		0%   { transform: scaleY(0); opacity: 0; transform-origin: top center; }
		40%  { transform: scaleY(1); opacity: 1; transform-origin: top center; }
		60%  { transform: scaleY(1); opacity: 1; transform-origin: bottom center; }
		100% { transform: scaleY(0); opacity: 0; transform-origin: bottom center; }
	}
</style>
