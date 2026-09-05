<script lang="ts">
	import { FINAL_CTA_FEATURES } from './landingContent.js';
</script>

<section class="fc-root" aria-labelledby="fc-heading">
	<div class="fc-inner">
		<span class="fc-eyebrow">GET STARTED</span>
		<h2 class="fc-h2" id="fc-heading">
			Launch your club on SSTracker<br />in minutes — not months.
		</h2>
		<p class="fc-sub">
			$0 platform fee. No credit card required. Import your roster and connect guardians on day
			one.
		</p>
		<div class="fc-actions">
			<a href="/setup" class="tw-btn-primary">
				GET STARTED — $0 PLATFORM FEE →
			</a>
			<a href="/pricing" class="fc-link-cta">VIEW PRICING →</a>
			<a href="/acquisition" class="fc-link-cta">STRATEGIC ACQUISITION →</a>
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
		padding-block: clamp(5rem, 8vw, 7.5rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		border-top: 1px solid rgba(51, 65, 85, 0.4);
		text-align: center;
		overflow: hidden;
		background: radial-gradient(circle at 50% 15%, rgba(20, 184, 166, 0.12) 0%, #000000 70%);
	}

	.fc-inner {
		position: relative;
		z-index: 1;
		max-width: 760px;
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
		color: #14b8a6;
		text-transform: uppercase;
	}

	.fc-h2 {
		font-family: 'Geist Sans', var(--font-display, sans-serif);
		font-size: clamp(1.75rem, 4vw, 3rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
		color: #ffffff;
		margin: 0;
	}

	.fc-sub {
		font-family: 'Switzer', var(--font-sans, sans-serif);
		font-size: clamp(1rem, 1.5vw, 1.125rem);
		font-weight: 400;
		color: #94a3b8;
		line-height: 1.7;
		margin: 0;
		max-width: 580px;
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
