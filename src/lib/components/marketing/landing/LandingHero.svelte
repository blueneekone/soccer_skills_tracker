<script lang="ts">
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import {
		HERO_TRUST_BADGE,
		HERO_TRUST_HEADLINE,
		HERO_TRUST_SUBHEADLINE,
		HERO_TRUST_MICRO_STRIP,
		HERO_TRUST_LEGAL,
	} from './landingContent.js';

	let eyebrowVisible = $state(false);
	let videoEl: HTMLVideoElement;
	let stageEl: HTMLDivElement;

	$effect(() => {
		if (!browser) return;

		const idleCb = (window as Window & typeof globalThis).requestIdleCallback ?? setTimeout;
		idleCb(() => {
			eyebrowVisible = true;
		});

		const io = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) return;
				if (!videoEl) return;
				const src = videoEl.dataset.src;
				if (src) {
					videoEl.src = src;
					videoEl.load();
					videoEl.play().catch(() => {});
				}
				io.disconnect();
			},
			{ rootMargin: '200px' }
		);

		if (stageEl) io.observe(stageEl);
		return () => io.disconnect();
	});
</script>

<section class="hero" aria-label="SSTracker — club platform for athlete development">
	<div class="hero__inner">
		<div class="hero__copy">
			<span
				class="hero__badge"
				class:hero__badge--visible={eyebrowVisible}
				aria-label="SSTracker club operating system"
			>
				<span class="hero__badge-dot" aria-hidden="true"></span>
				{HERO_TRUST_BADGE}
			</span>

			<h1 class="hero__h1">{HERO_TRUST_HEADLINE}</h1>

			<p class="hero__sub">{HERO_TRUST_SUBHEADLINE}</p>

			<div class="hero__ctas">
				<a href="{base}/setup" class="tw-btn-primary">
					Start your club →
				</a>
				<a href="{base}/acquisition" class="tw-vanguard-btn-secondary">
					Director trust brief →
				</a>
			</div>

			<ul class="hero__trust-strip" aria-label="Platform trust signals">
				{#each HERO_TRUST_MICRO_STRIP as chip (chip)}
					<li>{chip}</li>
				{/each}
			</ul>

			<p class="hero__disclaimer">
				{HERO_TRUST_LEGAL}
			</p>
		</div>

		<div class="hero__demo-wrap" bind:this={stageEl} id="stage" aria-label="Product demo preview">
			<div class="hero__stage vanguard-surface tw-border-slate-800">
				<div class="hero__status-bar" aria-hidden="true">
					<span class="hero__status-dot"></span>
					<span class="hero__status-label">SSTRACKER · PLAYER HQ · PREVIEW</span>
					<span class="hero__status-meta">SYNC OK</span>
				</div>

				<div class="hero__body">
					<div class="hero__media-wrap tw-w-full">
						<video
							bind:this={videoEl}
							class="hero__video tw-w-full tw-h-auto"
							data-src="/marketing/hero-demo.mp4"
							playsinline
							muted
							loop
							preload="none"
							aria-hidden="true"
							poster="/marketing/hero-poster.svg"
						></video>
					</div>

				</div>
			</div>
		</div>
	</div>

	<div class="hero__scroll-cue" aria-hidden="true">
		<span class="hero__scroll-line"></span>
		<span class="hero__scroll-label">SCROLL</span>
	</div>
</section>

<style>
	.hero {
		position: relative;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: clamp(4.75rem, 9vw, 7rem) clamp(1rem, 5vw, 3rem) clamp(3rem, 6vw, 4rem);
		font-family: var(--font-mono);
	}

	.hero__inner {
		max-width: 1320px;
		width: 100%;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(2rem, 5vw, 3.25rem);
		align-items: start;
	}

	@media (min-width: 64rem) {
		.hero__inner {
			grid-template-columns: minmax(0, min(100%, 26rem)) minmax(0, 1fr);
			column-gap: clamp(1.5rem, 3.5vw, 2.75rem);
			align-items: center;
		}

		.hero__demo-wrap {
			width: min(108%, calc(100% + 2.5rem));
			max-width: none;
			justify-self: end;
			margin-right: clamp(-0.5rem, -1.25vw, 0);
		}
	}

	.hero__copy {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.hero__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.18em;
		border: 1px solid rgb(30 41 59);
		border-radius: 9999px;
		padding: 4px 14px;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		background: rgb(15 23 42 / 0.65);
		width: fit-content;
		opacity: 0;
		transition: opacity 0.35s ease;
	}

	.hero__badge--visible {
		opacity: 1;
	}

	.hero__badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--vanguard-accent);
		flex-shrink: 0;
		animation: badge-pulse 2s ease-in-out infinite;
	}

	.hero__h1 {
		font-family: var(--font-display);
		font-size: clamp(2rem, 5.2vw, 3.5rem);
		font-weight: 800;
		line-height: 1.06;
		letter-spacing: -0.02em;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	.hero__sub {
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.8vw, 1.0625rem);
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.7;
		max-width: 480px;
		margin: 0;
		font-weight: 400;
	}

	.hero__ctas {
		display: flex;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.hero__trust-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.85rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.hero__trust-strip li {
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		letter-spacing: 0.06em;
		padding: 0.25rem 0.65rem;
		border: 1px solid rgb(30 41 59);
		border-radius: 9999px;
		background: rgb(15 23 42 / 0.45);
	}

	.hero__disclaimer {
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: var(--vanguard-text-3, #cbd5e1);
		letter-spacing: 0.08em;
		margin: 0;
		opacity: 0.55;
	}

	.hero__demo-wrap {
		position: relative;
		width: 100%;
	}

	.hero__stage {
		position: relative;
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		min-height: clamp(260px, 42vw, 500px);
		box-shadow: none;
	}

	.hero__status-bar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.75rem;
		background: rgb(2 6 23);
		border-bottom: 1px solid rgb(30 41 59);
		font-size: 0.5625rem;
		letter-spacing: 0.16em;
		color: rgb(148 163 184 / 0.85);
	}

	.hero__status-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--vanguard-accent);
		opacity: 0.9;
		flex-shrink: 0;
		animation: badge-pulse 2s ease-in-out infinite;
	}

	.hero__status-label {
		flex: 1;
		min-width: 0;
		font-family: inherit;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.hero__status-meta {
		font-family: inherit;
		color: rgb(71 85 105);
		letter-spacing: 0.12em;
	}

	.hero__body {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: stretch;
	}

	.hero__telemetry {
		width: clamp(7.25rem, 18vw, 9.25rem);
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.55rem 0.6rem;
		background: rgb(2 6 23);
		border-right: 1px solid rgb(30 41 59);
	}

	.hero__tel-title {
		font-size: 0.5rem;
		letter-spacing: 0.22em;
		color: rgb(71 85 105);
		font-weight: 700;
	}

	.hero__tel-dl {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex: 1;
	}

	.hero__tel-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.25rem 0.5rem;
		align-items: baseline;
		font-size: 0.5625rem;
		line-height: 1.2;
	}

	.hero__tel-row dt {
		margin: 0;
		color: rgb(71 85 105);
		letter-spacing: 0.06em;
		font-weight: 600;
	}

	.hero__tel-row dd {
		margin: 0;
		color: rgb(226 232 240 / 0.9);
		letter-spacing: 0.04em;
		font-weight: 700;
		text-align: right;
	}

	.hero__tel-num {
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-accent) !important;
	}

	.hero__scope {
		margin-top: auto;
		opacity: 0.85;
		border-top: 1px solid rgb(30 41 59);
		padding-top: 0.35rem;
	}

	.hero__media-wrap {
		position: relative;
		flex: 1;
		min-width: 0;
		background: rgb(15 23 42);
		display: flex;
	}

	.hero__poster {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.hero__video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.45s ease;
	}

	:global(.hero__video[src]:not([src=''])) {
		opacity: 1;
	}

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
		background: linear-gradient(to bottom, rgb(51 65 85), transparent);
		transform-origin: top center;
		animation: scroll-line 2.4s ease-in-out infinite;
	}

	.hero__scroll-label {
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.2em;
		color: var(--vanguard-text-3, #cbd5e1);
		opacity: 0.45;
	}

	@keyframes badge-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	@keyframes scroll-line {
		0% {
			transform: scaleY(0);
			opacity: 0;
			transform-origin: top center;
		}
		40% {
			transform: scaleY(1);
			opacity: 1;
			transform-origin: top center;
		}
		60% {
			transform: scaleY(1);
			opacity: 1;
			transform-origin: bottom center;
		}
		100% {
			transform: scaleY(0);
			opacity: 0;
			transform-origin: bottom center;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero__badge-dot,
		.hero__status-dot,
		.hero__scroll-line {
			animation: none;
		}
	}
</style>
