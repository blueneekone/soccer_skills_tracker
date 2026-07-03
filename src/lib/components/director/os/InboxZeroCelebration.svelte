<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { dopamineExplosion } from '$lib/services/dopamine.svelte.js';

	let { title = 'INBOX ZERO', message = 'All queues cleared. Excellent work.' } = $props();

	onMount(() => {
		// Massive, satisfying feedback loop for achieving Inbox Zero
		// Delay slightly so the UI has time to transition
		setTimeout(async () => {
			await dopamineExplosion('levelUp');
			await new Promise((r) => setTimeout(r, 300));
			await dopamineExplosion('loadoutUnlock', { x: 0.5, y: 0.6 });
		}, 100);
	});
</script>

<div class="iz-container">
	<div class="iz-shield">
		<Icon name="status.verified" size={64} class="iz-icon" />
		<div class="iz-glow"></div>
	</div>
	<h3 class="iz-title">{title}</h3>
	<p class="iz-message">{message}</p>
</div>

<style>
	.iz-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
		border: 1px solid rgba(16, 185, 129, 0.1);
		border-radius: 12px;
		min-height: 300px;
		animation: izFadeIn 0.5s ease-out forwards;
	}

	@keyframes izFadeIn {
		from { opacity: 0; transform: scale(0.98); }
		to { opacity: 1; transform: scale(1); }
	}

	.iz-shield {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
		border-radius: 50%;
		border: 1px solid rgba(16, 185, 129, 0.3);
		box-shadow: 0 0 32px rgba(16, 185, 129, 0.2);
	}

	:global(.iz-icon) {
		color: #10b981;
		z-index: 2;
		filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
	}

	.iz-glow {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: #10b981;
		filter: blur(24px);
		opacity: 0.3;
		z-index: 1;
		animation: izPulse 2s ease-in-out infinite alternate;
	}

	@keyframes izPulse {
		from { opacity: 0.2; transform: scale(1); }
		to { opacity: 0.4; transform: scale(1.1); }
	}

	.iz-title {
		margin: 0 0 0.5rem;
		font-family: 'Geist Mono', monospace;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		background: linear-gradient(to right, #34d399, #10b981);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		text-transform: uppercase;
	}

	.iz-message {
		margin: 0;
		font-family: 'Switzer', sans-serif;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.6);
		max-width: 400px;
	}
</style>
