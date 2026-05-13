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
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: color-mix(in srgb, var(--vanguard-cyan) 65%, transparent);
		text-transform: uppercase;
	}

	.sb-h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.6rem, 4vw, 2.8rem);
		font-weight: 900;
		line-height: 1.1;
		color: white;
		margin: 0;
	}

	.sb-sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.62rem, 1.5vw, 0.76rem);
		color: rgba(255, 255, 255, 0.38);
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
