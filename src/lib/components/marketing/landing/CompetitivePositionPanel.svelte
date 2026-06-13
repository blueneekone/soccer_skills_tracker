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
		padding: clamp(3rem, 7vw, 5rem) clamp(1rem, 5vw, 3rem);
		background: linear-gradient(180deg, rgb(2 6 23) 0%, rgb(15 23 42 / 0.55) 100%);
		border-bottom: 1px solid rgb(30 41 59);
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
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgb(148 163 184 / 0.7);
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
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 3.2vw, 1.75rem);
		font-weight: 600;
		line-height: 1.45;
		letter-spacing: -0.02em;
		color: rgb(248 250 252);
	}

	.cp__compare {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.cp__row {
		display: grid;
		grid-template-columns: minmax(7rem, 9rem) 1fr;
		gap: 0.75rem 1rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid rgb(51 65 85 / 0.45);
		background: rgb(15 23 42 / 0.35);
	}

	@media (max-width: 540px) {
		.cp__row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}

	.cp__row--us {
		border-color: rgb(20 184 166 / 0.45);
		background: rgb(20 184 166 / 0.08);
	}

	.cp__platform {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: rgb(226 232 240);
	}

	.cp__row--us .cp__platform {
		color: rgb(94 234 212);
	}

	.cp__tag {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		line-height: 1.5;
		color: rgb(148 163 184);
	}

	.cp__row--us .cp__tag {
		color: rgb(226 232 240);
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
		padding: 1rem 1.1rem;
		border-radius: 10px;
		border: 1px solid rgb(51 65 85 / 0.35);
		background: rgb(2 6 23 / 0.5);
	}

	.cp__pillar-title {
		margin: 0 0 0.4rem;
		font-size: 0.8125rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgb(251 191 36);
	}

	.cp__pillar-body {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.55;
		color: rgb(203 213 225);
	}
</style>
