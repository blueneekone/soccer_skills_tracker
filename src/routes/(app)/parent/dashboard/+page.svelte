<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';

	// Mock match data
	let matchData = $state<any>(null);
	let loading = $state(true);
	let isEmbargoed = $state(false);
	let attestationSigned = $state(false);
	let liftTime = $state<Date | null>(null);
	let countdown = $state('');

	$effect(() => {
		// Mock logic: fetching the latest match for the linked child
		// In a real app, this would query match_telemetry where playerUid in household
		loading = false;
		
		// Simulate a recent match under embargo
		const now = new Date();
		const lift = new Date(now.getTime() + 5 * 60000); // 5 minutes from now
		liftTime = lift;
		isEmbargoed = true;
		matchData = {
			opponent: 'FC Elite U14',
			date: now.toLocaleDateString(),
			rpe: 9,
			successRate: 35
		};
	});

	$effect(() => {
		if (isEmbargoed && liftTime) {
			const interval = setInterval(() => {
				const diff = liftTime!.getTime() - Date.now();
				if (diff <= 0) {
					isEmbargoed = false;
					countdown = '';
					clearInterval(interval);
				} else {
					const minutes = Math.floor(diff / 60000);
					const seconds = Math.floor((diff % 60000) / 1000);
					countdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;
				}
			}, 1000);
			return () => clearInterval(interval);
		}
	});

	function signAttestation() {
		attestationSigned = true;
	}
</script>

<div class="parent-dashboard">
	<header class="parent-header">
		<h1 class="parent-title">Parent OS</h1>
		<p class="parent-subtitle">Supporting your athlete's journey.</p>
	</header>

	<section class="match-panel" class:embargoed={isEmbargoed && !attestationSigned}>
		<div class="match-header">
			<h2 class="match-title">Latest Match: {matchData?.opponent}</h2>
			<span class="match-date">{matchData?.date}</span>
		</div>

		{#if isEmbargoed && !attestationSigned}
			<!-- Z2 Frosted Glass Overlay for The Car Ride Home Protocol -->
			<div class="embargo-overlay">
				<div class="embargo-content">
					<h3 class="embargo-title">The Car Ride Home</h3>
					<p class="embargo-desc">
						Match data is processing. We enforce a 15-minute cooling off period to preserve emotional safety.
						Ask them what they enjoyed most today!
					</p>
					{#if countdown}
						<div class="embargo-timer">Unlocks in {countdown}</div>
					{/if}
					
					<button class="btn-attest" onclick={signAttestation}>
						I acknowledge the emotional safety parameters
					</button>
				</div>
			</div>
		{/if}

		<div class="match-stats" class:blurred={isEmbargoed && !attestationSigned}>
			<div class="stat-box">
				<span class="stat-label">Effort (RPE)</span>
				<span class="stat-value">{matchData?.rpe}/10</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">Success Rate</span>
				<span class="stat-value">{matchData?.successRate}%</span>
			</div>
		</div>
	</section>
</div>

<style>
	.parent-dashboard {
		padding: 32px;
		max-width: 1200px;
		margin: 0 auto;
		background: #0f172a; /* Navy Slate base */
		min-height: 100vh;
	}

	.parent-header {
		margin-bottom: 32px;
	}

	.parent-title {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 2rem;
		color: #f8fafc;
		margin: 0 0 8px 0;
	}

	.parent-subtitle {
		font-family: var(--font-sans, system-ui, sans-serif);
		color: #94a3b8;
		margin: 0;
	}

	/* Navy Slate Z2 Panel */
	.match-panel {
		background: #1e293b; /* Structural Grey */
		border-radius: 24px; /* Flat, trusted aesthetic */
		padding: 32px;
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.match-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.match-title {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 1.25rem;
		color: #f8fafc;
		margin: 0;
	}

	.match-date {
		font-size: 0.875rem;
		color: #94a3b8;
	}

	.match-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 24px;
		transition: filter 0.3s ease;
	}

	.match-stats.blurred {
		filter: blur(10px);
		pointer-events: none;
		user-select: none;
	}

	.stat-box {
		background: #0f172a;
		padding: 24px;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stat-label {
		color: #94a3b8;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		color: #f8fafc;
		font-size: 2rem;
		font-weight: 700;
	}

	/* Frosted Glass Embargo Overlay */
	.embargo-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		border-radius: 24px;
	}

	.embargo-content {
		text-align: center;
		max-width: 400px;
		padding: 32px;
		background: rgba(30, 41, 59, 0.9);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.embargo-title {
		color: #f8fafc;
		font-size: 1.5rem;
		margin: 0 0 16px 0;
	}

	.embargo-desc {
		color: #cbd5e1;
		font-size: 1rem;
		line-height: 1.5;
		margin: 0 0 24px 0;
	}

	.embargo-timer {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: #14b8a6;
		font-size: 1.25rem;
		margin-bottom: 24px;
	}

	.btn-attest {
		background: #f8fafc;
		color: #0f172a;
		border: none;
		padding: 12px 24px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		width: 100%;
		transition: background 0.2s;
	}

	.btn-attest:hover {
		background: #e2e8f0;
	}
</style>
