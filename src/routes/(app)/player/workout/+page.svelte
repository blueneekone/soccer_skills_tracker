<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { tick } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import confetti from 'canvas-confetti';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const logTrainingSession = httpsCallable(functions, 'logTrainingSession');

	const uid = $derived(authStore.user?.uid || '');
	const profile = $derived(authStore.userProfile);

	/** @typedef {{ id: string, drillId: string, title: string, category: string, metricType: string, videoUrl: string, baseXp: number, dueMillis: number, dueLabel: string, sets: number, reps: number, duration: number, submitting: boolean, complete: boolean, err: string }} Quest */

	/** @type {Quest[]} */
	let quests = $state([]);
	let loading = $state(true);
	let loadError = $state('');
	let totalEarnedXp = $state(0);
	let justCompletedId = $state('');

	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated || authStore.role !== 'player' || !uid) {
			quests = [];
			loading = false;
			return;
		}
		loading = true;
		loadError = '';
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDocs(
					query(
						collection(db, 'assignments'),
						where('playerId', '==', uid),
						where('status', '==', 'pending'),
					),
				);
				if (cancelled) return;
				const drillIds = new Set();
				const base = [];
				for (const d of snap.docs) {
					const x = d.data() || {};
					const did = typeof x.drillId === 'string' ? x.drillId.trim() : '';
					if (did) drillIds.add(did);
					const dueMillis =
						x.dueDate && typeof x.dueDate.toMillis === 'function' ?
							x.dueDate.toMillis() :
							0;
					const dueLabel = dueMillis ?
						new Date(dueMillis).toLocaleString(undefined, {
							weekday: 'short',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: '2-digit',
						}) :
						'No due date';
					base.push({
						id: d.id,
						drillId: did,
						title:
							typeof x.drillTitle === 'string' && x.drillTitle.trim() ?
								x.drillTitle.trim() :
								'Assigned Drill',
						category: 'Homework',
						metricType: 'reps',
						videoUrl: '',
						baseXp: 10,
						dueMillis,
						dueLabel,
						sets: 3,
						reps: 20,
						duration: 15,
						submitting: false,
						complete: false,
						err: '',
					});
				}

				const byId = {};
				await Promise.all(
					[...drillIds].map(async (id) => {
						try {
							const ds = await getDoc(doc(db, 'drills', id));
							if (ds.exists()) byId[id] = ds.data();
						} catch {
							/* ignore */
						}
					}),
				);
				for (const q of base) {
					const dr = byId[q.drillId];
					if (dr) {
						q.category =
							typeof dr.category === 'string' ? dr.category : q.category;
						q.metricType =
							typeof dr.metricType === 'string' ? dr.metricType : q.metricType;
						q.videoUrl =
							typeof dr.videoUrl === 'string' ? dr.videoUrl : q.videoUrl;
						if (
							typeof dr.base_xp === 'number' &&
							!Number.isNaN(dr.base_xp)
						) {
							q.baseXp = Math.floor(dr.base_xp);
						}
						if (
							typeof dr.durationMinutes === 'number' &&
							!Number.isNaN(dr.durationMinutes)
						) {
							q.duration = Math.floor(dr.durationMinutes);
						}
					}
				}
				base.sort((a, b) => a.dueMillis - b.dueMillis);
				quests = base;
			} catch (e) {
				if (!cancelled) {
					loadError =
						e instanceof Error ? e.message : 'Could not load your quests.';
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function updateQuest(id, patch) {
		quests = quests.map((q) => (q.id === id ? { ...q, ...patch } : q));
	}

	function stepReps(id, delta) {
		const q = quests.find((x) => x.id === id);
		if (!q || q.submitting || q.complete) return;
		const next = Math.max(1, Math.min(999, q.reps + delta));
		updateQuest(id, { reps: next });
	}

	function stepSets(id, delta) {
		const q = quests.find((x) => x.id === id);
		if (!q || q.submitting || q.complete) return;
		const next = Math.max(1, Math.min(20, q.sets + delta));
		updateQuest(id, { sets: next });
	}

	function stepDuration(id, delta) {
		const q = quests.find((x) => x.id === id);
		if (!q || q.submitting || q.complete) return;
		const next = Math.max(1, Math.min(240, q.duration + delta));
		updateQuest(id, { duration: next });
	}

	async function submitQuest(q) {
		if (q.submitting || q.complete) return;
		if (!profile?.teamId || !profile?.playerName) {
			updateQuest(q.id, { err: 'Profile missing team — contact your coach.' });
			return;
		}
		updateQuest(q.id, { submitting: true, err: '' });
		try {
			const repTotal = Math.max(0, q.sets * q.reps);
			const payload = await logTrainingSession({
				drillType: `${q.title} (Homework)`.slice(0, 200),
				duration: q.duration,
				reps: repTotal,
				intensity: 'medium',
				assignmentId: q.id,
			});
			const data = payload.data || {};
			const earned =
				typeof data.earnedXP === 'number' ? Math.floor(data.earnedXP) : q.baseXp;
			totalEarnedXp += earned;
			justCompletedId = q.id;
			updateQuest(q.id, { submitting: false, complete: true, err: '' });
			await tick();
			fireCelebration();
			await authStore.refresh({ silent: true });
			setTimeout(() => {
				quests = quests.filter((x) => x.id !== q.id);
				justCompletedId = '';
			}, 1400);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Could not log this quest.';
			updateQuest(q.id, { submitting: false, err: msg });
		}
	}

	function fireCelebration() {
		if (typeof window === 'undefined') return;
		confetti({
			particleCount: 140,
			spread: 90,
			origin: { y: 0.55 },
			colors: ['#22d3ee', '#a855f7', '#f472b6', '#facc15'],
			ticks: 220,
		});
	}

	function openVideo(url) {
		if (!url) return;
		if (typeof window !== 'undefined') {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	}

	function goToStats() {
		goto('/stats');
	}

	const remainingCount = $derived(quests.filter((q) => !q.complete).length);
</script>

<svelte:head>
	<title>Today's Quests · SSTRACKER</title>
</svelte:head>

<section class="action-board">
	<header class="action-board__hero">
		<div class="action-board__hero-copy">
			<span class="action-board__eyebrow">Today's Quests</span>
			<h1 class="action-board__title">
				{#if loading}
					Loading your quests…
				{:else if quests.length === 0}
					You're All Caught Up
				{:else}
					{remainingCount} Quest{remainingCount === 1 ? '' : 's'} On Deck
				{/if}
			</h1>
			<p class="action-board__sub">
				Log each assigned drill with your real reps to earn XP and keep your streak alive.
			</p>
		</div>
		<div class="action-board__xp-pill" aria-live="polite">
			<span class="action-board__xp-label">Session XP</span>
			<span class="action-board__xp-value tabular-num">+{totalEarnedXp}</span>
		</div>
	</header>

	{#if loadError}
		<div class="action-board__alert" role="alert">{loadError}</div>
	{/if}

	{#if !loading && quests.length === 0}
		<div class="action-board__empty">
			<div class="action-board__empty-icon" aria-hidden="true">
				<i class="ph ph-check-circle"></i>
			</div>
			<h2>No Quests Assigned</h2>
			<p>
				Your coach hasn't pushed homework today. Log a self-training session in the tracker or rest up.
			</p>
			<button type="button" class="action-board__cta" onclick={goToStats}>
				<i class="ph ph-arrow-right" aria-hidden="true"></i>
				<span>Go to Stats</span>
			</button>
		</div>
	{/if}

	<div class="action-board__grid">
		{#each quests as q (q.id)}
			{#if !q.complete || q.id === justCompletedId}
				<article
					class="quest-card"
					class:is-complete={q.complete}
					in:fly={{ y: 16, duration: 260, easing: cubicOut }}
				>
					<div class="quest-card__aura" aria-hidden="true"></div>

					<header class="quest-card__head">
						<div class="quest-card__tags">
							<span class="quest-card__chip">{q.category}</span>
							<span class="quest-card__chip quest-card__chip--alt">{q.metricType}</span>
						</div>
						<span class="quest-card__due">
							<i class="ph ph-clock" aria-hidden="true"></i>
							{q.dueLabel}
						</span>
					</header>

					<h2 class="quest-card__title">{q.title}</h2>

					<div class="quest-card__xp">
						<i class="ph ph-lightning" aria-hidden="true"></i>
						<span class="tabular-num">+{q.baseXp}</span>
						<span class="quest-card__xp-tag">base XP</span>
					</div>

					<div class="quest-card__steppers">
						<div class="stepper">
							<span class="stepper__label">Reps</span>
							<div class="stepper__row">
								<button
									type="button"
									class="stepper__btn"
									onclick={() => stepReps(q.id, -1)}
									aria-label="Decrease reps"
									disabled={q.submitting || q.complete}
								>−</button>
								<span class="stepper__value tabular-num">{q.reps}</span>
								<button
									type="button"
									class="stepper__btn"
									onclick={() => stepReps(q.id, 1)}
									aria-label="Increase reps"
									disabled={q.submitting || q.complete}
								>+</button>
							</div>
						</div>

						<div class="stepper">
							<span class="stepper__label">Sets</span>
							<div class="stepper__row">
								<button
									type="button"
									class="stepper__btn"
									onclick={() => stepSets(q.id, -1)}
									aria-label="Decrease sets"
									disabled={q.submitting || q.complete}
								>−</button>
								<span class="stepper__value tabular-num">{q.sets}</span>
								<button
									type="button"
									class="stepper__btn"
									onclick={() => stepSets(q.id, 1)}
									aria-label="Increase sets"
									disabled={q.submitting || q.complete}
								>+</button>
							</div>
						</div>

						<div class="stepper">
							<span class="stepper__label">Minutes</span>
							<div class="stepper__row">
								<button
									type="button"
									class="stepper__btn"
									onclick={() => stepDuration(q.id, -1)}
									aria-label="Decrease minutes"
									disabled={q.submitting || q.complete}
								>−</button>
								<span class="stepper__value tabular-num">{q.duration}</span>
								<button
									type="button"
									class="stepper__btn"
									onclick={() => stepDuration(q.id, 1)}
									aria-label="Increase minutes"
									disabled={q.submitting || q.complete}
								>+</button>
							</div>
						</div>
					</div>

					{#if q.videoUrl}
						<button
							type="button"
							class="quest-card__video"
							onclick={() => openVideo(q.videoUrl)}
						>
							<i class="ph ph-play-circle" aria-hidden="true"></i>
							<span>Watch drill demo</span>
						</button>
					{/if}

					{#if q.err}
						<p class="quest-card__err" role="alert">{q.err}</p>
					{/if}

					<button
						type="button"
						class="quest-card__submit"
						onclick={() => submitQuest(q)}
						disabled={q.submitting || q.complete}
					>
						{#if q.complete}
							<span in:scale={{ duration: 200, start: 0.6 }}>
								<i class="ph ph-check-circle" aria-hidden="true"></i>
								Completed · +{q.baseXp} XP
							</span>
						{:else if q.submitting}
							<span>Logging…</span>
						{:else}
							<span>
								<i class="ph ph-lightning-fill" aria-hidden="true"></i>
								Log Quest · {q.sets * q.reps} reps
							</span>
						{/if}
					</button>
				</article>
			{/if}
		{/each}
	</div>

	<footer class="action-board__footer">
		<button type="button" class="action-board__footer-btn" onclick={goToStats}>
			<i class="ph ph-chart-line-up" aria-hidden="true"></i>
			<span>View Stats</span>
		</button>
	</footer>
</section>

<style>
	.action-board {
		position: relative;
		min-height: 100vh;
		padding: 28px clamp(16px, 4vw, 28px) 120px;
		background:
			radial-gradient(80% 60% at 50% -10%, rgba(168, 85, 247, 0.22), transparent 60%),
			radial-gradient(60% 40% at 100% 40%, rgba(34, 211, 238, 0.18), transparent 60%),
			#09090b;
		color: #fafafa;
		overflow: hidden;
	}

	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

	.action-board__hero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 24px;
	}

	.action-board__eyebrow {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(168, 85, 247, 0.16);
		color: #d8b4fe;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.action-board__title {
		margin: 10px 0 6px;
		font-size: clamp(1.65rem, 5vw, 2.1rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.action-board__sub {
		margin: 0;
		color: #a1a1aa;
		font-size: 14px;
		line-height: 1.5;
		max-width: 520px;
	}

	.action-board__xp-pill {
		display: inline-flex;
		align-items: baseline;
		gap: 10px;
		padding: 10px 16px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
	}

	.action-board__xp-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		font-weight: 800;
	}

	.action-board__xp-value {
		font-size: 22px;
		font-weight: 900;
		background: linear-gradient(135deg, #22d3ee, #a855f7);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.action-board__alert {
		padding: 12px 14px;
		border-radius: 12px;
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.3);
		color: #fecaca;
		font-size: 13.5px;
		margin-bottom: 18px;
	}

	.action-board__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48px 20px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		text-align: center;
	}

	.action-board__empty-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
		font-size: 36px;
		margin-bottom: 16px;
	}

	.action-board__empty h2 {
		margin: 0 0 6px;
		font-size: 1.35rem;
		font-weight: 800;
	}

	.action-board__empty p {
		margin: 0 0 18px;
		color: #a1a1aa;
		max-width: 420px;
		font-size: 14px;
	}

	.action-board__cta {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		border-radius: 12px;
		border: 0;
		background: linear-gradient(135deg, #22d3ee, #6366f1);
		color: #fff;
		font-weight: 800;
		font-size: 14px;
		cursor: pointer;
	}

	.action-board__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 20px;
	}

	.quest-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 22px;
		border-radius: 22px;
		background:
			linear-gradient(150deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)) padding-box,
			linear-gradient(150deg, rgba(168, 85, 247, 0.7), rgba(34, 211, 238, 0.35)) border-box;
		border: 1px solid transparent;
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		overflow: hidden;
		box-shadow:
			0 20px 40px -20px rgba(168, 85, 247, 0.35),
			0 4px 20px -8px rgba(0, 0, 0, 0.6);
		transition: transform 0.25s ease, box-shadow 0.25s ease;
	}

	.quest-card:hover {
		transform: translateY(-3px);
		box-shadow:
			0 30px 50px -22px rgba(168, 85, 247, 0.5),
			0 8px 30px -8px rgba(0, 0, 0, 0.7);
	}

	.quest-card.is-complete {
		background:
			linear-gradient(150deg, rgba(34, 197, 94, 0.18), rgba(34, 211, 238, 0.06)) padding-box,
			linear-gradient(150deg, rgba(34, 197, 94, 0.8), rgba(34, 211, 238, 0.4)) border-box;
	}

	.quest-card__aura {
		position: absolute;
		inset: -50% -20% auto auto;
		width: 260px;
		height: 260px;
		background: radial-gradient(circle, rgba(168, 85, 247, 0.3), transparent 65%);
		filter: blur(20px);
		pointer-events: none;
	}

	.quest-card__head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
	}

	.quest-card__tags {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.quest-card__chip {
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(168, 85, 247, 0.18);
		color: #e9d5ff;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.quest-card__chip--alt {
		background: rgba(34, 211, 238, 0.16);
		color: #a5f3fc;
	}

	.quest-card__due {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #a1a1aa;
		font-size: 11.5px;
		font-weight: 700;
	}

	.quest-card__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}

	.quest-card__xp {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		padding: 6px 12px;
		align-self: flex-start;
		border-radius: 999px;
		background: rgba(250, 204, 21, 0.12);
		border: 1px solid rgba(250, 204, 21, 0.28);
	}

	.quest-card__xp i {
		color: #facc15;
		font-size: 14px;
	}

	.quest-card__xp span:first-of-type {
		font-weight: 900;
		font-size: 18px;
		color: #fef08a;
	}

	.quest-card__xp-tag {
		color: #a1a1aa;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 700;
	}

	.quest-card__steppers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.stepper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 6px;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.stepper__label {
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		font-weight: 800;
	}

	.stepper__row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.stepper__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #fafafa;
		font-size: 18px;
		font-weight: 900;
		cursor: pointer;
		line-height: 1;
		transition: background 0.15s ease, transform 0.05s ease;
	}

	.stepper__btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.stepper__btn:active:not(:disabled) {
		transform: scale(0.92);
	}

	.stepper__btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.stepper__value {
		min-width: 52px;
		text-align: center;
		font-size: 26px;
		font-weight: 900;
		letter-spacing: -0.02em;
		background: linear-gradient(135deg, #fafafa, #a1a1aa);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.quest-card__video {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid rgba(147, 197, 253, 0.3);
		background: rgba(59, 130, 246, 0.08);
		color: #93c5fd;
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
	}

	.quest-card__video:hover {
		background: rgba(59, 130, 246, 0.18);
	}

	.quest-card__err {
		margin: 0;
		padding: 8px 10px;
		border-radius: 10px;
		background: rgba(248, 113, 113, 0.15);
		color: #fecaca;
		font-size: 12.5px;
	}

	.quest-card__submit {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		height: 52px;
		border-radius: 14px;
		border: 0;
		background: linear-gradient(135deg, #6366f1, #a855f7);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		letter-spacing: 0.02em;
		cursor: pointer;
		box-shadow: 0 10px 20px -10px rgba(168, 85, 247, 0.7);
		transition: transform 0.08s ease, box-shadow 0.2s ease;
	}

	.quest-card__submit:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 14px 26px -10px rgba(168, 85, 247, 0.9);
	}

	.quest-card__submit:active:not(:disabled) {
		transform: translateY(1px);
	}

	.quest-card.is-complete .quest-card__submit {
		background: linear-gradient(135deg, #22c55e, #10b981);
		cursor: default;
	}

	.quest-card__submit:disabled {
		opacity: 0.82;
		cursor: not-allowed;
	}

	.action-board__footer {
		margin-top: 28px;
		display: flex;
		justify-content: center;
	}

	.action-board__footer-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: #fafafa;
		font-weight: 700;
		font-size: 14px;
		cursor: pointer;
	}

	.action-board__footer-btn:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 500px) {
		.quest-card__steppers {
			grid-template-columns: repeat(3, 1fr);
		}
		.stepper__value {
			font-size: 22px;
		}
	}
</style>
