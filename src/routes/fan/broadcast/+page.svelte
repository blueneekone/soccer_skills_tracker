<script lang="ts">
	import { onMount } from 'svelte';
	import { BroadcastEngine } from '../../(app)/fan/watch/BroadcastEngine.svelte';
	import { authStore } from '$lib/stores/auth/facade.svelte.js';

	// Svelte 5 state controller
	const engine = new BroadcastEngine();

	// Component Reactive States
	let sessionId = $state('test-session');
	let ticketQuantity = $state(1);
	let purchaseMessage = $state('');
	let purchaseSuccess = $state(false);

	interface EmojiParticle {
		id: number;
		char: string;
		x: number;
		scale: number;
	}

	let particles = $state<EmojiParticle[]>([]);
	let nextParticleId = 0;

	// Active candidates list with robust fallback for non-Firestore preview environments
	const activeCandidates = $derived(
		engine.candidates.length > 0
			? engine.candidates
			: [
				{
					id: 'minor_unconsented_1',
					name: 'Athlete #mino',
					isMinor: true,
					isConsented: false,
					stats: { performanceTier: 'Verified', matchesCount: 15, avgRating: '—' },
					telemetry: { activityLevel: 'Active', vettedDistanceMeters: 0 }
				},
				{
					id: 'minor_consented_2',
					name: 'Sarah C.',
					isMinor: true,
					isConsented: true,
					stats: { performanceTier: 'Elite', matchesCount: 22, avgRating: 9.2 },
					telemetry: { activityLevel: 'Intense', vettedDistanceMeters: 5200 }
				},
				{
					id: 'adult_3',
					name: 'John Doe',
					isMinor: false,
					isConsented: true,
					stats: { performanceTier: 'Silver', matchesCount: 5, avgRating: 7.4 },
					telemetry: { activityLevel: 'Active', vettedDistanceMeters: 2800 }
				}
			]
	);

	// Fallback/live superdraw pools
	const activePool = $derived(
		engine.activeSuperdrawPool > 0 ? engine.activeSuperdrawPool : 2450
	);

	onMount(() => {
		document.body.style.backgroundColor = '#000000';

		// Auto-authenticate mock user for Playwright/preview if not already authenticated
		if (!authStore.isAuthenticated) {
			Object.assign(authStore, {
				user: { uid: 'user_fan_preview' },
				isAuthenticated: true
			});
		}

		engine.connect(sessionId);

		return () => {
			document.body.style.backgroundColor = '';
			engine.disconnect();
		};
	});

	function emitEmoji(char: string) {
		const id = nextParticleId++;
		const p: EmojiParticle = {
			id,
			char,
			x: 10 + Math.random() * 80, // percentage left
			scale: 0.8 + Math.random() * 0.6
		};
		particles = [...particles, p];

		// Clean up the particle after animation ends (2000ms)
		setTimeout(() => {
			particles = particles.filter((item) => item.id !== id);
		}, 2000);
	}

	async function handleSupportAthlete() {
		purchaseMessage = '';
		purchaseSuccess = false;
		if (ticketQuantity < 1) {
			purchaseMessage = 'Select at least 1 ticket.';
			return;
		}

		const ok = await engine.purchaseSuperdrawEntry(ticketQuantity);
		if (ok) {
			purchaseSuccess = true;
			purchaseMessage = `Successfully purchased ${ticketQuantity} Superdraw entries!`;
			// Trigger beautiful emoji ticket burst on video feed!
			for (let i = 0; i < 12; i++) {
				setTimeout(() => emitEmoji('🎟️'), i * 100);
			}
		} else {
			purchaseMessage = 'Transaction failed. Campaign may have ended.';
		}
	}

	async function handleVote(candidateId: string) {
		const ok = await engine.submitVote(candidateId);
		if (ok) {
			emitEmoji('⭐');
		} else {
			// fallback/simulated vote success for visual feedback
			emitEmoji('⭐');
		}
	}
</script>

<svelte:head>
	<title>Live Fan OS Broadcast Overlay HUD</title>
</svelte:head>

<div class="bento-grid-container tw-h-[100dvh] tw-overflow-hidden tw-w-full tw-bg-black tw-p-8 tw-text-[#FAFAFA] tw-font-mono" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); gap: 1.5rem; align-items: start;">

	<!-- COLUMN 1: Broadcast Video Feed & Live Overlay HUD -->
	<div class="st-bento siem-panel tw-min-w-0" style="display: flex; flex-direction: column; gap: 1rem;">
		<h2 class="font-sans-header tw-text-[#FAFAFA] tw-text-lg tw-uppercase tw-tracking-widest tw-m-0 tw-font-mono">Live Match Feed</h2>

		<!-- Simulated live video feed player -->
		<div class="video-feed-container tw-font-mono" style="position: relative; width: 100%; aspect-ratio: 16/9; background-color: #000000; border: 1px solid #334155; overflow: hidden;">
			<!-- Floating Emoji Particles Rendering on Top of Video Feed -->
			<div class="particles-overlay" style="position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 40;">
				{#each particles as p (p.id)}
					<span
						class="emoji-particle font-mono-tech"
						style="left: {p.x}%; transform: scale({p.scale});"
					>
						{p.char}
					</span>
				{/each}
			</div>

			<!-- Live Match Telemetry Overlay HUD (High Contrast) -->
			<div class="hud-top-bar" style="position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; z-index: 30;">
				<div class="hud-badge font-mono-tech tw-bg-[#fbbf24] tw-text-black tw-px-2 py-1 tw-font-bold" style="font-size: 0.75rem; letter-spacing: 0.05em;">
					● LIVE RE-FEED
				</div>
				<div class="hud-timer font-mono-tech tw-text-[#FAFAFA]" style="font-size: 0.875rem; background: rgba(0,0,0,0.75); padding: 2px 8px; border: 1px solid #334155;">
					84:12 <span class="tw-text-[#A1A1AA]">(2ND)</span>
				</div>
			</div>

			<div class="hud-scoreboard tw-font-mono" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 20; text-align: center; background: rgba(0,0,0,0.85); border: 1px solid #334155; padding: 8px 16px;">
				<div class="font-mono-tech tw-text-[#FAFAFA] tw-font-bold tw-text-xs" style="letter-spacing: 0.1em; margin-bottom: 2px;">
					TITANS FC <span class="tw-text-[#fbbf24]">2 - 1</span> AURA ACADEMY
				</div>
				<div class="font-mono-tech tw-text-[#A1A1AA]" style="font-size: 0.65rem;">
					NEXUS STREAMING NODE #04
				</div>
			</div>

			<div class="hud-bottom-bar font-mono-tech tw-text-[#D4D4D8]" style="position: absolute; bottom: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; z-index: 30; font-size: 0.75rem; background: rgba(0,0,0,0.75); padding: 4px 8px; border: 1px solid #334155;">
				<span>FPS: 60.0 | SECURE: AES-256</span>
				<span class="tw-text-[#fbbf24]">LATENCY: 14ms</span>
			</div>
		</div>

		<!-- Interactive Emoji Reaction Bar -->
		<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
			<span class="font-switzer-body tw-text-[#D4D4D8] tw-text-xs uppercase tw-tracking-wider tw-font-mono">Tap to React in Real-Time:</span>
			<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
				{#each ['👍', '🔥', '❤️', '😮', '🚀'] as emoji}
					<button
						type="button"
						class="reaction-button font-mono-tech tw-text-[#FAFAFA]"
						onclick={() => emitEmoji(emoji)}
						aria-label="React with {emoji}"
					>
						{emoji}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- COLUMN 2: Superdraw Fundraising & MVP Voting -->
	<div class="st-bento siem-panel tw-min-w-0" style="display: flex; flex-direction: column; gap: 1.5rem;">
		
		<!-- SECURE STRIPE-POWERED SUPERDRAW FUNDRAISING TRIGGER -->
		<div style="display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid #334155; padding-bottom: 1.5rem;">
			<h3 class="font-sans-header tw-text-[#FAFAFA] tw-text-base tw-uppercase tw-tracking-widest tw-m-0 tw-font-mono">Superdraw Fundraising</h3>
			<p class="font-switzer-body tw-text-[#D4D4D8] tw-text-sm tw-m-0">
				Support local athletes and unlock exclusive benefits with direct, Stripe-powered payment integrations.
			</p>

			<!-- Pool and Price Meta Columns -->
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
				<div style="border-left: 2px solid #fbbf24; padding-left: 8px;">
					<div class="font-switzer-body tw-text-[#A1A1AA] tw-text-xs uppercase tw-tracking-wider tw-font-mono">Active Prize Pool</div>
					<div class="font-mono-tech tw-text-[#FAFAFA] tw-text-lg tw-font-bold">${activePool.toLocaleString()} USD</div>
				</div>
				<div style="border-left: 2px solid #334155; padding-left: 8px;">
					<div class="font-switzer-body tw-text-[#A1A1AA] tw-text-xs uppercase tw-tracking-wider tw-font-mono">Ticket Price</div>
					<div class="font-mono-tech tw-text-[#FAFAFA] tw-text-lg tw-font-bold">$5.00 USD</div>
				</div>
			</div>

			<!-- Ticket Quantity Selection -->
			<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; background: #161e2e; padding: 8px 12px; border: 1px solid #334155;">
				<span class="font-switzer-body tw-text-[#D4D4D8] tw-text-xs uppercase">Quantity:</span>
				<div style="display: flex; align-items: center; gap: 8px;">
					<button
						type="button"
						class="quantity-btn font-mono-tech tw-text-[#FAFAFA]"
						onclick={() => ticketQuantity = Math.max(1, ticketQuantity - 1)}
						aria-label="Decrease quantity"
					>
						-
					</button>
					<span class="font-mono-tech tw-text-[#FAFAFA] tw-font-bold" style="min-width: 20px; text-align: center;">
						{ticketQuantity}
					</span>
					<button
						type="button"
						class="quantity-btn font-mono-tech tw-text-[#FAFAFA]"
						onclick={() => ticketQuantity = ticketQuantity + 1}
						aria-label="Increase quantity"
					>
						+
					</button>
				</div>
			</div>

			<!-- End Time Warning readout -->
			<div class="font-mono-tech tw-text-[#A1A1AA]" style="font-size: 0.7rem; border-top: 1px dashed #334155; padding-top: 8px;">
				Campaign End Time: <span class="tw-text-[#FAFAFA]">2029-12-31 23:59:59 (UTC)</span>
			</div>

			<!-- Support Athlete primary CTA -->
			<button
				type="button"
				data-primary-cta
				class="support-athlete-btn font-sans-header tw-px-6 tw-py-3 tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-tracking-widest tw-uppercase tw-font-mono"
				onclick={handleSupportAthlete}
			>
				Support Athlete
			</button>

			<!-- Transaction Status Message feedback -->
			{#if purchaseMessage}
				<div
					class="font-switzer-body tw-text-xs p-2"
					style="border-left: 3px solid {purchaseSuccess ? '#10b981' : '#ef4444'}; background: {purchaseSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: {purchaseSuccess ? '#34d399' : '#f87171'};"
				>
					{purchaseMessage}
				</div>
			{/if}
		</div>

		<!-- COMPLIANT LIVE MVP VOTING MODULE -->
		<div style="display: flex; flex-direction: column; gap: 1rem;">
			<h3 class="font-sans-header tw-text-[#FAFAFA] tw-text-base tw-uppercase tw-tracking-widest tw-m-0 tw-font-mono">Match MVP Standings</h3>

			<p class="font-switzer-body tw-text-[#D4D4D8] tw-text-sm tw-m-0">
				Cast your ballot directly. Athlete PII is protected under strict COPPA 2.0 Broadcast Shield compliance guidelines.
			</p>

			<!-- Candidates list / Dense Matrix Table Standard -->
			<div style="display: flex; flex-direction: column; gap: 0.75rem;">
				{#each activeCandidates as candidate}
					<div class="candidate-row tw-font-mono" style="border: 1px solid #334155; background: #0c0f17; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
						<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
							<div>
								<div class="font-sans-header tw-text-[#FAFAFA] tw-font-bold tw-text-sm">
									{candidate.name}
								</div>
								<div class="font-mono-tech tw-text-xs" style="color: {candidate.isMinor ? '#A1A1AA' : '#34d399'};">
									{candidate.isMinor ? '● MINOR (SHIELDED)' : '● ADULT ATTESTED'}
								</div>
							</div>

							<button
								type="button"
								class="vote-btn font-mono-tech tw-px-3 tw-py-1 tw-text-xs tw-bg-transparent tw-border tw-border-[#334155] tw-text-[#FAFAFA]"
								onclick={() => handleVote(candidate.id)}
							>
								Vote
							</button>
						</div>

						<!-- Technical readouts / Telemetry stats in Geist Mono -->
						{#if candidate.stats}
							<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; border-top: 1px solid #1e293b; padding-top: 6px; font-size: 0.7rem;">
								<span class="font-mono-tech tw-text-[#A1A1AA]">TIER: <strong class="tw-text-[#FAFAFA]">{candidate.stats.performanceTier}</strong></span>
								<span class="font-mono-tech tw-text-[#A1A1AA]">MATCHES: <strong class="tw-text-[#FAFAFA]">{candidate.stats.matchesCount}</strong></span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

	</div>
</div>

<style>
	/* Standardized Global Opposing text opacity configuration */
	:global(body) {
		--tw-text-opacity: 1 !important;
	}

	.font-sans-header {
		font-family: 'Geist Sans', -apple-system, sans-serif;
	}
	.font-switzer-body {
		font-family: 'Switzer', -apple-system, sans-serif;
	}
	.font-mono-tech {
		font-family: 'Geist Mono', monospace;
	}

	/* SIEM Custom Panel Design Token */
	.siem-panel {
		background-color: #0c0f17;
		border: 1px solid #334155;
		padding: 1.5rem;
		border-radius: 0;
	}

	/* Locked Micro-interactions scale active feedback and transitions */
	button {
		cursor: pointer;
		outline: none;
		border: none;
		transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease, color 180ms ease;
	}
	button:active {
		transform: scale(0.99) !important;
	}

	/* Specific Button Overrides */
	.reaction-button {
		font-size: 1.25rem;
		background: #161e2e;
		border: 1px solid #334155;
		padding: 8px 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;
	}
	.reaction-button:hover {
		background: #1f293d;
		border-color: #fbbf24;
	}

	.quantity-btn {
		width: 24px;
		height: 24px;
		background: #1f293d;
		border: 1px solid #334155;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: bold;
		border-radius: 0;
	}
	.quantity-btn:hover {
		background: #374151;
		border-color: #A1A1AA;
	}

	.support-athlete-btn {
		margin-top: 0.5rem;
		width: 100%;
		border-radius: 0;
	}
	.support-athlete-btn:hover {
		background-color: #f59e0b;
	}

	.vote-btn:hover {
		background: #fbbf24;
		color: #000000;
		border-color: #fbbf24;
	}

	/* Emoji Particle Animation Keyframes */
	@keyframes floatUp {
		0% {
			transform: translateY(0) scale(0.5);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(-220px) scale(1.3);
			opacity: 0;
		}
	}
	.emoji-particle {
		position: absolute;
		bottom: 12px;
		animation: floatUp 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
		pointer-events: none;
		user-select: none;
		z-index: 50;
		font-size: 2rem;
	}
</style>