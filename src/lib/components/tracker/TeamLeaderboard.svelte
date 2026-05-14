<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** Optional team id for director / global_admin. */
	let { teamIdForStaff = '', compact = false } = $props();

	let loading = $state(true);
	let err = $state('');
	/** @type {Array<{ rank: number, playerKey: string, displayName: string, xpThisWeek: number, currentLevel: number, streak: number, isCurrentUser: boolean }>} */
	let entries = $state([]);

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const uid = $derived(authStore.user?.uid || '');

	const effectiveTeamId = $derived.by(() => {
		const staff =
			typeof teamIdForStaff === 'string' ? teamIdForStaff.trim() : '';
		if (staff && (role === 'director' || role === 'super_admin' || role === 'global_admin')) {
			return staff;
		}
		const tid = profile?.teamId;
		return tid && tid !== 'admin' ? tid : '';
	});

	$effect(() => {
		if (!browser) return;
		if (!authStore.isAuthenticated || authStore.isLoading) return;

		if (role === 'parent' || role === 'registrar') {
			entries = [];
			loading = false;
			err = '';
			return;
		}

		const tid = effectiveTeamId;
		if (!tid) {
			entries = [];
			loading = false;
			err = '';
			return;
		}

		let cancelled = false;
		loading = true;
		err = '';
		entries = [];

		(async () => {
			try {
				const q = query(
					collection(db, 'player_stats'),
					where('teamId', '==', tid),
					orderBy('xp_this_week', 'desc'),
					limit(15)
				);
				const snap = await getDocs(q);
				if (cancelled) return;

				/** @type {typeof entries} */
				const rows = [];
				let rank = 1;
				snap.forEach((docSnap) => {
					const d = docSnap.data();
					const wk = Math.floor(Number(d.xp_this_week) || 0);
					rows.push({
						rank: rank++,
						playerKey: docSnap.id,
						displayName:
							typeof d.playerName === 'string' && d.playerName.trim() ?
								d.playerName.trim() :
								'Player',
						xpThisWeek: wk,
						currentLevel: Math.max(
							1,
							Math.floor(Number(d.current_level) || 1)
						),
						streak: Math.floor(Number(d.streak_days) || 0),
						isCurrentUser: docSnap.id === uid
					});
				});
				entries = rows;
			} catch (e) {
				if (!cancelled) {
					err =
						e && typeof e === 'object' && 'message' in e ?
							String(e.message) :
							'Could not load leaderboard.';
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	/**
	 * @param {string} name
	 */
	function initialsFromName(name) {
		const p = name.trim().split(/\s+/).filter(Boolean);
		if (p.length === 0) return '?';
		if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
		return (p[0][0] + p[p.length - 1][0]).toUpperCase();
	}
</script>

<div class="lb-outer bento-section" class:lb-outer--compact={compact}>
	<div class="card lb-shell" class:lb-shell--compact={compact}>
		<div class="lb-header">
			<div>
				<h2 class="lb-title">Team leaderboard</h2>
				<p class="lb-sub">
					{compact
						? 'Ranked by XP this week · tap a row to compare effort'
						: 'Top 15 by XP this week · streak shows consecutive active weeks'}
				</p>
			</div>
		</div>

		{#if loading}
			<p class="lb-hint">Loading rankings…</p>
		{:else if err}
			<p class="lb-err" role="alert">{err}</p>
		{:else if entries.length === 0}
			<p class="lb-hint">
				No weekly stats yet. Log training to earn XP and climb the board.
			</p>
		{:else}
			<ul class="lb-list" aria-label="Team XP rankings">
				{#each entries as row (row.playerKey)}
					<li
						class="lb-card"
						class:lb-card--gold={row.rank === 1}
						class:lb-card--silver={row.rank === 2}
						class:lb-card--bronze={row.rank === 3}
						class:lb-card--me={row.isCurrentUser}
					>
						<div class="lb-card-left">
							<span class="lb-card-rank" aria-hidden="true">
								{#if row.rank <= 3}
									<span class="lb-rank-podium lb-rank-podium--{row.rank}">{row.rank}</span>
								{:else}
									<span class="lb-rank-num">{row.rank}</span>
								{/if}
							</span>
							<div class="lb-card-avatar" aria-hidden="true">
								{initialsFromName(row.displayName)}
							</div>
							<div class="lb-card-id">
								<div class="lb-card-name-row">
									<span class="lb-card-name">{row.displayName}</span>
									{#if row.isCurrentUser}
										<span class="lb-you">You</span>
									{/if}
								</div>
								{#if !compact}
									<p class="lb-card-meta">
										<span>Lv {row.currentLevel}</span>
										<span class="lb-card-meta-sep" aria-hidden="true">·</span>
										{#if row.streak > 0}
									<span class="lb-card-meta-streak" title="Consecutive active weeks">
											<Icon name={"game.flame" as IconName} aria-hidden="true" />
											{row.streak} streak
											</span>
										{:else}
											<span class="lb-card-meta-muted">No streak</span>
										{/if}
									</p>
								{/if}
							</div>
						</div>
						<div class="lb-card-right">
							<span class="lb-xp-badge">
								{row.xpThisWeek.toLocaleString()}
								<span class="lb-xp-suffix">XP</span>
							</span>
							{#if compact && row.streak > 0}
							<span class="lb-card-streak-compact" title="Streak">
								<Icon name={"game.flame" as IconName} aria-hidden="true" />
								{row.streak}
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.lb-outer--compact {
		margin-bottom: 0;
	}

	.lb-shell--compact {
		background: #fafafa !important;
		border: 1px solid #e5e5e5 !important;
		box-shadow: none !important;
	}

	:global(html.dark) .lb-shell--compact {
		background: #0f0f11 !important;
		border-color: rgba(255, 255, 255, 0.1) !important;
	}

	.lb-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.lb-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--vanguard-radius-sm);
		border: 1px solid var(--vanguard-border);
		background: rgb(15 23 42 / 0.5);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		box-shadow: var(--vanguard-elev-2);
		box-sizing: border-box;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.lb-card:hover {
		background: rgb(30 41 59 / 0.72);
		border-color: rgb(255 255 255 / 0.08);
	}

	.lb-card--me {
		border-color: rgb(16 185 129 / 0.5);
		background: rgb(6 78 59 / 0.2);
		box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
	}

	.lb-card--me:hover {
		background: rgb(6 78 59 / 0.28);
		border-color: rgb(52 211 153 / 0.55);
	}

	.lb-card--gold {
		box-shadow:
			inset 0 0 0 1px rgb(245 158 11 / 0.2),
			0 0 20px rgb(245 158 11 / 0.08);
	}

	.lb-card--silver {
		box-shadow:
			inset 0 0 0 1px rgb(148 163 184 / 0.18),
			0 0 18px rgb(148 163 184 / 0.06);
	}

	.lb-card--bronze {
		box-shadow:
			inset 0 0 0 1px rgb(194 65 12 / 0.18),
			0 0 18px rgb(194 65 12 / 0.06);
	}

	.lb-card-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		flex: 1 1 auto;
	}

	.lb-card-rank {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
	}

	.lb-rank-num {
		font-size: 1.125rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: rgb(226 232 240);
		text-shadow: 0 0 14px rgb(34 211 238 / 0.35);
	}

	.lb-card-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
		flex-shrink: 0;
		background: linear-gradient(145deg, rgb(226 232 240), rgb(148 163 184));
		border: 1px solid rgb(255 255 255 / 0.12);
		box-shadow:
			0 4px 12px rgb(0 0 0 / 0.35),
			inset 0 1px 0 rgb(255 255 255 / 0.35);
	}

	.lb-card-id {
		min-width: 0;
		flex: 1 1 auto;
	}

	.lb-card-name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.lb-card-name {
		font-weight: 800;
		font-size: 0.95rem;
		color: var(--pp-text, var(--text-primary, #f8fafc));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lb-card-meta {
		margin: 0.2rem 0 0;
		font-size: 0.72rem;
		font-weight: 600;
		color: rgb(148 163 184);
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.lb-card-meta-sep {
		opacity: 0.5;
	}

	.lb-card-meta-streak {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: rgb(251 146 60);
	}

	.lb-card-meta-streak :global(svg) {
		width: 0.85em;
		height: 0.85em;
	}

	.lb-card-meta-muted {
		color: rgb(100 116 139);
	}

	.lb-card-right {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		text-align: right;
	}

	.lb-xp-badge {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 1.25rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
		color: rgb(52 211 153);
		text-shadow:
			0 0 12px rgb(52 211 153 / 0.45),
			0 0 24px rgb(16 185 129 / 0.25);
		white-space: nowrap;
	}

	.lb-xp-suffix {
		margin-left: 0.15rem;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgb(110 231 183 / 0.9);
		vertical-align: 0.05em;
	}

	.lb-card-streak-compact {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.72rem;
		font-weight: 800;
		color: rgb(251 146 60);
	}

	.lb-card-streak-compact :global(svg) {
		width: 0.9em;
		height: 0.9em;
	}

	.lb-outer {
		grid-template-columns: 1fr;
		gap: var(--bento-gap-md);
		margin-bottom: var(--bento-gap-md);
	}

	.lb-shell {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
		background: var(--pp-surface-elevated, var(--glass-bg));
		border: 1px solid var(--pp-border, var(--glass-border));
	}

	.lb-header {
		margin-bottom: var(--bento-gap-sm);
		padding-bottom: var(--bento-gap-sm);
		border-bottom: 1px solid var(--pp-border, var(--border-subtle));
	}

	.lb-title {
		margin: 0;
		font-size: clamp(1.1rem, 3.2vw, 1.35rem);
		font-weight: 900;
		letter-spacing: -0.02em;
		color: var(--pp-text, var(--text-primary));
	}

	.lb-sub {
		margin: 8px 0 0;
		font-size: clamp(0.86rem, 2.4vw, 0.92rem);
		color: var(--pp-text-muted, var(--text-secondary));
		font-weight: 600;
	}

	.lb-hint {
		margin: 0;
		font-weight: 600;
		color: var(--pp-text-muted, var(--text-secondary));
		line-height: 1.55;
	}

	.lb-err {
		margin: 0;
		font-weight: 700;
		color: var(--danger-red);
	}

	.lb-rank-podium {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 12px;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	.lb-rank-podium--1 {
		background: linear-gradient(145deg, #fde68a, #f59e0b);
		color: #0f172a;
		box-shadow:
			0 0 20px rgba(245, 158, 11, 0.55),
			0 0 36px rgba(245, 158, 11, 0.2);
	}

	.lb-rank-podium--2 {
		background: linear-gradient(145deg, #e2e8f0, #94a3b8);
		color: #0f172a;
		box-shadow:
			0 0 16px rgba(148, 163, 184, 0.5),
			0 0 28px rgba(148, 163, 184, 0.15);
	}

	.lb-rank-podium--3 {
		background: linear-gradient(145deg, #fdba74, #c2410c);
		color: #fff;
		box-shadow:
			0 0 16px rgba(194, 65, 12, 0.45),
			0 0 28px rgba(194, 65, 12, 0.15);
	}

	.lb-you {
		display: inline-block;
		margin-left: 8px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		background: var(--pp-accent, var(--brand-primary));
		color: #fff;
		vertical-align: middle;
	}

</style>
