<script lang="ts">
	import { INTEGRATIONS } from './landingContent.js';
</script>

<aside class="int-bar" aria-label="Platform integrations">
	<div class="int-bar__inner">
		<span class="int-bar__eyebrow">BUILT WITH</span>
		<ul class="int-bar__list" role="list">
			{#each INTEGRATIONS as item (item.id)}
				<li class="int-bar__item" role="listitem">
					<img
						class="int-bar__logo"
						src={item.src}
						alt={item.name}
						width={item.width}
						height={item.height}
						loading="lazy"
						decoding="async"
					/>
				</li>
			{/each}
		</ul>
	</div>
</aside>

<style>
	.int-bar {
		border-top: 1px solid rgb(30 41 59);
		border-bottom: 1px solid rgb(30 41 59);
		background: rgb(2 6 23);
		padding-block: clamp(1.25rem, 3vw, 2rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
	}

	.int-bar__inner {
		max-width: 1300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.int-bar__eyebrow {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.22em;
		color: rgb(148 163 184 / 0.55);
		font-weight: 600;
	}

	.int-bar__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: clamp(1.25rem, 3vw, 2.5rem);
	}

	.int-bar__logo {
		display: block;
		filter: grayscale(1) brightness(1.4) opacity(0.5);
		transition: filter 0.2s ease, opacity 0.2s ease;
	}

	.int-bar__logo:hover {
		filter: grayscale(0) brightness(1) opacity(1);
	}
</style>
