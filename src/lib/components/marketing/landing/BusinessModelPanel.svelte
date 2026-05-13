<script lang="ts">
	import { REVENUE_ENGINES } from './landingContent.js';

	let sectionEl: HTMLElement;
	let revealed = $state(false);

	$effect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.15 }
		);

		if (sectionEl) observer.observe(sectionEl);

		return () => observer.disconnect();
	});
</script>

<section
	class="bm-section"
	class:bm-section--revealed={revealed}
	bind:this={sectionEl}
	aria-label="Enterprise Pricing Model"
>
	<div class="bm-wrapper">
		<div class="bm-header">
			<span class="bm-eyebrow">ENTERPRISE PRICING MODEL</span>
			<h2 class="bm-headline">The $0 Platform Fee.</h2>
			<p class="bm-subline">
				Clubs pay nothing until athletes transact. Then a fractional micro-percentage. That's the
				entire model.
			</p>
		</div>

		<div class="bm-grid">
			{#each REVENUE_ENGINES as engine (engine.id)}
				<div class="glass-panel bm-card">
					<span class="bm-card__value">{engine.label}</span>
					<span class="bm-card__metric">{engine.value}</span>
					<p class="bm-card__desc">{engine.descriptor}</p>
					<a class="bm-card__link" href={engine.href}>VIEW PRICING →</a>
				</div>
			{/each}
		</div>

		<div class="bm-separator">
			<p class="bm-separator__tagline">
				Built for clubs that grow. Revenue that scales with you.
			</p>
		</div>

		<p class="bm-footnote">
			Transaction fees are disclosed in full at /pricing. No surprise charges.
		</p>
	</div>
</section>

<style>
	.bm-section {
		width: 100%;
		padding-block: clamp(4rem, 8vw, 6rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
	}

	.bm-wrapper {
		max-width: 1200px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 4vw, 3rem);
	}

	.bm-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bm-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 500;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--vanguard-cyan) 60%, transparent);
	}

	.bm-headline {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.6rem, 4vw, 2.8rem);
		font-weight: 900;
		color: #ffffff;
		margin: 0;
		line-height: 1.1;
	}

	.bm-subline {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.7rem, 1.5vw, 0.9rem);
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.7;
		margin: 0;
		max-width: 60ch;
	}

	/* Revenue engine grid */
	.bm-grid {
		display: grid;
		grid-template-columns: repeat(
			auto-fit,
			minmax(min(100%, clamp(240px, 30vw, 360px)), 1fr)
		);
		gap: var(--bento-gap-md, 1.25rem);
	}

	.bm-card {
		padding: var(--bento-pad, clamp(1rem, 3vw, 1.75rem));
		border-radius: var(--radius-premium, var(--vanguard-radius, 1.5rem));
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		opacity: 0;
		transform: translateY(24px);
		transition:
			opacity 0.7s ease,
			transform 0.7s ease;
	}

	.bm-card:nth-child(1) {
		transition-delay: 0ms;
	}

	.bm-card:nth-child(2) {
		transition-delay: 120ms;
	}

	.bm-card:nth-child(3) {
		transition-delay: 240ms;
	}

	.bm-section--revealed .bm-card {
		opacity: 1;
		transform: none;
	}

	.bm-card__value {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(2.8rem, 5vw, 4rem);
		font-weight: 900;
		color: var(--vanguard-cyan);
		line-height: 1;
	}

	.bm-card__metric {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.52rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}

	.bm-card__desc {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		line-height: 1.75;
		color: rgba(255, 255, 255, 0.35);
		margin: 0;
		flex: 1;
	}

	.bm-card__link {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		font-weight: 600;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: var(--vanguard-cyan);
		text-decoration: none;
		transition: opacity 0.2s ease;
		align-self: flex-start;
	}

	.bm-card__link:hover {
		opacity: 0.8;
	}

	/* Separator bar */
	.bm-separator {
		border-top: 1px solid var(--vanguard-border);
		padding-top: 1.5rem;
		display: flex;
		justify-content: center;
	}

	.bm-separator__tagline {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 400;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.2);
		text-align: center;
		margin: 0;
	}

	/* Footnote */
	.bm-footnote {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.45rem;
		color: rgba(255, 255, 255, 0.2);
		text-align: center;
		margin: 0;
		letter-spacing: 0.05em;
	}
</style>
