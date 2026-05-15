<script lang="ts">
	import { browser } from '$app/environment';
	import { FEATURE_BENTO } from './landingContent.js';

	let sectionEl: HTMLElement;
	let revealed = $state(false);

	const CX = 100,
		CY = 100,
		R = 72;
	const axes = [
		{ label: 'PII', value: 96 },
		{ label: 'RPG', value: 92 },
		{ label: 'AI', value: 88 },
		{ label: 'XP', value: 94 },
		{ label: 'EQ', value: 85 },
		{ label: 'RL', value: 91 },
	];
	const INNER_RINGS = [0.25, 0.5, 0.75, 1];

	function polar(angleDeg: number, radius: number) {
		const rad = ((angleDeg - 90) * Math.PI) / 180;
		return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
	}

	function hexPath(frac: number): string {
		return (
			axes
				.map((_, i) => {
					const { x, y } = polar(i * 60, R * frac);
					return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
				})
				.join(' ') + 'Z'
		);
	}

	const dataPath =
		axes
			.map((ax, i) => {
				const { x, y } = polar(i * 60, R * (ax.value / 100));
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
			})
			.join(' ') + 'Z';

	$effect(() => {
		if (!browser) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					revealed = true;
					io.disconnect();
				}
			},
			{ threshold: 0.1 }
		);
		if (sectionEl) io.observe(sectionEl);
		return () => io.disconnect();
	});
</script>

<section class="fb-section" bind:this={sectionEl} aria-labelledby="fb-heading">
	<div class="fb-inner">
		<div class="fb-header">
			<span class="fb-eyebrow">PLATFORM CAPABILITIES</span>
			<h2 class="fb-h2" id="fb-heading">
				Every feature.<br />One Mission Control.
			</h2>
			<p class="fb-sub">
				Six enterprise systems — unified under a single Vanguard Protocol deployment.
			</p>
		</div>

		<div class="fb-grid">
			{#each FEATURE_BENTO as cell, idx (cell.id)}
				<a
					href={cell.href}
					class="fb-cell vanguard-card tw-border-slate-800 bento-cell bento-cell--interactive {revealed
						? 'fb-cell--revealed'
						: ''}"
					style="
						--cell-accent: {cell.accentColor};
						--gcol: {cell.gridLg.col};
						--grow: {cell.gridLg.row};
						transition-delay: {idx * 50}ms;
					"
					aria-label="{cell.eyebrow}: {cell.headline}"
				>
					<div class="fb-cell__glyph" aria-hidden="true">
						{#if cell.glyphId === 'glyph-hexradar'}
							<svg viewBox="0 0 200 200" width="80" height="80" role="img" aria-hidden="true">
								<g style="transform-origin: 100px 100px; animation: hex-ring-spin 24s linear infinite">
									<circle
										cx={CX}
										cy={CY}
										r={R * 1.35}
										fill="none"
										stroke="var(--vanguard-accent)"
										stroke-width="0.5"
										stroke-dasharray="4 8"
										stroke-opacity="0.35"
									/>
								</g>
								{#each INNER_RINGS as frac (frac)}
									<path
										d={hexPath(frac)}
										fill="none"
										stroke="var(--vanguard-border)"
										stroke-width={frac === 1 ? 1 : 0.5}
										stroke-opacity={frac === 1 ? 0.55 : 0.25}
									/>
								{/each}
								{#each axes as _, i (i)}
									{@const end = polar(i * 60, R * 1.05)}
									<line
										x1={CX}
										y1={CY}
										x2={end.x}
										y2={end.y}
										stroke="var(--vanguard-border)"
										stroke-width="0.5"
										stroke-opacity="0.35"
									/>
								{/each}
								<path d={dataPath} fill="var(--vanguard-accent)" fill-opacity="0.08" stroke="none" />
								<path
									d={dataPath}
									fill="none"
									stroke="var(--vanguard-accent)"
									stroke-width="1.5"
									stroke-opacity="0.9"
									stroke-linejoin="round"
								/>
								{#each axes as ax, i (ax.label)}
									{@const dot = polar(i * 60, R * (ax.value / 100))}
									{@const lp = polar(i * 60, R * 1.22)}
									<circle cx={dot.x} cy={dot.y} r="3" fill="var(--vanguard-accent)" fill-opacity="0.9" />
									<text
										x={lp.x}
										y={lp.y}
										text-anchor="middle"
										dominant-baseline="middle"
										font-family="Geist Mono, ui-monospace, monospace"
										font-size="8"
										font-weight="700"
										fill="white"
										fill-opacity="0.75">{ax.label}</text>
								{/each}
								<circle
									cx={CX}
									cy={CY}
									r="18"
									fill="rgb(2 6 23)"
									stroke="var(--vanguard-accent)"
									stroke-width="1"
									stroke-opacity="0.6"
								/>
								<text
									x={CX}
									y={CY}
									text-anchor="middle"
									dominant-baseline="middle"
									font-family="Geist Mono, ui-monospace, monospace"
									font-size="10"
									font-weight="900"
									letter-spacing="0.1em"
									fill="var(--vanguard-accent)">OS</text>
							</svg>
						{:else if cell.glyphId === 'glyph-waveform'}
							<svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true">
								<polyline
									points="0,20 8,14 14,26 20,10 26,30 32,8 38,24 44,12 50,28 56,6 62,22 68,16 80,20"
									fill="none"
									stroke="var(--vanguard-accent)"
									stroke-width="1.5"
									stroke-linejoin="round"
									stroke-opacity="0.85"
								/>
								<polyline
									points="0,20 8,18 14,22 20,16 26,24 32,14 38,22 44,17 50,23 56,13 62,20 68,18 80,20"
									fill="none"
									stroke="var(--vanguard-accent)"
									stroke-width="0.5"
									stroke-linejoin="round"
									stroke-opacity="0.3"
								/>
							</svg>
						{:else if cell.glyphId === 'glyph-fingerprint'}
							<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="var(--vanguard-accent)" stroke-linecap="round">
								<path d="M20 4 C12 4 6 10 6 18 C6 26 12 34 20 36" stroke-opacity="0.9" stroke-width="1.2" />
								<path d="M20 4 C28 4 34 10 34 18 C34 26 28 34 20 36" stroke-opacity="0.5" stroke-width="1.2" />
								<path
									d="M14 14 C14 10 16.5 8 20 8 C23.5 8 26 10 26 14 C26 18 23 20 20 22 C17 24 16 26 16 28"
									stroke-opacity="0.9"
									stroke-width="1.2"
								/>
								<path d="M20 12 C22 12 23 13.5 23 15 C23 17 21.5 18.5 20 20" stroke-opacity="0.55" stroke-width="1.2" />
								<circle cx="20" cy="20" r="1.5" fill="var(--vanguard-accent)" stroke="none" />
							</svg>
						{:else if cell.glyphId === 'glyph-routing'}
							<svg viewBox="0 0 60 32" width="60" height="32" aria-hidden="true" fill="none">
								<circle cx="8" cy="16" r="5" stroke="var(--vanguard-accent)" stroke-width="1" stroke-opacity="0.8" />
								<circle cx="8" cy="16" r="2" fill="var(--vanguard-accent)" fill-opacity="0.6" />
								<line x1="13" y1="16" x2="21" y2="8" stroke="var(--vanguard-accent)" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.5" />
								<line x1="13" y1="16" x2="21" y2="24" stroke="var(--vanguard-accent)" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.5" />
								<circle cx="26" cy="8" r="4" stroke="var(--vanguard-accent)" stroke-width="1" stroke-opacity="0.6" />
								<circle cx="26" cy="24" r="4" stroke="var(--vanguard-accent)" stroke-width="1" stroke-opacity="0.6" />
								<line x1="30" y1="8" x2="38" y2="8" stroke="var(--vanguard-accent)" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.4" />
								<line x1="30" y1="24" x2="38" y2="24" stroke="var(--vanguard-accent)" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.4" />
								<rect x="38" y="4" width="14" height="8" rx="2" stroke="var(--vanguard-accent)" stroke-width="1" stroke-opacity="0.8" />
								<rect x="38" y="20" width="14" height="8" rx="2" stroke="var(--vanguard-accent)" stroke-width="1" stroke-opacity="0.8" />
							</svg>
						{:else if cell.glyphId === 'glyph-escrow'}
							<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none">
								<circle cx="20" cy="20" r="15" stroke="var(--vanguard-accent)" stroke-width="1.2" stroke-opacity="0.8" />
								<circle cx="20" cy="20" r="10" stroke="var(--vanguard-accent)" stroke-width="0.8" stroke-opacity="0.4" />
								<text
									x="20"
									y="24"
									text-anchor="middle"
									font-family="Geist Mono, ui-monospace, monospace"
									font-size="12"
									font-weight="900"
									fill="var(--vanguard-accent)"
									fill-opacity="0.9">$</text>
								<path d="M20 5 L20 2 M20 38 L20 35" stroke="var(--vanguard-accent)" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6" />
							</svg>
						{:else if cell.glyphId === 'glyph-zero'}
							<span class="fb-cell__big-label" aria-hidden="true">$0</span>
						{/if}
					</div>

					<div class="fb-cell__content">
						<span class="fb-cell__eyebrow">{cell.eyebrow}</span>
						<h3 class="fb-cell__headline">{cell.headline}</h3>
						<p class="fb-cell__body">{cell.body}</p>
						<span class="fb-cell__cta" aria-hidden="true">LEARN MORE →</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.fb-section {
		position: relative;
		padding-block: clamp(4rem, 8vw, 6rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		overflow: hidden;
	}

	.fb-inner {
		max-width: 1300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: clamp(2.5rem, 5vw, 4rem);
		position: relative;
		z-index: 1;
	}

	.fb-header {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-width: 680px;
	}

	.fb-eyebrow {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.fb-h2 {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 4vw, 2.8rem);
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	.fb-sub {
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.5vw, 1rem);
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.7;
		margin: 0;
		max-width: 520px;
		font-weight: 400;
	}

	.fb-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: clamp(0.75rem, 1.5vw, 1rem);
		width: 100%;
		box-sizing: border-box;
	}

	@media (max-width: 63.99rem) {
		.fb-grid {
			grid-template-columns: 1fr;
		}
	}

	.fb-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: var(--bento-pad, clamp(1rem, 3vw, 1.75rem));
		border-radius: 4px;
		text-decoration: none;
		color: inherit;
		box-shadow: none;
		grid-column: var(--gcol, auto);
		grid-row: var(--grow, auto);
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity 0.4s ease,
			transform 0.4s ease,
			border-color 150ms ease;
	}

	@media (max-width: 63.99rem) {
		.fb-cell {
			grid-column: 1 / -1;
			grid-row: auto;
		}
	}

	.fb-cell--revealed {
		opacity: 1;
		transform: none;
	}

	.fb-cell__glyph {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.fb-cell__big-label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 900;
		color: var(--vanguard-accent);
		line-height: 1;
		display: block;
	}

	.fb-cell__content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.fb-cell__eyebrow {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.22em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.fb-cell__headline {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.9rem, 2vw, 1.1rem);
		font-weight: 800;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
		line-height: 1.3;
	}

	.fb-cell__body {
		font-family: var(--font-sans);
		font-size: clamp(0.875rem, 1.3vw, 0.9375rem);
		font-weight: 400;
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.7;
		margin: 0;
		flex: 1;
	}

	.fb-cell__cta {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 600;
		letter-spacing: 0.15em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
		margin-top: auto;
		padding-top: 0.5rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.fb-cell:hover .fb-cell__cta {
		opacity: 1;
	}

	@keyframes hex-ring-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fb-cell {
			transition: opacity 0.3s ease;
			transform: none;
		}
		.fb-cell__cta {
			transition: none;
		}
	}
</style>
