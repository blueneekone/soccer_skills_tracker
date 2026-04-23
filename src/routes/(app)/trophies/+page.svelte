<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Modal from '$lib/components/Modal.svelte';
	import confetti from 'canvas-confetti';
	import '$lib/styles/director-os.css';

	const profile = $derived(authStore.userProfile);

	const RANKS = [
		{ id: 'badgeRookie', name: 'ROOKIE', xp: 0, cls: 'medal-rookie' },
		{ id: 'badgeStarter', name: 'STARTER', xp: 500, cls: 'medal-starter' },
		{ id: 'badgeVeteran', name: 'VETERAN', xp: 1000, cls: 'medal-veteran' },
		{ id: 'badgePro', name: 'PRO', xp: 2000, cls: 'medal-pro' },
		{ id: 'badgeLegend', name: 'LEGEND', xp: 3000, cls: 'medal-legend' }
	];

	let totalMins = $state(0);
	let totalSessions = $state(0);

	const xp = $derived(totalMins * 2);
	const unlockedRankIdx = $derived(
		RANKS.reduce((idx, r, i) => (xp >= r.xp ? i : idx), 0)
	);

	// Milestone badges
	const badge7Day = $derived(false); // Calculated from streak - simplified
	const badge100Sessions = $derived(totalSessions >= 100);
	const badge1000Mins = $derived(totalMins >= 1000);

	let certModalOpen = $state(false);

	const claimCertificate = () => {
		if (unlockedRankIdx < RANKS.length - 1) {
			alert('Reach LEGEND rank (3000 XP) to claim your certificate!');
			return;
		}
		certModalOpen = true;
		confetti({ particleCount: 150, spread: 90, origin: { y: 0.4 }, colors: ['#0f172a', '#fbbf24', '#3b82f6'] });
	};

	const certDate = $derived(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

	$effect(() => {
		if (!profile?.playerName || !profile?.teamId) return;
		getDocs(query(collection(db, 'reps'), where('player', '==', profile.playerName), where('teamId', '==', profile.teamId)))
			.then((snap) => {
				totalSessions = snap.size;
				totalMins = 0;
				snap.forEach((d) => { totalMins += Number(d.data().minutes || 0); });
			})
			.catch(console.error);
	});
</script>

<div class="ec-page ec-trophies view-section">
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-4">
		<div class="tw-min-w-0 tw-col-span-1 xl:tw-col-span-12">
			<h2 class="view-title">Achievements</h2>

			<div class="bento-section">
		<div class="card">
			<div class="card-header trophy-header">Rank medals</div>
			<div class="card-body text-center overflow-x-auto">
				<div class="trophy-flex">
					{#each RANKS as rank, i}
						<div class="medal-container" class:medal-locked={i > unlockedRankIdx}>
							<div class="medal-coin {rank.cls}" aria-hidden="true">
								<span class="medal-coin-letter">{rank.name.charAt(0)}</span>
							</div>
							<div class="medal-title" class:legend-title-color={rank.name === 'LEGEND'}>{rank.name}</div>
							<div class="medal-xp">{rank.xp} XP</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header milestone-header">Milestone badges</div>
			<div class="card-body text-center overflow-x-auto">
				<div class="trophy-flex milestone-flex">
					<div class="medal-container" class:medal-locked={!badge7Day}>
						<div class="milestone-badge-shell" aria-hidden="true"><i class="ph ph-fire"></i></div>
						<div class="medal-title">7-DAY STREAK</div>
					</div>
					<div class="medal-container" class:medal-locked={!badge100Sessions}>
						<div class="milestone-badge-shell" aria-hidden="true"><i class="ph ph-medal"></i></div>
						<div class="medal-title">100 SESSIONS</div>
					</div>
					<div class="medal-container" class:medal-locked={!badge1000Mins}>
						<div class="milestone-badge-shell" aria-hidden="true"><i class="ph ph-timer"></i></div>
						<div class="medal-title">1000 MINS</div>
					</div>
					<div class="medal-container medal-locked">
						<div class="milestone-badge-shell" aria-hidden="true"><i class="ph ph-sword"></i></div>
						<div class="medal-title">WEEKEND WARRIOR</div>
					</div>
				</div>
			</div>
		</div>
	</div>

			<div class="text-center">
				<button class="primary-btn btn-claim-cert" onclick={claimCertificate}>Claim certificate</button>
			</div>

			<!-- Certificate Modal -->
			<Modal bind:open={certModalOpen} maxWidth="800px" certStyle={true}>
		{#snippet titleSlot()}
			<span>Certificate of Achievement</span>
		{/snippet}
		<div id="printableCertificate">
			<div class="cert-border"></div>
			<div class="cert-icon" aria-hidden="true"><i class="ph ph-seal-check"></i></div>
			<h1 class="cert-title">Certificate of Achievement</h1>
			<p class="cert-subtitle">This certifies that</p>
			<h2 class="cert-player-name">{profile?.playerName || 'Player'}</h2>
			<p class="cert-body-text">
				Has successfully completed the rigorous training requirements to achieve the rank of
				<strong>LEGEND</strong>. Through dedication, consistency, and hard work, they have mastered
				the brilliant basics of the game.
			</p>
			<div class="cert-footer">
				<div class="text-center">
					<div class="cert-date-line">{certDate}</div>
					<div class="cert-label">Awarded On</div>
				</div>
				<div class="text-center">
					<h3 class="cert-signature-title">SSTRACKER</h3>
					<div class="cert-label">Official Club Record</div>
				</div>
			</div>
		</div>
		<div class="text-center no-print cert-buttons">
			<button class="primary-btn btn-print" onclick={() => window.print()}>Print certificate</button>
			<button class="secondary-btn" onclick={() => (certModalOpen = false)}>Close</button>
		</div>
			</Modal>
		</div>
	</div>
</div>

<style>
	.ec-trophies .card-body {
		padding: 0.75rem;
	}

	.ec-trophies .trophy-flex {
		gap: 1rem;
	}

	.ec-trophies .medal-container {
		padding: 0.75rem;
	}

	.milestone-header {
		font-size: 1rem;
		color: var(--muted-slate);
		letter-spacing: 2px;
		justify-content: center;
		border-bottom: none;
	}
	.btn-claim-cert {
		margin: clamp(16px, 3vw, 24px) auto;
		padding: clamp(14px, 2vw, 18px) clamp(24px, 4vw, 40px);
	}
	.cert-buttons {
		display: flex;
		gap: 12px;
		justify-content: center;
		padding: 16px;
	}
</style>
