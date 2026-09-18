<script lang="ts">
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import Modal from '$lib/components/Modal.svelte';
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
	let isModalOpen = $state(false);

	function openModal() {
		isModalOpen = true;
	}

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
				<a href="{base}/setup" class="hero__btn-primary">
					<span>GET STARTED FREE</span>
					<span class="hero__btn-arrow" aria-hidden="true">→</span>
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
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="hero__stage vanguard-surface tw-border-slate-800 tw-cursor-pointer tw-group" onclick={openModal} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } }} tabindex="0" role="button" aria-label="Play Hero Video">
				<div class="tw-absolute tw-inset-0 tw-z-10 tw-flex tw-items-center tw-justify-center tw-bg-[#0f172a]/40 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300">
					<div class="tw-bg-[#daff0a] tw-text-black tw-rounded-full tw-p-4 tw-shadow-[0_0_20px_rgba(218,255,10,0.5)] tw-transform tw-scale-90 group-hover:tw-scale-100 tw-transition-transform tw-duration-300">
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
					</div>
				</div>
				<div class="hero__status-bar" aria-hidden="true">
					<span class="hero__status-dot"></span>
					<span class="hero__status-label">SSTRACKER · MISSION CONTROL · LIVE OPERATIONAL HUD</span>
					<span class="hero__status-meta">ALL CELLS SYNCED</span>
				</div>

				<div class="hero__body">
					<div class="hero__media-wrap tw-w-full">
						<video
							bind:this={videoEl}
							class="hero__video tw-w-full tw-h-auto"
							data-src="/assets/video/marketing-hero.mp4"
							src="/assets/video/marketing-hero.mp4"
							playsinline
							muted
							loop
							preload="auto"
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


<Modal bind:open={isModalOpen} maxWidth="1200px">
	{#snippet titleSlot()}
		<div class="tw-font-mono tw-font-bold tw-text-lg tw-text-white tw-tracking-widest">
			SSTRACKER PLATFORM SHOWCASE
		</div>
	{/snippet}
	<div class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-overflow-hidden tw-shadow-[0_0_30px_rgba(20,184,166,0.15)] tw-p-1">
		<video
			class="tw-w-full tw-h-auto tw-rounded-lg tw-bg-[#000000]"
			src="/assets/video/marketing-hero.mp4"
			controls
			playsinline
			autoplay
			poster="/marketing/hero-poster.svg"
		>
			<track kind="captions" />
		</video>
	</div>
</Modal>


<style>
	.hero {
		position: relative;
		min-height: 85dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: clamp(3rem, 5vw, 4rem) clamp(1rem, 5vw, 3rem) clamp(2rem, 4vw, 3rem);
		font-family: var(--font-sans, 'Switzer', sans-serif);
	}

	.hero__inner {
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: clamp(1.5rem, 3vw, 2.5rem);
		align-items: center;
	}

	@media (min-width: 64rem) {
		.hero__copy {
			grid-column: 1 / 7;
		}
		.hero__demo-wrap {
			grid-column: 7 / 13;
			width: 100%;
			max-width: none;
			justify-self: center;
		}
	}
    @media (max-width: 63.99rem) {
        .hero__copy, .hero__demo-wrap {
            grid-column: 1 / -1;
        }
    }
    

	.hero__copy {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		grid-column: 1 / 7;
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
		color: #14b8a6; /* Data Cyan — enterprise palette only */
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
		font-family: 'Geist Sans', var(--font-display, sans-serif);
		font-size: clamp(2.5rem, 4.5vw, 4rem);
		font-weight: 900;
		line-height: 1.1;
		letter-spacing: -0.02em;
		color: #fafafa;
		margin: 0;
	}

	.hero__sub {
		font-family: 'Switzer', var(--font-sans, sans-serif);
		font-size: clamp(1.125rem, 1.5vw, 1.35rem);
		color: #cbd5e1;
		line-height: 1.6;
		max-width: 580px;
		margin: 0;
		font-weight: 400;
	}

	.hero__ctas {
		display: flex;
		gap: 0.85rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.hero__btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		background: #fbbf24;
		border: 1px solid #f59e0b;
		color: #020617;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-decoration: none;
		box-shadow: 0 0 16px rgba(251, 191, 36, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3);
		transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero__btn-primary:hover {
		background: #fcd34d;
		box-shadow: 0 0 32px rgba(251, 191, 36, 0.65), 0 4px 16px rgba(0, 0, 0, 0.8);
		transform: translateY(-4px);
	}

	.hero__btn-primary:active {
		transform: scale(0.98);
	}


	.hero__btn-arrow {
		font-weight: 900;
		transition: transform 180ms ease;
	}

	.hero__btn-primary:hover .hero__btn-arrow,
	.hero__btn-secondary:hover .hero__btn-arrow {
		transform: translateX(4px);
	}

	.hero__trust-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.85rem;
		list-style: none;
		margin: 0;
		padding-bottom: 0.5rem;
		padding: 0;
	}

	.hero__trust-strip li {
		font-family: 'Geist Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6rem);
		color: #14b8a6;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.6rem;
		border: 1px solid rgba(51, 65, 85, 0.7);
		border-radius: 9999px;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(6px);
	}

	.hero__disclaimer {
		font-family: 'Geist Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: #94a3b8;
		letter-spacing: 0.06em;
		margin: 0;
		padding-bottom: 0.5rem;
		opacity: 0.75;
	}

	.hero__demo-wrap {
		position: relative;
		width: 100%;
	}

	.hero__stage {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		min-height: clamp(240px, 30vw, 400px);
		border: 1px solid rgba(20, 184, 166, 0.3);
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 45px rgba(20, 184, 166, 0.15);
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
