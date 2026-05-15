<script lang="ts">
	import { FINAL_CTA_FEATURES } from './landingContent.js';
</script>

<section class="fc-root" aria-labelledby="fc-heading">
	<div class="fc-inner">
		<span class="fc-eyebrow">DEPLOY NOW</span>
		<h2 class="fc-h2" id="fc-heading">
			Your club's command centre<br />is ready for deployment.
		</h2>
		<p class="fc-sub">
			$0 base fee. No credit card required. Migrate an existing roster in minutes with universal
			CSV ingestion.
		</p>
		<div class="fc-actions">
			<a href="/setup" class="tw-vanguard-btn-primary">
				DEPLOY YOUR CLUB →
			</a>
			<a href="/pricing" class="fc-link-cta">VIEW PRICING →</a>
		</div>
		<ul class="fc-checklist" aria-label="Included features">
			{#each FINAL_CTA_FEATURES as item (item)}
				<li class="fc-check">
					<span class="fc-check-icon" aria-hidden="true">✓</span>
					{item}
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.fc-root {
		position: relative;
		padding-block: clamp(5rem, 10vw, 8rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		border-top: 1px solid rgb(30 41 59);
		text-align: center;
		overflow: hidden;
		background: rgb(2 6 23);
	}

	.fc-inner {
		position: relative;
		z-index: 1;
		max-width: 720px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1.25rem, 3vw, 2rem);
	}

	.fc-eyebrow {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.fc-h2 {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 4vw, 2.8rem);
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	.fc-sub {
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.5vw, 1rem);
		font-weight: 400;
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.75;
		margin: 0;
		max-width: 540px;
	}

	.fc-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
		flex-wrap: wrap;
	}

	/* Plain mono link CTA — secondary weight, not a button */
	.fc-link-cta {
		font-family: var(--font-mono);
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--vanguard-text-3, #cbd5e1);
		text-decoration: none;
		transition: color 150ms ease;
		align-self: center;
	}

	.fc-link-cta:hover {
		color: var(--vanguard-text-1, #ffffff);
	}

	.fc-checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem clamp(0.75rem, 2vw, 1.5rem);
	}

	.fc-check {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: var(--vanguard-text-3, #cbd5e1);
	}

	.fc-check-icon {
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
	}

</style>
