<script lang="ts">
	import { browser } from '$app/environment';
	import { FEATURE_BENTO } from './landingContent.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	let sectionEl: HTMLElement;
	let revealed = $state(false);

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
						<Icon name={cell.icon} size={56} class="fb-cell__icon" />
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
		color: var(--cell-accent);
	}

	:global(.fb-cell__icon) {
		color: var(--cell-accent);
		flex-shrink: 0;
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
