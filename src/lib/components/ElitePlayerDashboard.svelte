<script>
	import { browser } from '$app/environment';
	import { doc, onSnapshot, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import PlayerActionInbox from '$lib/components/shell/PlayerActionInbox.svelte';

	const SESSION_KEY = 'elite_xp_pulse';

	/** @type {number} */
	let totalXpLive = $state(0);
	let streakDays = $state(0);
	let xpWeek = $state(0);
	let loading = $state(true);
	let teamLabel = $state('');

	let displayXp = $state(0);
	let animating = $state(false);

	const profile = $derived(authStore.userProfile);
	const photoUrl = $derived(authStore.user?.photoURL || '');
	const displayName = $derived(
		typeof profile?.playerName === 'string' && profile.playerName.trim() ?
			profile.playerName.trim()
		:	'Player',
	);

	const levelInfo = $derived(getLevelProgressFromTotalXp(displayXp));

	/**
	 * @param {string} name
	 */
	function initials(name) {
		const p = name.trim().split(/\s+/).filter(Boolean);
		if (p.length === 0) return '?';
		if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
		return (p[0][0] + p[p.length - 1][0]).toUpperCase();
	}

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

		function easeOut(t) {
			return 1 - Math.pow(1 - t, 3);
		}

		function frame(now) {
			const u = Math.min(1, (now - t0) / duration);
			const x = a + (b - a) * easeOut(u);
			displayXp = Math.floor(x);
			if (u < 1) {
				requestAnimationFrame(frame);
			} else {
				displayXp = b;
				animating = false;
			}
		}
		requestAnimationFrame(frame);
	}

	$effect(() => {
		if (!browser || !profile?.teamId || profile.teamId === 'admin') {
			teamLabel = '';
			return;
		}
		const tid = profile.teamId;
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'teams', tid));
				if (cancelled) return;
				const n = snap.exists() ? snap.data()?.name : null;
				teamLabel = typeof n === 'string' && n.trim() ? n.trim() : tid;
			} catch {
				if (!cancelled) teamLabel = tid;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

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
					streakDays = 0;
					xpWeek = 0;
					if (!animating) displayXp = 0;
					return;
				}
				const d = snap.data();
				totalXpLive = Math.floor(Number(d.total_xp) || 0);
				streakDays = Math.floor(Number(d.streak_days) || 0);
				xpWeek = Math.floor(Number(d.xp_this_week) || 0);

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
				if (!animating) displayXp = totalXpLive;
			},
			(err) => {
				console.error('[ElitePlayerDashboard]', err);
				loading = false;
			},
		);
		return () => unsub();
	});
</script>

<div class="epd">
	<section class="epd__identity" aria-labelledby="epd-identity-h">
		<div class="epd__identity-left">
			{#if photoUrl}
				<img class="epd__avatar" src={photoUrl} alt="" width="64" height="64" />
			{:else}
				<div class="epd__avatar epd__avatar--fallback">{initials(displayName)}</div>
			{/if}
			<div class="epd__id-text">
				<p id="epd-identity-h" class="epd__name">{displayName}</p>
				{#if teamLabel}
					<p class="epd__team">{teamLabel}</p>
				{:else if profile?.teamId && profile.teamId !== 'admin'}
					<p class="epd__team epd__team--muted">Team loading…</p>
				{/if}
			</div>
		</div>
		<div class="epd__identity-ring">
			<LevelProgressRing
				totalXp={displayXp}
				level={levelInfo.level}
				variant="light"
				size="lg"
				showLevelSegment={true}
			/>
		</div>
	</section>

	<PlayerActionInbox />

	<section class="epd__trophy" aria-labelledby="epd-trophy-h">
		<h2 id="epd-trophy-h" class="epd__trophy-title">Trophy case</h2>
		<p class="epd__trophy-sub">Recent highlights & challenge tokens — powered by your effort.</p>
		<div class="epd__badge-grid">
			<div class="epd__badge">
				<div class="epd__badge-icon" aria-hidden="true">
					<svg viewBox="0 0 48 48" width="40" height="40" class="epd__svg">
						<circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25" />
						<path
							fill="currentColor"
							d="M24 8l2.2 6.8H33l-5.5 4 2.1 6.7L24 21.4l-5.6 4.1 2.1-6.7-5.5-4h6.8z"
						/>
					</svg>
				</div>
				<span class="epd__badge-label">Level {levelInfo.level}</span>
				<span class="epd__badge-meta">Tier milestone</span>
			</div>

			<div class="epd__badge">
				<div class="epd__badge-icon epd__badge-icon--amber" aria-hidden="true">
					<svg viewBox="0 0 48 48" width="40" height="40" class="epd__svg">
						<path
							fill="currentColor"
							d="M10 34c0-6 6.5-11 14-11s14 5 14 11H10zm14-15a7.5 7.5 0 10-0.01 0.01z"
						/>
					</svg>
				</div>
				<span class="epd__badge-label">
					{loading ? '…' : streakDays > 0 ? `${streakDays}-day streak` : 'Start a streak'}
				</span>
				<span class="epd__badge-meta">Consistency</span>
			</div>

			<div class="epd__badge">
				<div class="epd__badge-icon epd__badge-icon--violet" aria-hidden="true">
					<svg viewBox="0 0 48 48" width="40" height="40" class="epd__svg">
						<path
							fill="currentColor"
							d="M14 12h20v4H14v-4zm-2 8h24v18H12V20zm8 22v4h8v-4h-8z"
						/>
					</svg>
				</div>
				<span class="epd__badge-label">
					{loading ? '…' : `${xpWeek.toLocaleString()} XP`}
				</span>
				<span class="epd__badge-meta">This week</span>
			</div>

			<div class="epd__badge">
				<div class="epd__badge-icon epd__badge-icon--gold" aria-hidden="true">
					<svg viewBox="0 0 48 48" width="40" height="40" class="epd__svg">
						<path
							fill="currentColor"
							d="M10 36V20h6l4-8h8l4 8h6v16H10zm14-20c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"
						/>
					</svg>
				</div>
				<span class="epd__badge-label">{totalXpLive.toLocaleString()} XP</span>
				<span class="epd__badge-meta">Career total</span>
			</div>
		</div>
	</section>
</div>

<style>
	.epd {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.epd__identity {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 18px;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		box-sizing: border-box;
	}

	:global(html.dark) .epd__identity {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.epd__identity-left {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.epd__avatar {
		width: 64px;
		height: 64px;
		border-radius: 999px;
		object-fit: cover;
		border: 1px solid #e5e5e5;
		flex-shrink: 0;
	}

	.epd__avatar--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fafafa;
		font-weight: 900;
		font-size: 1.1rem;
		color: var(--text-primary);
	}

	:global(html.dark) .epd__avatar--fallback {
		background: #18181b;
	}

	.epd__id-text {
		min-width: 0;
	}

	.epd__name {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.epd__team {
		margin: 4px 0 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.epd__team--muted {
		opacity: 0.75;
	}

	.epd__identity-ring {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.epd__trophy {
		padding: 16px;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		box-sizing: border-box;
	}

	:global(html.dark) .epd__trophy {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.epd__trophy-title {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.epd__trophy-sub {
		margin: 0 0 14px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.epd__badge-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	@media (min-width: 640px) {
		.epd__badge-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.epd__badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
		padding: 12px 8px;
		border-radius: 12px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		box-sizing: border-box;
	}

	:global(html.dark) .epd__badge {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.epd__badge-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--brand-primary, #6366f1);
		background: color-mix(in srgb, var(--brand-primary, #6366f1) 12%, #ffffff);
		border: 1px solid color-mix(in srgb, var(--brand-primary, #6366f1) 28%, #e5e5e5);
	}

	.epd__badge-icon--amber {
		color: #c2410c;
		background: linear-gradient(145deg, #fff7ed, #ffedd5);
		border-color: rgba(245, 158, 11, 0.45);
	}

	.epd__badge-icon--violet {
		color: #5b21b6;
		background: color-mix(in srgb, #7c3aed 14%, #ffffff);
		border-color: rgba(124, 58, 237, 0.25);
	}

	.epd__badge-icon--gold {
		color: #92400e;
		background: linear-gradient(145deg, #fef9c3, #fde68a);
		border-color: rgba(245, 158, 11, 0.5);
	}

	.epd__svg {
		display: block;
	}

	.epd__badge-label {
		font-size: 0.78rem;
		font-weight: 900;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.epd__badge-meta {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}
</style>
