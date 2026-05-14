<script lang="ts">
	import { STAKEHOLDERS } from './landingContent.js';
	import StakeholderCard from './StakeholderCard.svelte';
</script>

<section class="sb-section" aria-labelledby="sb-heading">
	<div class="sb-inner">
		<div class="sb-header">
			<span class="sb-eyebrow">WHO WE SERVE</span>
			<h2 class="sb-h2" id="sb-heading">
				One platform.<br />Every stakeholder.
			</h2>
			<p class="sb-sub">
				Nexus Command delivers tailored intelligence to every role — from the director's compliance
				dashboard to the athlete's RPG skill tree.
			</p>
		</div>
		<div class="sb-grid">
			{#each STAKEHOLDERS as card (card.id)}
				<StakeholderCard {card} />
			{/each}
		</div>
	</div>
</section>

<style>
	.sb-section {
		padding-block: clamp(4rem, 8vw, 6rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		position: relative;
	}

	.sb-inner {
		max-width: 1300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 4vw, 3.5rem);
	}

	.sb-header {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-width: 680px;
	}

	.sb-eyebrow {
		display: inline-block;
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.sb-h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.6rem, 4vw, 2.8rem);
		font-weight: 900;
		line-height: 1.1;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	.sb-sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.875rem, 1.5vw, 0.9375rem);
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.75;
		margin: 0;
		max-width: 520px;
	}

	.sb-grid {
		display: grid;
		grid-template-columns: repeat(
			auto-fit,
			minmax(min(100%, clamp(260px, 28vw, 360px)), 1fr)
		);
		gap: var(--bento-gap-md);
		align-items: stretch;
	}
</style>
