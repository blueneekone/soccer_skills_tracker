<script lang="ts">
	import { FINAL_CTA_FEATURES } from './landingContent.js';
</script>

<section class="fc-root" aria-labelledby="fc-heading">
	<div class="fc-glow" aria-hidden="true"></div>
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
			<a href="/setup" class="fc-cta fc-cta--primary">
				DEPLOY YOUR CLUB
				<span aria-hidden="true">→</span>
			</a>
			<a href="/pricing" class="fc-cta fc-cta--ghost">VIEW PRICING →</a>
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
		border-top: 1px solid var(--vanguard-border);
		text-align: center;
		overflow: hidden;
	}

	.fc-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse at center,
			color-mix(in srgb, var(--vanguard-cyan) 8%, transparent) 0%,
			transparent 65%
		);
		animation: fc-glow-drift 8s ease-in-out infinite alternate;
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
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.fc-h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.5rem, 4vw, 2.8rem);
		font-weight: 900;
		line-height: 1.12;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	.fc-sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.875rem, 1.5vw, 0.9375rem);
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

	.fc-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'JetBrains Mono', monospace;
		letter-spacing: 0.12em;
		text-decoration: none;
		border-radius: var(--vanguard-radius-sm);
		transition: all 0.25s;
	}

	.fc-cta--primary {
		padding: clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 3vw, 2.25rem);
		min-height: 52px;
		font-size: clamp(0.6rem, 1.5vw, 0.78rem);
		font-weight: 900;
		background: color-mix(in srgb, var(--vanguard-cyan) 10%, transparent);
		border: 1px solid var(--vanguard-border);
		color: var(--vanguard-cyan);
		box-shadow: 0 0 32px color-mix(in srgb, var(--vanguard-cyan) 22%, transparent);
	}

	.fc-cta--primary:hover {
		background: color-mix(in srgb, var(--vanguard-cyan) 18%, transparent);
		box-shadow: 0 0 60px color-mix(in srgb, var(--vanguard-cyan) 40%, transparent);
		transform: translateY(-3px);
	}

	.fc-cta--ghost {
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		color: var(--vanguard-text-3, #cbd5e1);
		padding: 0.5rem;
		border: none;
		background: none;
	}

	.fc-cta--ghost:hover {
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
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: var(--vanguard-text-3, #cbd5e1);
	}

	.fc-check-icon {
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
	}

	@keyframes fc-glow-drift {
		from {
			transform: translate(0, 0) scale(1);
		}
		to {
			transform: translate(0, -20px) scale(1.05);
		}
	}
</style>
