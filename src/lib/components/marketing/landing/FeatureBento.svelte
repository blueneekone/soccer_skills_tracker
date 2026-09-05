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
			<span class="fb-eyebrow">PLATFORM</span>
			<h2 class="fb-h2" id="fb-heading">
				Development, compliance,<br />and ops — connected.
			</h2>
			<p class="fb-sub">
				Not another team chat app. The loops competitors cannot copy without rebuilding from scratch.
			</p>
		</div>

		<div class="fb-grid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4 tw-w-full">
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
						<Icon name={cell.icon} size={48} class="fb-cell__icon" />
					</div>

					<div class="fb-cell__content">
						<span class="fb-cell__eyebrow">{cell.eyebrow}</span>
						<h3 class="fb-cell__headline">{cell.headline}</h3>
						<p class="fb-cell__body">{cell.body}</p>
						<div class="fb-cell__btn-wrap">
							<span class="fb-btn">
								<span>LEARN MORE</span>
								<span class="fb-btn__arrow" aria-hidden="true">→</span>
							</span>
						</div>
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
		background-color: #000000;
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

	@media (max-width: 63.99rem) {
		.fb-cell {
			grid-column: 1 / -1 !important;
			grid-row: auto !important;
		}
	}

	.fb-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 1.25rem;
		padding: var(--bento-pad, clamp(1.25rem, 3vw, 1.75rem));
		border-radius: 8px;
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid rgba(51, 65, 85, 0.6);
		backdrop-filter: blur(12px);
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
			border-color 150ms ease,
			box-shadow 150ms ease;
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
		letter-spacing: 0.2em;
		color: var(--cell-accent);
		text-transform: uppercase;
	}

	.fb-cell__headline {
		font-family: 'Geist Sans', var(--font-display, sans-serif);
		font-size: clamp(1rem, 2vw, 1.25rem);
		font-weight: 700;
		color: #ffffff;
		margin: 0;
		line-height: 1.3;
	}

	.fb-cell__body {
		font-family: 'Switzer', var(--font-sans, sans-serif);
		font-size: clamp(0.875rem, 1.3vw, 0.9375rem);
		font-weight: 400;
		color: #94a3b8;
		line-height: 1.7;
		margin: 0;
		flex: 1;
	}

	.fb-cell__btn-wrap {
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid color-mix(in srgb, var(--cell-accent) 20%, rgba(51, 65, 85, 0.4));
	}

	.fb-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1rem;
		border-radius: 6px;
		background: rgba(15, 23, 42, 0.85);
		border: 1px solid color-mix(in srgb, var(--cell-accent) 45%, rgba(51, 65, 85, 0.8));
		color: var(--cell-accent);
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.fb-cell:hover .fb-btn {
		background: color-mix(in srgb, var(--cell-accent) 20%, #0f172a);
		border-color: var(--cell-accent);
		color: #ffffff;
		box-shadow: 0 0 16px color-mix(in srgb, var(--cell-accent) 35%, transparent);
		transform: translateY(-1px);
	}

	.fb-btn__arrow {
		font-weight: 900;
		transition: transform 180ms ease;
	}

	.fb-cell:hover .fb-btn__arrow {
		transform: translateX(3px);
	}

	@media (prefers-reduced-motion: reduce) {
		.fb-cell {
			transition: opacity 0.3s ease;
			transform: none;
		}
		.fb-btn,
		.fb-btn__arrow {
			transition: none;
		}
	}
</style>
