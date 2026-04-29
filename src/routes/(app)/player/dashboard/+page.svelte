<script>
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { doc, getDoc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import TeamLeaderboard from '$lib/components/tracker/TeamLeaderboard.svelte';
	import OperativeAvatarPreview from '$lib/components/player/OperativeAvatarPreview.svelte';
	import PlayerActionInbox from '$lib/components/shell/PlayerActionInbox.svelte';
	import PlayerSkillRadar from '$lib/components/PlayerSkillRadar.svelte';
	import { parseOperativeAvatar } from '$lib/avatars/operativeAvatar.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import {
		getAttributeSchemaForSport,
		deriveSkillValuesForSchema,
		hasDocumentedSkillRatings,
		pickSkillRatingForKey,
	} from '$lib/utils/sport-attributes.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';

	const profile = $derived(authStore.userProfile);
	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const rankProgress = $derived(getCurrentRank(totalXpHud));
	const osLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);
	const levelProg = $derived(getLevelProgressFromTotalXp(totalXpHud));
	const email = $derived((authStore.user?.email || '').toLowerCase());
	const uid = $derived(authStore.user?.uid || '');

	/** @type {Record<string, unknown> | null} */
	let statsRaw = $state(null);
	/** @type {string | null} */
	let teamSportFromDoc = $state(null);

	const resolvedSportRaw = $derived(
		typeof teamSportFromDoc === 'string' && teamSportFromDoc.trim() ?
			teamSportFromDoc.trim().toLowerCase()
		:	'soccer',
	);
	const attributeSchema = $derived(getAttributeSchemaForSport(resolvedSportRaw));
	const streakDays = $derived(Math.max(0, Math.floor(Number(profile?.currentStreak) || 0)));

	const skillRadar = $derived(
		deriveSkillValuesForSchema(statsRaw, attributeSchema, totalXpHud, streakDays),
	);

	const streak = $derived(Number(profile?.currentStreak) || 0);
	const longestStreak = $derived(Number(profile?.longestStreak) || streak);

	/** @type {string} */
	let teamAssignmentLabel = $state('');

	const callsign = $derived(
		(profile?.playerName && String(profile.playerName).trim()) ||
			email.split('@')[0] ||
			'—',
	);

	const operativeAvatarConfig = $derived(parseOperativeAvatar(profile?.operativeAvatar));

	const combatTelemetryReady = $derived(
		hasDocumentedSkillRatings(
			statsRaw && typeof statsRaw === 'object' ?
				/** @type {Record<string, unknown>} */ (statsRaw)
			:	null,
			attributeSchema,
		),
	);

	const combatHudRows = $derived.by(() => {
		const schema = attributeSchema;
		const keys = schema.keys.slice(0, 3);
		const labels = schema.labels.slice(0, 3);
		if (!combatTelemetryReady) {
			return labels.map((label) => ({ label, pct: 0, display: '00' }));
		}
		const raw = /** @type {Record<string, unknown>} */ (statsRaw);
		return keys.map((key, i) => {
			const v = pickSkillRatingForKey(raw, key) ?? 0;
			const clamped = Math.min(99, Math.max(0, v));
			return {
				label: labels[i] ?? key,
				pct: Math.round((clamped / 99) * 1000) / 10,
				display: String(clamped).padStart(2, '0'),
			};
		});
	});

	const levelBarPct = $derived(
		levelProg.xpToNext > 0 ?
			Math.round(Math.min(1, Math.max(0, levelProg.progress)) * 1000) / 10
		:	100,
	);

	$effect(() => {
		if (!browser) return;
		const u = authStore.user;
		if (authStore.role === 'player' && u?.uid) {
			playerEngine.attach(u.uid);
			return () => playerEngine.detach();
		}
		playerEngine.detach();
	});

	$effect(() => {
		if (!browser || !uid) {
			statsRaw = null;
			return;
		}
		const ref = doc(db, 'player_stats', uid);
		const unsub = onSnapshot(
			ref,
			(snap) => {
				if (!snap.exists()) {
					statsRaw = null;
					return;
				}
				statsRaw = snap.data();
			},
			(e) => {
				console.error('[player dashboard] player_stats', e);
				statsRaw = null;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		if (!browser) return;
		const tid = /** @type {string | undefined} */ (profile?.teamId);
		if (!tid || tid === 'admin') {
			teamAssignmentLabel = '';
			teamSportFromDoc = null;
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'teams', tid));
				if (cancelled) return;
				if (snap.exists()) {
					const d = snap.data();
					teamAssignmentLabel =
						typeof d.teamName === 'string' && d.teamName.trim() ?
							d.teamName.trim()
						:	typeof d.name === 'string' && d.name.trim() ?
							d.name.trim()
						:	tid;
					const sp = d.sport;
					teamSportFromDoc =
						typeof sp === 'string' && sp.trim() ? sp.trim().toLowerCase() : null;
				} else {
					teamAssignmentLabel = tid;
					teamSportFromDoc = null;
				}
			} catch (e) {
				console.error('[player dashboard] team label', e);
				if (!cancelled) {
					teamAssignmentLabel = tid;
					teamSportFromDoc = null;
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	});

</script>

<svelte:head>
	<title>Player Dashboard · SSTRACKER</title>
</svelte:head>

<div
	class="lobby-root tw-relative tw-mx-auto tw-box-border tw-w-full tw-max-w-6xl tw-min-w-0 tw-overflow-x-hidden tw-bg-black tw-px-3 tw-pb-28 tw-pt-4 sm:tw-px-5"
	data-region="player-lobby"
>
	<div
		class="lobby-hero lobby-glass tw-isolate tw-mb-8 tw-grid tw-min-h-[300px] tw-min-w-0 tw-grid-cols-1 tw-gap-8 tw-p-6 md:tw-grid-cols-2 md:tw-items-stretch md:tw-gap-10 md:tw-p-8"
		aria-label="Operative profile"
	>
		<div
			class="tw-relative tw-z-10 tw-flex tw-min-h-[300px] tw-flex-col tw-items-center tw-justify-center md:tw-items-start"
		>
			<p class="lobby-eyebrow tw-mb-4 tw-w-full tw-text-center md:tw-text-left">The operative</p>
			<div class="holo-stage tw-mx-auto md:tw-mx-0">
				<div class="holo-glow tw-pointer-events-none" aria-hidden="true"></div>
				<div class="holo-plate">
					<OperativeAvatarPreview
						config={operativeAvatarConfig}
						size={176}
						showInitializeCta={true}
						class="tw-rounded-full"
					/>
				</div>
				<div class="holo-base tw-pointer-events-none" aria-hidden="true"></div>
			</div>
			<p class="tw-mt-5 tw-mb-0 tw-text-center tw-font-mono tw-text-sm tw-font-bold tw-tracking-wide tw-text-slate-300 md:tw-text-left">
				{callsign}
			</p>
			{#if teamAssignmentLabel}
				<p class="tw-mt-1 tw-mb-0 tw-text-center tw-text-xs tw-tracking-widest tw-text-slate-500 md:tw-text-left">
					{teamAssignmentLabel}
				</p>
			{/if}
		</div>

		<div
			class="tw-relative tw-z-10 tw-flex tw-min-h-[300px] tw-min-w-0 tw-flex-1 tw-flex-col tw-items-center tw-gap-5 md:tw-items-stretch"
		>
			<div
				class="combat-hud-shell tw-flex tw-w-full tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-5 tw-rounded-xl tw-border tw-border-white/5 tw-bg-slate-900/60 tw-p-4 tw-backdrop-blur-md md:tw-gap-6 md:tw-p-5"
				aria-label="Combat telemetry HUD"
			>
				<div>
					<p class="lobby-eyebrow tw-mb-3 tw-text-center md:tw-text-left">Combat level</p>
					<div
						class="ring-mega tw-mx-auto tw-flex tw-w-full tw-max-w-[min(100%,22rem)] tw-flex-col tw-items-center md:tw-mx-0 md:tw-max-w-none"
					>
						<div class="ring-mega__inner">
							<LevelProgressRing
								currentXp={rankProgress.xpInCurrentTier}
								nextRankXp={rankProgress.xpToNextRank}
								rankName={rankProgress.rank}
								totalXp={totalXpHud}
								level={osLevel}
								size="lg"
								variant="dark"
								showLevelSegment={true}
							/>
						</div>
					</div>
				</div>

				<div
					class="tw-w-full tw-min-w-0 tw-rounded-xl tw-border tw-border-white/5 tw-bg-slate-950/40 tw-p-4 tw-backdrop-blur-sm"
				>
					<div class="tw-mb-2 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-2">
						<span
							class="tw-text-[0.65rem] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-slate-400"
							>Level {osLevel}</span
						>
						<span class="tw-font-mono tw-text-sm tw-font-bold tw-tabular-nums tw-text-cyan-200">
							{totalXpHud.toLocaleString()}
							<span class="tw-text-[0.65rem] tw-font-semibold tw-text-slate-500"> total XP</span>
						</span>
					</div>
					<div
						class="tw-relative tw-h-3 tw-overflow-hidden tw-rounded-full tw-border tw-border-white/10 tw-bg-slate-950"
						role="progressbar"
						aria-valuemin="0"
						aria-valuemax="100"
						aria-valuenow={Math.round(levelBarPct)}
						aria-label="Progress toward next level"
					>
						<div
							class="xp-bar-fill tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-cyan-400 tw-via-fuchsia-500 tw-to-emerald-400 tw-shadow-[0_0_24px_rgba(34,211,238,0.45)]"
							style={`width: ${levelBarPct}%;`}
						></div>
					</div>
					<p
						class="tw-mb-0 tw-mt-2 tw-text-center tw-font-mono tw-text-[0.7rem] tw-text-slate-400 md:tw-text-left"
					>
						{#if levelProg.xpToNext > 0}
							<span class="tw-text-cyan-300/90">{levelProg.xpIntoLevel.toLocaleString()}</span>
							/{levelProg.xpToNext.toLocaleString()} XP to level {osLevel + 1}
						{:else}
							<span class="tw-text-emerald-400/90">Max level bracket</span>
						{/if}
					</p>
				</div>

				<div
					class="tw-w-full tw-min-w-0 tw-flex-1 tw-rounded-xl tw-border tw-border-white/5 tw-bg-slate-950/50 tw-p-4 tw-backdrop-blur-sm"
				>
					<p class="lobby-eyebrow tw-mb-4 tw-text-center tw-text-cyan-400/90 md:tw-text-left">
						Core attributes
					</p>
					<ul class="tw-m-0 tw-list-none tw-space-y-3.5 tw-p-0" aria-label="Combat attribute bars">
						{#each combatHudRows as row (row.label)}
							<li class="tw-min-w-0">
								<div
									class="tw-mb-1 tw-flex tw-items-center tw-justify-between tw-gap-2 tw-text-[0.7rem]"
								>
									<span
										class="tw-font-black tw-uppercase tw-tracking-[0.16em] tw-text-slate-400"
										>{row.label}</span
									>
									<span
										class="tw-font-mono tw-text-sm tw-font-black tw-tabular-nums tw-tracking-wide tw-text-slate-100"
										>{row.display}</span
									>
								</div>
								<div
									class="tw-h-2 tw-overflow-hidden tw-rounded-full tw-border tw-border-white/5 tw-bg-slate-900/80"
									role="presentation"
								>
									<div
										class="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-emerald-500/90 tw-via-cyan-400/85 tw-to-fuchsia-500/80 tw-shadow-[0_0_12px_rgba(52,211,153,0.35)] tw-transition-[width] tw-duration-500"
										style={`width: ${row.pct}%;`}
									></div>
								</div>
							</li>
						{/each}
					</ul>
					{#if !combatTelemetryReady}
						<p
							class="tw-mb-0 tw-mt-4 tw-text-center tw-text-[0.68rem] tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500 md:tw-text-left"
						>
							Awaiting Coach Telemetry.
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="tw-mb-8 tw-grid tw-min-w-0 tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-2">
		<section class="lobby-missions lobby-glass tw-min-h-0 tw-p-5 md:tw-p-6" aria-labelledby="lobby-missions-h">
			<header class="tw-relative tw-z-10 tw-mb-4 tw-border-b tw-border-emerald-500/25 tw-pb-3">
				<p id="lobby-missions-h" class="lobby-eyebrow tw-mb-1 tw-text-emerald-400/90">Active missions</p>
				<h2 class="tw-m-0 tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100">
					Assigned workouts · pending trials
				</h2>
			</header>
			<div class="tw-relative tw-z-10">
				<PlayerActionInbox />
			</div>
		</section>

		<section
			class="lobby-radar lobby-glass tw-flex tw-min-h-0 tw-flex-col tw-p-5 md:tw-p-6"
			aria-labelledby="lobby-radar-h"
		>
			<header class="tw-relative tw-z-10 tw-mb-3">
				<p class="lobby-eyebrow tw-mb-1 tw-text-fuchsia-400/90">Combat stats</p>
				<h2 id="lobby-radar-h" class="tw-m-0 tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100">
					Attribute radar
				</h2>
				<p class="tw-m-0 tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">
					Six-axis loadout from your latest <span class="tw-font-semibold tw-text-slate-400"
						>{attributeSchema.canonicalKey}</span
					> profile — keep logging to harden the shape.
				</p>
			</header>
			<div
				class="lobby-radar-canvas tw-relative tw-min-h-0 tw-flex-1 tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-700/80 tw-bg-slate-950 tw-bg-[radial-gradient(ellipse_at_center,_rgba(15,23,42,0.92)_0%,_#020617_72%)] tw-p-3 tw-shadow-[inset_0_0_60px_rgba(0,0,0,0.65)]"
			>
				<div
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-opacity-[0.08]"
					style="background-image: linear-gradient(rgba(148,163,184,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.9) 1px, transparent 1px); background-size: 18px 18px;"
					aria-hidden="true"
				></div>
				<div class="tw-relative tw-z-10 tw-min-h-[280px]">
					<PlayerSkillRadar
						labels={skillRadar.labels}
						values={skillRadar.values}
						variant="lobby"
					/>
				</div>
			</div>
		</section>
	</div>

	<section
		class="pd-team-lb lobby-glass tw-relative tw-z-10 tw-mb-8 tw-min-w-0 tw-p-4"
		aria-label="Team leaderboard"
	>
		<TeamLeaderboard compact />
	</section>

	<div
		class="lobby-glass tw-relative tw-z-10 tw-mb-8 tw-grid tw-w-full tw-grid-cols-2 tw-gap-3 tw-p-4 md:tw-grid-cols-4 md:tw-gap-4 md:tw-p-5"
		aria-label="Career telemetry"
	>
		<a
			href={resolve('/stats')}
			class="lobby-stat-tile tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-rounded-xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Total XP</span
			>
			<span class="tabular-num tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-2xl">
				{totalXpHud.toLocaleString()}
			</span>
		</a>
		<a
			href={resolve('/stats')}
			class="lobby-stat-tile tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-rounded-xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Level</span
			>
			<span class="tabular-num tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-2xl">
				{osLevel}
			</span>
		</a>
		<a
			href={resolve('/player/workout')}
			class="lobby-stat-tile tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-rounded-xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Streak</span
			>
			<span class="tabular-num tw-text-xl tw-font-black tw-tracking-tight tw-text-cyan-300 md:tw-text-2xl">
				{streak}<span class="tw-text-base tw-font-bold tw-text-slate-500">d</span>
			</span>
		</a>
		<div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-rounded-xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4">
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Best</span
			>
			<span class="tabular-num tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-2xl">
				{longestStreak}<span class="tw-text-base tw-font-bold tw-text-slate-500">d</span>
			</span>
		</div>
	</div>

	<nav class="lobby-quick tw-relative tw-z-10 tw-grid tw-gap-3" aria-label="Quick actions">
		<a
			href={resolve('/player/workout')}
			class="lobby-glass lobby-quick__btn tw-relative tw-z-10 tw-flex tw-min-h-[3.25rem] tw-cursor-pointer tw-items-center tw-justify-center tw-px-4 tw-py-3 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<i class="ph ph-lightning tw-shrink-0 tw-text-cyan-400" aria-hidden="true"></i>
			<span class="lobby-quick__label">Today's quests</span>
		</a>
		<a
			href={resolve('/stats')}
			class="lobby-glass lobby-quick__btn tw-relative tw-z-10 tw-flex tw-min-h-[3.25rem] tw-cursor-pointer tw-items-center tw-justify-center tw-px-4 tw-py-3 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<i class="ph ph-chart-line-up tw-shrink-0 tw-text-fuchsia-400" aria-hidden="true"></i>
			<span class="lobby-quick__label">Career stats</span>
		</a>
	</nav>
</div>

<style>
	.lobby-root {
		color: #f8fafc;
	}

	.lobby-glass {
		border-radius: 1rem;
		border: 1px solid rgb(255 255 255 / 0.05);
		background: rgb(15 23 42 / 0.6);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
	}

	.lobby-eyebrow {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.holo-stage {
		position: relative;
		width: fit-content;
		perspective: 960px;
		perspective-origin: 50% 40%;
	}

	.holo-glow {
		position: absolute;
		inset: -18%;
		border-radius: 50%;
		background: radial-gradient(
			ellipse at 50% 45%,
			rgba(34, 211, 238, 0.35) 0%,
			rgba(168, 85, 247, 0.12) 42%,
			transparent 70%
		);
		filter: blur(12px);
		opacity: 0.95;
		pointer-events: none;
		z-index: 0;
	}

	.holo-plate {
		position: relative;
		z-index: 1;
		transform: rotateX(8deg) rotateY(-14deg);
		transform-style: preserve-3d;
		animation: holo-float 5.5s ease-in-out infinite;
		filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.55))
			drop-shadow(0 0 22px rgba(34, 211, 238, 0.28));
	}

	.holo-base {
		position: absolute;
		left: 50%;
		bottom: -8px;
		width: 72%;
		height: 14px;
		transform: translateX(-50%) rotateX(78deg);
		border-radius: 50%;
		background: radial-gradient(ellipse at center, rgba(34, 211, 238, 0.25), transparent 70%);
		opacity: 0.85;
		pointer-events: none;
		z-index: 0;
	}

	@keyframes holo-float {
		0%,
		100% {
			transform: rotateX(8deg) rotateY(-14deg) translateY(0);
		}
		50% {
			transform: rotateX(5deg) rotateY(-8deg) translateY(-10px);
		}
	}

	.ring-mega__inner {
		transform: scale(1.55);
		transform-origin: center center;
	}

	@media (max-width: 480px) {
		.ring-mega__inner {
			transform: scale(1.28);
		}
	}

	.lobby-missions :global(.pai) {
		border: none;
		background: transparent;
		padding: 0;
		border-left: 4px solid rgb(16 185 129 / 0.85);
		padding-left: 1rem;
		box-shadow: none;
	}

	.lobby-missions :global(.pai__head) {
		color: rgb(167 243 208 / 0.95);
	}

	.lobby-missions :global(.pai__head .ph-lightning) {
		color: rgb(52 211 153);
		filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.45));
	}

	.lobby-missions :global(.pai__card) {
		background: rgb(2 6 23 / 0.55);
		border-color: rgb(16 185 129 / 0.22);
		box-shadow: inset 0 0 0 1px rgb(16 185 129 / 0.08), 0 0 28px rgb(16 185 129 / 0.06);
	}

	.lobby-missions :global(.pai__kicker) {
		color: rgb(52 211 153);
	}

	.lobby-missions :global(.pai__title) {
		color: rgb(241 245 249);
	}

	.lobby-missions :global(.pai__btn--primary) {
		background: linear-gradient(135deg, rgb(16 185 129), rgb(6 182 212));
		color: rgb(2 6 23);
		border-color: rgb(16 185 129 / 0.5);
	}

	.lobby-missions :global(.pai__btn--ghost) {
		color: rgb(209 250 229);
		border-color: rgb(52 211 153 / 0.4);
		background: rgb(2 6 23 / 0.35);
	}

	.lobby-missions :global(.pai__btn--ghost:hover) {
		border-color: rgb(52 211 153 / 0.75);
		background: rgb(6 78 59 / 0.35);
	}

	.lobby-missions :global(.pai__muted) {
		color: rgb(148 163 184);
	}

	.lobby-missions :global(.pai__details) {
		border-color: rgb(51 65 85 / 0.6);
		background: rgb(15 23 42 / 0.45);
	}

	.lobby-radar-canvas {
		position: relative;
		min-height: 280px;
	}

	:global(.pd-team-lb .lb-shell--compact) {
		background: rgba(2, 6, 23, 0.55) !important;
		border: 1px solid rgba(255, 255, 255, 0.06) !important;
		box-shadow: 0 12px 40px -18px rgba(0, 0, 0, 0.65) !important;
	}

	:global(.pd-team-lb .lb-title) {
		color: #f8fafc !important;
	}

	:global(.pd-team-lb .lb-sub),
	:global(.pd-team-lb .lb-hint) {
		color: rgba(226, 232, 240, 0.78) !important;
	}

	:global(.pd-team-lb .lb-compact-row) {
		background: rgba(15, 23, 42, 0.5) !important;
		border-color: rgba(71, 85, 105, 0.45) !important;
	}

	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

	.lobby-quick {
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.lobby-quick__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		font-weight: 900;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #f1f5f9;
		cursor: pointer;
		transition:
			border-color 0.25s ease,
			box-shadow 0.25s ease,
			transform 0.18s ease;
	}

	.lobby-quick__btn:hover {
		border-color: rgb(34 211 238 / 0.35);
		box-shadow:
			0 0 0 1px rgb(34 211 238 / 0.12),
			0 18px 40px -16px rgb(0 0 0 / 0.55);
	}

	.lobby-quick__btn:active {
		transform: translateY(1px) scale(0.99);
	}

	a.lobby-quick__btn {
		color: inherit;
	}

	.lobby-stat-tile {
		cursor: pointer;
		color: inherit;
	}

	.lobby-stat-tile:hover {
		border-color: rgb(34 211 238 / 0.25);
		box-shadow: 0 0 0 1px rgb(34 211 238 / 0.08);
	}

	.lobby-quick__label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
