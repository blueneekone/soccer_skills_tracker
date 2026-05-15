<script lang="ts">
	import { ANCHOR_CLUBS } from './landingContent.js';
</script>

<!--
	Trusted-by rail below PoweredByStrip. Single minimal bordered row per Vanguard SIEM shell.
-->
<aside class="clb-root" aria-label="Clubs served">
	<div class="clb-inner">
		<div class="clb-rail">
			<span class="clb-eyebrow">TRUSTED BY ELITE CLUBS</span>
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
	</div>
</aside>

<style>
	.clb-root {
		border-top: 1px solid rgb(30 41 59);
		border-bottom: 1px solid rgb(30 41 59);
		background: rgb(2 6 23);
		padding-block: clamp(1.5rem, 3.5vw, 2.5rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
	}

	.clb-inner {
		max-width: 1300px;
		margin: 0 auto;
	}

	.clb-rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
	}

	.clb-eyebrow {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		letter-spacing: 0.22em;
		color: rgb(148 163 184 / 0.55);
		text-transform: uppercase;
		font-weight: 600;
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

	.clb-logo-item {
		display: flex;
		align-items: center;
	}

	.clb-logo {
		display: block;
		filter: grayscale(1) brightness(1.5) opacity(0.45);
		transition:
			filter 0.2s ease,
			opacity 0.2s ease;
	}

	.clb-logo:hover {
		filter: grayscale(0) brightness(1) opacity(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.clb-logo {
			transition: none;
		}
	}
</style>
