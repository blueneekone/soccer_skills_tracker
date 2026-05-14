<script lang="ts">
	import { browser } from '$app/environment';
	import { doc, onSnapshot, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		getLevelProgressFromTotalXp,
		getCardTierFromLevel,
	} from '$lib/gamification/level.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import {
		getAttributeSchemaForSport,
		deriveSkillValuesForSchema,
	} from '$lib/utils/sport-attributes.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import PlayerActionInbox from '$lib/components/shell/PlayerActionInbox.svelte';
	import PlayerSkillRadar from '$lib/components/PlayerSkillRadar.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	const SESSION_KEY = 'elite_xp_pulse';

	/** @type {number} */
	let totalXpLive = $state(0);
	let streakDays = $state(0);
	let xpWeek = $state(0);
	let loading = $state(true);
	let teamLabel = $state('');
	/** Team-level `sport` override from `teams/{teamId}` (optional). */
	let teamSportFromDoc = $state(/** @type {string | null} */ (null));
	/** @type {Record<string, unknown> | null} */
	let statsRaw = $state(null);

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
	const cardTier = $derived(getCardTierFromLevel(levelInfo.level));
	const tierLabel = $derived(
		cardTier === 'bronze'
			? 'Bronze'
			: cardTier === 'silver'
				? 'Silver'
				: cardTier === 'gold'
					? 'Gold'
					: 'Elite',
	);

	/** Prefer team `sport`, then club branding (`clubs/{clubId}.sport`). */
	const resolvedSportRaw = $derived.by(() => {
		const t = typeof teamSportFromDoc === 'string' ? teamSportFromDoc.trim() : '';
		if (t) return t;
		const c = typeof clubBrandingStore.sport === 'string' ? clubBrandingStore.sport.trim() : '';
		return c || 'soccer';
	});

	const attributeSchema = $derived(getAttributeSchemaForSport(resolvedSportRaw));

	const skillRadar = $derived(
		deriveSkillValuesForSchema(statsRaw, attributeSchema, displayXp, streakDays),
	);

	const sportDisplayLabel = $derived.by(() => {
		const k = attributeSchema.canonicalKey || 'generic';
		if (k === 'generic') return 'Multi-sport';
		return k.charAt(0).toUpperCase() + k.slice(1);
	});

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
			teamSportFromDoc = null;
			return;
		}
		const tid = profile.teamId;
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'teams', tid));
				if (cancelled) return;
				const data = snap.exists() ? snap.data() : null;
				const n = data?.name;
				teamLabel = typeof n === 'string' && n.trim() ? n.trim() : tid;
				const sp = data?.sport;
				teamSportFromDoc =
					typeof sp === 'string' && sp.trim() ? sp.trim().toLowerCase() : null;
			} catch {
				if (!cancelled) {
					teamLabel = tid;
					teamSportFromDoc = null;
				}
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
					statsRaw = null;
					totalXpLive = 0;
					streakDays = 0;
					xpWeek = 0;
					if (!animating) displayXp = 0;
					return;
				}
				const d = snap.data();
				statsRaw = d;
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
	<section
		class="epd__identity epd__identity--{cardTier}"
		aria-labelledby="epd-identity-h"
		aria-describedby="epd-tier-label"
	>
		<div class="epd__identity-left">
			{#if photoUrl}
				<img class="epd__avatar" src={photoUrl} alt="" width="64" height="64" />
			{:else}
				<div class="epd__avatar epd__avatar--fallback">{initials(displayName)}</div>
			{/if}
			<div class="epd__id-text">
				<p id="epd-identity-h" class="epd__name">{displayName}</p>
				<p id="epd-tier-label" class="epd__tier-chip">{tierLabel} tier · Lv {levelInfo.level}</p>
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
				variant={cardTier === 'elite' ? 'dark' : 'light'}
				size="lg"
				showLevelSegment={true}
			/>
		</div>
	</section>

	<PlayerActionInbox />

	<section class="epd__skills-bento" aria-labelledby="epd-skills-h">
		<div class="epd__skills-card">
			<h2 id="epd-skills-h" class="epd__skills-title">Skill attributes</h2>
			<p class="epd__skills-sub">
				{sportDisplayLabel} · Ultimate Team profile — max rating 99.
			</p>
			<PlayerSkillRadar labels={skillRadar.labels} values={skillRadar.values} />
		</div>
	</section>

	<section class="epd__trophy" aria-labelledby="epd-trophy-h">
		<h2 id="epd-trophy-h" class="epd__trophy-title">Trophy case</h2>
		<p class="epd__trophy-sub">Recent highlights & challenge tokens — powered by your effort.</p>
		<div class="epd__badge-grid">
			<div class="epd__badge">
				<div class="epd__badge-icon" aria-hidden="true">
					<Icon name="game.star" size={40} />
				</div>
				<span class="epd__badge-label">Level {levelInfo.level}</span>
				<span class="epd__badge-meta">Tier milestone</span>
			</div>

			<div class="epd__badge">
				<div class="epd__badge-icon epd__badge-icon--amber" aria-hidden="true">
					<Icon name="user.profile" size={40} />
				</div>
				<span class="epd__badge-label">
					{loading ? '…' : streakDays > 0 ? `${streakDays}-day streak` : 'Start a streak'}
				</span>
				<span class="epd__badge-meta">Consistency</span>
			</div>

			<div class="epd__badge">
				<div class="epd__badge-icon epd__badge-icon--violet" aria-hidden="true">
					<Icon name="data.chart-bar" size={40} />
				</div>
				<span class="epd__badge-label">
					{loading ? '…' : `${xpWeek.toLocaleString()} XP`}
				</span>
				<span class="epd__badge-meta">This week</span>
			</div>

			<div class="epd__badge">
				<div class="epd__badge-icon epd__badge-icon--gold" aria-hidden="true">
					<Icon name="game.trophy" size={40} />
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
		box-sizing: border-box;
	}

	/* FIFA-style card tiers — light mode */
	.epd__identity--bronze {
		border: 1px solid rgba(120, 53, 15, 0.38);
		background: linear-gradient(135deg, #f3e6d8 0%, #c9a077 45%, #7a4a28 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}

	.epd__identity--silver {
		border: 1px solid rgba(71, 85, 105, 0.42);
		background: linear-gradient(145deg, #f8fafc 0%, #cbd5e1 48%, #94a3b8 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
	}

	.epd__identity--gold {
		border: 1px solid rgba(180, 83, 9, 0.42);
		background: linear-gradient(135deg, #fff7d6 0%, #fbbf24 46%, #c2410c 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
	}

	.epd__identity--elite {
		border: 2px solid var(--brand-primary, #f59e0b);
		background: #09090b;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.35),
			0 0 28px color-mix(in srgb, var(--brand-primary, #f59e0b) 42%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
	}

	:global(html.dark) .epd__identity--bronze {
		border-color: rgba(253, 230, 138, 0.22);
		background: linear-gradient(135deg, #3a2a1f 0%, #6b4423 48%, #1f1410 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	:global(html.dark) .epd__identity--silver {
		border-color: rgba(148, 163, 184, 0.35);
		background: linear-gradient(145deg, #1e293b 0%, #475569 50%, #0f172a 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	:global(html.dark) .epd__identity--gold {
		border-color: rgba(251, 191, 36, 0.35);
		background: linear-gradient(135deg, #422006 0%, #b45309 48%, #1c1004 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	:global(html.dark) .epd__identity--elite {
		border-color: var(--brand-primary, #f59e0b);
		background: #09090b;
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
		border: 1px solid rgba(15, 23, 42, 0.18);
		flex-shrink: 0;
	}

	.epd__identity--elite .epd__avatar {
		border-color: rgba(255, 255, 255, 0.2);
	}

	.epd__avatar--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.55);
		font-weight: 900;
		font-size: 1.1rem;
		color: #1c1008;
	}

	.epd__identity--silver .epd__avatar--fallback {
		background: rgba(255, 255, 255, 0.65);
		color: #0f172a;
	}

	.epd__identity--gold .epd__avatar--fallback {
		background: rgba(255, 255, 255, 0.55);
		color: #422006;
	}

	.epd__identity--elite .epd__avatar--fallback {
		background: #18181b;
		color: #fafafa;
	}

	:global(html.dark) .epd__identity--bronze .epd__avatar--fallback {
		background: rgba(0, 0, 0, 0.25);
		color: #fef3c7;
	}

	:global(html.dark) .epd__identity--silver .epd__avatar--fallback {
		background: rgba(0, 0, 0, 0.3);
		color: #e2e8f0;
	}

	:global(html.dark) .epd__identity--gold .epd__avatar--fallback {
		background: rgba(0, 0, 0, 0.28);
		color: #fde68a;
	}

	.epd__id-text {
		min-width: 0;
	}

	.epd__name {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.2;
		color: #1c1008;
	}

	.epd__identity--silver .epd__name {
		color: #0f172a;
	}

	.epd__identity--gold .epd__name {
		color: #422006;
	}

	.epd__identity--elite .epd__name {
		color: #fafafa;
	}

	.epd__tier-chip {
		margin: 6px 0 0;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(28, 16, 8, 0.78);
	}

	.epd__identity--silver .epd__tier-chip {
		color: rgba(15, 23, 42, 0.72);
	}

	.epd__identity--gold .epd__tier-chip {
		color: rgba(66, 32, 6, 0.78);
	}

	.epd__identity--elite .epd__tier-chip {
		color: color-mix(in srgb, var(--brand-primary, #f59e0b) 88%, #fafafa);
	}

	.epd__team {
		margin: 4px 0 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: rgba(28, 16, 8, 0.78);
	}

	.epd__identity--silver .epd__team {
		color: rgba(15, 23, 42, 0.72);
	}

	.epd__identity--gold .epd__team {
		color: rgba(66, 32, 6, 0.75);
	}

	.epd__identity--elite .epd__team {
		color: #a1a1aa;
	}

	.epd__team--muted {
		opacity: 0.75;
	}

	:global(html.dark) .epd__identity--bronze .epd__name {
		color: #fff7ed;
	}

	:global(html.dark) .epd__identity--bronze .epd__tier-chip,
	:global(html.dark) .epd__identity--bronze .epd__team {
		color: rgba(255, 247, 237, 0.78);
	}

	:global(html.dark) .epd__identity--silver .epd__name {
		color: #f8fafc;
	}

	:global(html.dark) .epd__identity--silver .epd__tier-chip,
	:global(html.dark) .epd__identity--silver .epd__team {
		color: rgba(226, 232, 240, 0.78);
	}

	:global(html.dark) .epd__identity--gold .epd__name {
		color: #fffbeb;
	}

	:global(html.dark) .epd__identity--gold .epd__tier-chip,
	:global(html.dark) .epd__identity--gold .epd__team {
		color: rgba(254, 243, 199, 0.82);
	}

	.epd__identity-ring {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.epd__skills-bento {
		box-sizing: border-box;
	}

	.epd__skills-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 1.25rem;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		box-sizing: border-box;
	}

	:global(html.dark) .epd__skills-card {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.epd__skills-title {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.epd__skills-sub {
		margin: 0 0 14px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.epd__trophy {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 1.25rem;
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
		align-items: stretch;
		flex: 1 1 auto;
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
		height: 100%;
		padding: 1.25rem;
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
