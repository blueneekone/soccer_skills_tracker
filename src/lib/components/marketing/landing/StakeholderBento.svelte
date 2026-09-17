<script lang="ts">
	import { STAKEHOLDERS } from './landingContent.js';
	import StakeholderCard from './StakeholderCard.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let isModalOpen = $state(false);
	let activeVideoUrl = $state<string | null>(null);
	let activeModalTitle = $state<string>('');

	function openDemo(roleId: string, headline: string) {
		let videoMap: Record<string, string> = {
			'directors': '/assets/video/director-os-demo.mp4',
			'coaches': '/assets/video/coach-os-demo.mp4',
			'athletes': '/assets/video/player-os-demo.mp4',
			'parents': '/assets/video/parent-os-demo.mp4'
		};

		const url = videoMap[roleId];
		if (url) {
			activeVideoUrl = url;
			activeModalTitle = headline;
			isModalOpen = true;
		}
	}
</script>

<section class="sb-section" aria-labelledby="sb-heading">
	<div class="sb-inner">
		<div class="sb-header">
			<span class="sb-eyebrow">WHO WE SERVE</span>
			<h2 class="sb-h2" id="sb-heading">
				One platform.<br />Every stakeholder.
			</h2>
			<p class="sb-sub">
				Director, coach, player, and parent workspaces share one household graph and one compliance
				model — without blending gamification into staff tools.
			</p>
		</div>
		<div class="sb-grid">
			{#each STAKEHOLDERS as card (card.id)}
				<StakeholderCard {card} gridLg={card.gridLg} onClick={['directors', 'coaches', 'athletes', 'parents'].includes(card.id) ? () => openDemo(card.id, card.headline) : undefined} />
			{/each}
		</div>
	</div>
</section>


<Modal bind:open={isModalOpen} maxWidth="1200px">
	{#snippet titleSlot()}
		<div class="tw-font-mono tw-font-bold tw-text-lg tw-text-white tw-tracking-widest tw-uppercase">
			{activeModalTitle} SHOWCASE
		</div>
	{/snippet}
	{#if activeVideoUrl}
		<div class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-overflow-hidden tw-shadow-[0_0_30px_rgba(20,184,166,0.15)] tw-p-1">
			<video
				class="tw-w-full tw-h-auto tw-rounded-lg tw-bg-[#000000]"
				src={activeVideoUrl}
				controls
				playsinline
				autoplay
				poster="/marketing/hero-poster.svg"
			>
				<track kind="captions" />
			</video>
		</div>
	{/if}
</Modal>


<style>
	.sb-section {
		padding-block: clamp(4rem, 8vw, 6rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		position: relative;
		background: #000000;
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
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.sb-h2 {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 4vw, 2.8rem);
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: var(--vanguard-text-1, #ffffff);
		margin: 0;
	}

	.sb-sub {
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.5vw, 1rem);
		font-weight: 400;
		color: var(--vanguard-text-2, #e2e8f0);
		line-height: 1.75;
		margin: 0;
		max-width: 520px;
	}

	.sb-grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: clamp(0.75rem, 1.25vw, 1.25rem);
		align-items: stretch;
	}

	@media (max-width: 63.99rem) {
		.sb-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
