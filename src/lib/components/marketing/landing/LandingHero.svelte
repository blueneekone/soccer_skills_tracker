<script lang="ts">
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { HERO_HEADLINE, HERO_SUBHEADLINE } from './landingContent.js';

	// Eyebrow tagline fades in after LCP via idle callback — kept off critical path
	let eyebrowVisible = $state(false);
	let videoEl: HTMLVideoElement;
	let stageEl: HTMLDivElement;

	$effect(() => {
		if (!browser) return;

		// Eyebrow visible after idle — non-critical
		const idleCb = (window as Window & typeof globalThis).requestIdleCallback ?? setTimeout;
		idleCb(() => { eyebrowVisible = true; });

		// Lazy video: promote data-src → src only when the stage enters viewport
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) return;
				if (!videoEl) return;
				const src = videoEl.dataset.src;
				if (src) {
					videoEl.src = src;
					videoEl.load();
					videoEl.play().catch(() => {/* autoplay blocked — poster stays */});
				}
				io.disconnect();
			},
			{ rootMargin: '200px' }
		);

		if (stageEl) io.observe(stageEl);
		return () => io.disconnect();
	});

	function handleWatchTour(e: MouseEvent) {
		e.preventDefault();
		if (videoEl && videoEl.src) {
			videoEl.play().catch(() => {});
		}
		stageEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
</script>

<section class="hero" aria-label="Nexus Command — Mission Control for Elite Youth Sports Clubs">
	<!-- Atmospheric glows (aria-hidden decorative) -->
	<div class="hero__glow hero__glow--a" aria-hidden="true"></div>
	<div class="hero__glow hero__glow--b" aria-hidden="true"></div>

	<div class="hero__inner">
		<!-- ── Left: copy column ── -->
		<div class="hero__copy">
			<!-- Eyebrow badge — fades in post-LCP -->
			<span
				class="hero__badge"
				class:hero__badge--visible={eyebrowVisible}
				aria-label="Nexus Command version 5.0 Enterprise"
			>
				<span class="hero__badge-dot" aria-hidden="true"></span>
				NEXUS COMMAND · v5.0 ENTERPRISE
			</span>

			<!-- Sub-10-word headline — the LCP text candidate -->
			<h1 class="hero__h1">{HERO_HEADLINE}</h1>

			<!-- Sub-headline — legibility-safe color -->
			<p class="hero__sub">{HERO_SUBHEADLINE}</p>

			<!-- Dual CTA -->
			<div class="hero__ctas">
				<a href="{base}/setup" class="hero__cta hero__cta--primary vanguard-card">
					DEPLOY YOUR CLUB →
				</a>
				<button type="button" class="hero__cta hero__cta--ghost" onclick={handleWatchTour}>
					WATCH 60-SEC TOUR
				</button>
			</div>

			<!-- Trust micro-line -->
			<p class="hero__disclaimer">
				$0 base fee · COPPA 2.0 hardened · WebAuthn biometric consent
			</p>
		</div>

		<!-- ── Right: product demo stage ── -->
		<div
			class="hero__stage-wrap"
			bind:this={stageEl}
			id="stage"
			aria-label="Product demo preview"
		>
			<!-- SIEM bezel chrome -->
			<div class="hero__stage vanguard-surface vanguard-surface--hero">
				<!-- Corner greebling -->
				<span class="hero__corner hero__corner--tl" aria-hidden="true"></span>
				<span class="hero__corner hero__corner--tr" aria-hidden="true"></span>
				<span class="hero__corner hero__corner--bl" aria-hidden="true"></span>
				<span class="hero__corner hero__corner--br" aria-hidden="true"></span>

				<!-- Status bar -->
				<div class="hero__status-bar" aria-hidden="true">
					<span class="hero__status-dot"></span>
					<span class="hero__status-label">NEXUS COMMAND · MISSION CONTROL ONLINE</span>
				</div>

				<!-- LCP poster image — explicit dimensions prevent CLS -->
				<div class="hero__media-wrap">
					<img
						class="hero__poster"
						src="/marketing/hero-poster.svg"
						alt="Nexus Command Player OS dashboard — skill tree, XP metrics, and adaptive workout feed"
						width="1280"
						height="720"
						fetchpriority="high"
						loading="eager"
						decoding="async"
					/>
					<!--
						Lazy video slot — data-src is promoted to src by IntersectionObserver.
						No src at SSR: avoids blocking the LCP paint window.
						Replace data-src with the real /marketing/hero-loop.mp4 when available.
					-->
					<video
						bind:this={videoEl}
						class="hero__video"
						data-src=""
						playsinline
						muted
						loop
						preload="none"
						aria-hidden="true"
					></video>
				</div>

				<!-- Overlay gradient — fades into stage chrome -->
				<div class="hero__stage-overlay" aria-hidden="true"></div>
			</div>
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
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	.hero__inner {
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(2.5rem, 5vw, 4rem);
		align-items: center;
	}

	@media (min-width: 64rem) {
		.hero__inner {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
		}
	}

	/* ── Copy column ── */
	.hero__copy {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ── Badge (post-LCP) ── */
	.hero__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.18em;
		border: 1px solid var(--vanguard-border);
		border-radius: 9999px;
		padding: 4px 14px;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		background: color-mix(in srgb, var(--vanguard-cyan) 6%, transparent);
		width: fit-content;
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.hero__badge--visible {
		opacity: 1;
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
		font-size: clamp(2rem, 5.5vw, 3.6rem);
		font-weight: 900;
		line-height: 1.06;
		letter-spacing: -0.02em;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	/* ── Sub-headline ── */
	.hero__sub {
		font-size: clamp(0.875rem, 1.8vw, 1rem);
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.7;
		max-width: 480px;
		margin: 0;
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
		font-size: clamp(0.6875rem, 1.2vw, 0.75rem);
		font-weight: 900;
		letter-spacing: 0.12em;
		text-decoration: none;
		min-height: 48px;
		min-width: 44px;
		transition: all 0.25s ease;
		cursor: pointer;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	.hero__cta--primary {
		background: color-mix(in srgb, var(--vanguard-cyan) 10%, transparent);
		border: 1px solid var(--vanguard-border);
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		box-shadow: var(--vanguard-elev-3);
	}

	.hero__cta--primary:hover {
		background: color-mix(in srgb, var(--vanguard-cyan) 18%, transparent);
		border-color: var(--vanguard-border-legible, rgba(99, 102, 241, 0.45));
		box-shadow: var(--vanguard-elev-3), 0 0 24px color-mix(in srgb, var(--vanguard-cyan) 30%, transparent);
		transform: translateY(-2px);
	}

	.hero__cta--ghost {
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--vanguard-text-3, #cbd5e1);
		background: transparent;
	}

	.hero__cta--ghost:hover {
		border-color: rgba(255, 255, 255, 0.32);
		color: var(--vanguard-text-1, #ffffff);
		transform: translateY(-2px);
	}

	/* ── Disclaimer ── */
	.hero__disclaimer {
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: var(--vanguard-text-3, #cbd5e1);
		letter-spacing: 0.08em;
		margin: 0;
		opacity: 0.6;
	}

	/* ── Product demo stage ── */
	.hero__stage-wrap {
		position: relative;
		/* Reserve 16:9 space — prevents CLS when poster loads */
		aspect-ratio: 16 / 9;
		width: 100%;
	}

	.hero__stage {
		position: absolute;
		inset: 0;
		border-radius: var(--vanguard-radius, 1.5rem);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Corner greebling — HUD chrome detail */
	.hero__corner {
		position: absolute;
		width: 12px;
		height: 12px;
		border-color: var(--vanguard-cyan);
		border-style: solid;
		opacity: 0.55;
		z-index: 3;
	}

	.hero__corner--tl { top: 8px; left: 8px; border-width: 1px 0 0 1px; }
	.hero__corner--tr { top: 8px; right: 8px; border-width: 1px 1px 0 0; }
	.hero__corner--bl { bottom: 8px; left: 8px; border-width: 0 0 1px 1px; }
	.hero__corner--br { bottom: 8px; right: 8px; border-width: 0 1px 1px 0; }

	/* Status bar */
	.hero__status-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 1rem;
		background: rgba(7, 12, 26, 0.75);
		border-bottom: 1px solid var(--vanguard-border);
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.18em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
	}

	.hero__status-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 6px #10b981;
		flex-shrink: 0;
		animation: badge-pulse 2s ease-in-out infinite;
	}

	.hero__status-label {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	/* Media wrapper — poster + video stacked */
	.hero__media-wrap {
		position: relative;
		flex: 1;
		display: flex;
	}

	.hero__poster {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		/* Marginally offset for status bar height (~2rem) */
		padding-top: 2rem;
		box-sizing: border-box;
	}

	.hero__video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* Hidden until src is hydrated */
		opacity: 0;
		transition: opacity 0.5s ease;
	}

	/* Selector active once IntersectionObserver hydrates src — :global suppresses false Svelte unused-selector warning */
	:global(.hero__video[src]:not([src=''])) {
		opacity: 1;
	}

	/* Bottom gradient blends stage into page */
	.hero__stage-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 30%;
		background: linear-gradient(to top, var(--vanguard-bg, #0f172a), transparent);
		pointer-events: none;
		z-index: 2;
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
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.2em;
		color: var(--vanguard-text-3, #cbd5e1);
		opacity: 0.5;
	}

	/* ── Keyframes ── */
	@keyframes badge-pulse {
		0%, 100% { opacity: 1; box-shadow: 0 0 6px color-mix(in srgb, var(--vanguard-cyan) 60%, transparent); }
		50%       { opacity: 0.4; box-shadow: 0 0 2px transparent; }
	}

	@keyframes scroll-line {
		0%   { transform: scaleY(0); opacity: 0; transform-origin: top center; }
		40%  { transform: scaleY(1); opacity: 1; transform-origin: top center; }
		60%  { transform: scaleY(1); opacity: 1; transform-origin: bottom center; }
		100% { transform: scaleY(0); opacity: 0; transform-origin: bottom center; }
	}

	@media (prefers-reduced-motion: reduce) {
		.hero__badge-dot,
		.hero__status-dot,
		.hero__scroll-line {
			animation: none;
		}
		.hero__cta--primary:hover,
		.hero__cta--ghost:hover {
			transform: none;
		}
	}
</style>
