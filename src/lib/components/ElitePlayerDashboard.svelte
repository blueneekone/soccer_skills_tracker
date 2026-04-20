<script>
	import { browser } from '$app/environment';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';

	const SESSION_KEY = 'elite_xp_pulse';

	/** @type {number} */
	let totalXpLive = $state(0);
	let repsWeek = $state(0);
	let minsWeek = $state(0);
	let streakDays = $state(0);
	let loading = $state(true);

	/** Displayed total XP (may animate). */
	let displayXp = $state(0);
	let barFill = $state(0);

	let animating = $state(false);

	const levelInfo = $derived(getLevelProgressFromTotalXp(displayXp));

	const nextMilestone = $derived.by(() => {
		const remaining = levelInfo.xpToNext - levelInfo.xpIntoLevel;
		if (remaining <= 0) return 'Level up — keep grinding!';
		return `${Math.ceil(remaining).toLocaleString()} XP to Level ${levelInfo.level + 1}`;
	});

	/**
	 * @param {number} from
	 * @param {number} to
	 */
	function runXpPulse(from, to) {
		const a = Math.max(0, Math.floor(from));
		const b = Math.max(0, Math.floor(to));
		const duration = 950;
		const t0 = performance.now();
		animating = true;
		displayXp = a;
		barFill = getLevelProgressFromTotalXp(a).progress;

		function easeOut(t) {
			return 1 - Math.pow(1 - t, 3);
		}

		function frame(now) {
			const u = Math.min(1, (now - t0) / duration);
			const x = a + (b - a) * easeOut(u);
			displayXp = Math.floor(x);
			barFill = getLevelProgressFromTotalXp(displayXp).progress;
			if (u < 1) {
				requestAnimationFrame(frame);
			} else {
				displayXp = b;
				const fin = getLevelProgressFromTotalXp(b);
				barFill = fin.progress;
				animating = false;
			}
		}
		requestAnimationFrame(frame);
	}

	$effect(() => {
		if (!browser || !authStore.user?.uid) {
			loading = false;
			return;
		}
		const uid = authStore.user.uid;
		const ref = doc(db, 'player_stats', uid);
		const unsub = onSnapshot(
			ref,
			(snap) => {
				loading = false;
				if (!snap.exists()) {
					totalXpLive = 0;
					repsWeek = 0;
					minsWeek = 0;
					streakDays = 0;
					if (!animating) {
						displayXp = 0;
						barFill = 0;
					}
					return;
				}
				const d = snap.data();
				totalXpLive = Math.floor(Number(d.total_xp) || 0);
				repsWeek = Math.floor(Number(d.reps_this_week) || 0);
				minsWeek = Math.floor(Number(d.minutes_this_week) || 0);
				streakDays = Math.floor(Number(d.streak_days) || 0);

				const raw = sessionStorage.getItem(SESSION_KEY);
				if (raw) {
					sessionStorage.removeItem(SESSION_KEY);
					try {
						const p = JSON.parse(raw);
						const from = Number(p.fromTotal);
						const to = Number(p.toTotal);
						if (Number.isFinite(from) && Number.isFinite(to)) {
							runXpPulse(from, to);
							return;
						}
					} catch {
						/* ignore */
					}
				}
				if (!animating) {
					displayXp = totalXpLive;
					barFill = getLevelProgressFromTotalXp(totalXpLive).progress;
				}
			},
			(err) => {
				console.error('[ElitePlayerDashboard]', err);
				loading = false;
			}
		);
		return () => unsub();
	});
</script>

<div class="elite-dash player-portal-theme">
	<div class="elite-dash__glow" aria-hidden="true"></div>
	<div class="elite-dash__header">
		<span class="elite-dash__badge">Elite Player</span>
		<h2 class="elite-dash__title">Your command center</h2>
		<p class="elite-dash__sub">Level {levelInfo.level} · {totalXpLive.toLocaleString()} total XP</p>
	</div>

	<div class="elite-dash__hero">
		<LevelProgressRing totalXp={displayXp} level={levelInfo.level} />
		<div class="elite-dash__level-card">
			<div class="elite-dash__level-row">
				<span class="elite-dash__level-num">Lv {levelInfo.level}</span>
				<span class="elite-dash__xp-inline">
					{levelInfo.xpIntoLevel.toLocaleString()} / {levelInfo.xpToNext.toLocaleString()}
					<span class="elite-dash__xp-denom">XP this level</span>
				</span>
			</div>
			<div
				class="elite-dash__bar-wrap"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={Math.round(barFill * 100)}
			>
				<div class="elite-dash__bar-fill" style="width: {Math.min(100, barFill * 100)}%"></div>
			</div>
			<p class="elite-dash__milestone">{nextMilestone}</p>
		</div>
	</div>

	<div class="elite-dash__stats">
		<div class="elite-dash__stat">
			<span class="elite-dash__stat-val">{loading ? '—' : streakDays}</span>
			<span class="elite-dash__stat-label">Day streak</span>
		</div>
		<div class="elite-dash__stat">
			<span class="elite-dash__stat-val">{loading ? '—' : repsWeek.toLocaleString()}</span>
			<span class="elite-dash__stat-label">Reps this week</span>
		</div>
		<div class="elite-dash__stat">
			<span class="elite-dash__stat-val">{loading ? '—' : minsWeek.toLocaleString()}</span>
			<span class="elite-dash__stat-label">Minutes this week</span>
		</div>
	</div>
</div>

<style>
	.elite-dash {
		position: relative;
		overflow: hidden;
		border-radius: var(--radius-premium);
		padding: clamp(18px, 4vw, 24px);
		margin-bottom: clamp(16px, 3vw, 22px);
		background: linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.98) 100%);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: var(--shadow-liquid);
	}
	.elite-dash__glow {
		position: absolute;
		inset: -40% -20% auto auto;
		width: 60%;
		height: 120px;
		background: radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 45%, transparent) 0%, transparent 70%);
		pointer-events: none;
		opacity: 0.85;
	}
	.elite-dash__hero {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		gap: clamp(16px, 3vw, 22px);
		margin-bottom: 1rem;
	}

	.elite-dash__hero .elite-dash__level-card {
		flex: 1 1 200px;
		margin-bottom: 0;
	}

	.elite-dash__header {
		position: relative;
		z-index: 1;
		margin-bottom: 1rem;
	}
	.elite-dash__badge {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--brand-primary);
		margin-bottom: 0.35rem;
	}
	.elite-dash__title {
		margin: 0 0 0.25rem;
		font-size: clamp(1.25rem, 3.5vw, 1.5rem);
		font-weight: 900;
		color: #f8fafc;
		letter-spacing: -0.03em;
	}
	.elite-dash__sub {
		margin: 0;
		font-size: 0.88rem;
		color: rgba(226, 232, 240, 0.75);
	}
	.elite-dash__level-card {
		position: relative;
		z-index: 1;
		padding: 14px 16px;
		border-radius: 16px;
		background: rgba(15, 23, 42, 0.65);
		border: 1px solid rgba(100, 116, 139, 0.35);
		margin-bottom: 1rem;
	}
	.elite-dash__level-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 10px;
	}
	.elite-dash__level-num {
		font-size: 1.75rem;
		font-weight: 900;
		color: #f8fafc;
	}
	.elite-dash__xp-inline {
		font-size: 1rem;
		font-weight: 800;
		color: var(--brand-primary);
		text-align: right;
	}
	.elite-dash__xp-denom {
		display: block;
		font-size: 0.72rem;
		font-weight: 600;
		color: rgba(148, 163, 184, 0.95);
		margin-top: 2px;
	}
	.elite-dash__bar-wrap {
		height: 10px;
		border-radius: 999px;
		background: rgba(30, 41, 59, 0.9);
		overflow: hidden;
		border: 1px solid rgba(71, 85, 105, 0.5);
	}
	.elite-dash__bar-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--brand-primary), #a5b4fc);
		box-shadow: 0 0 18px color-mix(in srgb, var(--brand-primary) 55%, transparent);
		transition: width 0.08s linear;
	}
	.elite-dash__milestone {
		margin: 10px 0 0;
		font-size: 0.82rem;
		font-weight: 600;
		color: rgba(203, 213, 225, 0.95);
	}
	.elite-dash__stats {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.elite-dash__stat {
		padding: 12px 10px;
		border-radius: 14px;
		background: rgba(2, 6, 23, 0.55);
		border: 1px solid rgba(51, 65, 85, 0.6);
		text-align: center;
	}
	.elite-dash__stat-val {
		display: block;
		font-size: 1.35rem;
		font-weight: 900;
		color: #f8fafc;
		line-height: 1.2;
	}
	.elite-dash__stat-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(148, 163, 184, 0.95);
	}
</style>
