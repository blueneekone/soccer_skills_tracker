<script lang="ts">
	import { WIN_MESSAGE, COMPARE_ROWS, MOAT_PILLARS } from './landingContent.js';
</script>

<section class="cp" aria-labelledby="cp-heading">
	<div class="cp__inner">
		<p class="cp__eyebrow">WHY SSTRACKER</p>
		<h2 id="cp-heading" class="cp__sr-only">How SSTracker compares in the category</h2>

		<blockquote class="cp__win">
			<p>{WIN_MESSAGE}</p>
		</blockquote>

		<div class="cp__compare" role="list" aria-label="Category comparison">
			{#each COMPARE_ROWS as row (row.id)}
				<div
					class="cp__row"
					class:cp__row--us={row.id === 'sstracker'}
					role="listitem"
				>
					<span class="cp__platform">{row.platform}</span>
					<span class="cp__tag">{row.tagline}</span>
				</div>
			{/each}
		</div>

		<div class="cp__pillars">
			{#each MOAT_PILLARS as pillar (pillar.id)}
				<article class="cp__pillar">
					<h3 class="cp__pillar-title">{pillar.title}</h3>
					<p class="cp__pillar-body">{pillar.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.cp {
		padding: clamp(3.5rem, 6vw, 5.5rem) clamp(1rem, 5vw, 3rem);
		background: #020617;
		border-top: 1px solid rgba(51, 65, 85, 0.4);
		border-bottom: 1px solid rgba(51, 65, 85, 0.4);
	}

	.cp__inner {
		max-width: 960px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: clamp(1.75rem, 4vw, 2.5rem);
	}

	.cp__eyebrow {
		margin: 0;
		font-family: 'Geist Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: #14b8a6;
		text-transform: uppercase;
	}

	.cp__sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.cp__win {
		margin: 0;
		padding: 0;
		border: none;
	}

	.cp__win p {
		margin: 0;
		font-family: 'Geist Sans', var(--font-display, sans-serif);
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		font-weight: 600;
		line-height: 1.45;
		letter-spacing: -0.02em;
		color: #ffffff;
	}

	.cp__compare {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.cp__row {
		display: grid;
		grid-template-columns: minmax(8rem, 11rem) 1fr;
		gap: 0.75rem 1.25rem;
		padding: 0.85rem 1.25rem;
		border-radius: 8px;
		border: 1px solid rgba(51, 65, 85, 0.5);
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(8px);
		transition: all 0.2s ease;
	}

	@media (max-width: 540px) {
		.cp__row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}

	.cp__row--us {
		border-color: rgba(20, 184, 166, 0.7);
		background: rgba(20, 184, 166, 0.08);
		box-shadow: 0 0 25px rgba(20, 184, 166, 0.12);
	}

	.cp__platform {
		font-family: 'Geist Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #e2e8f0;
		align-self: center;
	}

	.cp__row--us .cp__platform {
		color: #14b8a6;
	}

	.cp__tag {
		font-family: 'Switzer', var(--font-sans, sans-serif);
		font-size: 0.875rem;
		line-height: 1.5;
		color: #94a3b8;
		align-self: center;
	}

	.cp__row--us .cp__tag {
		color: #f1f5f9;
	}

	.cp__pillars {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.cp__pillars {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.cp__pillar {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 1.35rem 1.35rem;
		border-radius: 8px;
		border: 1px solid rgba(51, 65, 85, 0.6);
		background: rgba(15, 23, 42, 0.7);
		backdrop-filter: blur(12px);
		transition: all 0.2s ease;
	}

	.cp__pillar:hover {
		border-color: rgba(251, 191, 36, 0.5);
		transform: translateY(-2px);
	}

	.cp__pillar-title {
		margin: 0 0 0.4rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #fbbf24;
	}

	.cp__pillar-body {
		margin: 0;
		font-family: 'Switzer', var(--font-sans, sans-serif);
		font-size: 0.8125rem;
		line-height: 1.6;
		color: #94a3b8;
	}
</style>
