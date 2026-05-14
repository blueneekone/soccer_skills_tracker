<script lang="ts">
	import { ANCHOR_CLUBS, INTEGRATIONS } from './landingContent.js';
</script>

<!--
	ClientLogoBar — Hybrid trust bar immediately below the hero.
	Top rail: "Trusted By" anchor club/NGB logos.
	Bottom rail: "Powered By" integration marks (accurate today).
	Sits flush, clipping visually to the hero via top border hairline.
-->
<aside class="clb-root" aria-label="Platform trust: clubs served and infrastructure partners">
	<div class="clb-inner">

		<!-- Trusted By rail -->
		<div class="clb-rail">
			<span class="clb-eyebrow tw-vanguard-section-header">TRUSTED BY ELITE CLUBS</span>
			<ul class="clb-logo-row" role="list" aria-label="Partner clubs">
				{#each ANCHOR_CLUBS as club (club.id)}
					<li class="clb-logo-item" role="listitem">
						<img
							class="clb-logo"
							src={club.src}
							alt={club.name}
							width={club.width}
							height={club.height}
							loading="lazy"
							decoding="async"
						/>
					</li>
				{/each}
			</ul>
		</div>

		<div class="clb-divider" aria-hidden="true"></div>

		<!-- Powered By rail -->
		<div class="clb-rail">
			<span class="clb-eyebrow tw-vanguard-section-header">POWERED BY ENTERPRISE-GRADE INFRASTRUCTURE</span>
			<ul class="clb-logo-row clb-logo-row--integrations" role="list" aria-label="Infrastructure partners">
				{#each INTEGRATIONS as int (int.id)}
					<li class="clb-logo-item" role="listitem">
						<img
							class="clb-logo clb-logo--integration"
							src={int.src}
							alt={int.name}
							width={int.width}
							height={int.height}
							loading="lazy"
							decoding="async"
						/>
					</li>
				{/each}
			</ul>
		</div>

	</div>
</aside>

<style>
	.clb-root {
		border-top: 1px solid var(--vanguard-border);
		background: color-mix(in srgb, var(--vanguard-glass) 80%, transparent);
		padding-block: clamp(1.5rem, 3.5vw, 2.5rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
	}

	.clb-inner {
		max-width: 1300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: clamp(1rem, 2.5vw, 1.75rem);
	}

	.clb-rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
	}

	.clb-eyebrow {
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.22em;
		opacity: 0.75;
	}

	.clb-logo-row {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: clamp(1rem, 3vw, 2.5rem);
	}

	.clb-logo-row--integrations {
		gap: clamp(0.85rem, 2.5vw, 2rem);
	}

	.clb-logo-item {
		display: flex;
		align-items: center;
	}

	.clb-logo {
		display: block;
		/* Monochrome + low-opacity idle state */
		filter: grayscale(1) brightness(1.5) opacity(0.45);
		transition:
			filter 0.2s ease,
			opacity 0.2s ease;
	}

	.clb-logo:hover {
		filter: grayscale(0) brightness(1) opacity(1);
	}

	.clb-logo--integration {
		filter: grayscale(1) brightness(1.4) opacity(0.35);
	}

	.clb-logo--integration:hover {
		filter: grayscale(0) brightness(1) opacity(0.9);
	}

	.clb-divider {
		width: 100%;
		height: 1px;
		background: var(--vanguard-border);
		max-width: 640px;
		margin: 0 auto;
		opacity: 0.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.clb-logo,
		.clb-logo--integration {
			transition: none;
		}
	}
</style>
