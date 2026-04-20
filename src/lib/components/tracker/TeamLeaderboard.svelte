<script>
	import { browser } from '$app/environment';
	import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** Optional team id for director / super_admin. */
	let { teamIdForStaff = '' } = $props();

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
		if (staff && (role === 'director' || role === 'super_admin')) {
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
	 * @param {number} rank
	 */
	function tierClass(rank) {
		if (rank === 1) return 'lb-row--gold';
		if (rank === 2) return 'lb-row--silver';
		if (rank === 3) return 'lb-row--bronze';
		return '';
	}
</script>

<div class="lb-outer bento-section">
	<div class="card lb-shell">
		<div class="lb-header">
			<div>
				<h2 class="lb-title">Team leaderboard</h2>
				<p class="lb-sub">Top 15 by XP this week · 🔥 = streak</p>
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
			<div class="lb-table-wrap">
				<table class="lb-table">
					<thead>
						<tr>
							<th class="lb-th-rank">#</th>
							<th>Player</th>
							<th class="lb-th-num">Lv</th>
							<th class="lb-th-week">XP week</th>
							<th class="lb-th-streak">Streak</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as row (row.playerKey)}
							<tr
								class="lb-row {tierClass(row.rank)}"
								class:lb-row--me={row.isCurrentUser}
							>
								<td class="lb-td-rank">
									{#if row.rank <= 3}
										<span class="lb-rank-podium lb-rank-podium--{row.rank}">{row.rank}</span>
									{:else}
										<span class="lb-rank-num">{row.rank}</span>
									{/if}
								</td>
								<td class="lb-td-name">
									{row.displayName}
									{#if row.isCurrentUser}
										<span class="lb-you">You</span>
									{/if}
								</td>
								<td class="lb-td-num">{row.currentLevel}</td>
								<td class="lb-td-week">{row.xpThisWeek.toLocaleString()}</td>
								<td class="lb-td-streak">
									{#if row.streak > 0}
										<span class="lb-fire" title="Current streak">🔥 {row.streak}</span>
									{:else}
										<span class="lb-dash">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.lb-outer {
		grid-template-columns: 1fr;
		gap: clamp(16px, 3vw, 24px);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.lb-shell {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
		background: var(--pp-surface-elevated, var(--glass-bg));
		border: 1px solid var(--pp-border, var(--glass-border));
	}

	.lb-header {
		margin-bottom: clamp(14px, 2.5vw, 18px);
		padding-bottom: clamp(12px, 2vw, 16px);
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

	.lb-table-wrap {
		overflow-x: auto;
		border-radius: var(--radius-premium);
		border: 1px solid var(--pp-border, var(--glass-border));
		background: var(--pp-surface, rgba(15, 23, 42, 0.4));
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
	}

	.lb-table {
		width: 100%;
		border-collapse: collapse;
		font-size: clamp(0.88rem, 2.2vw, 0.95rem);
	}

	.lb-table th,
	.lb-table td {
		padding: clamp(12px, 2vw, 14px) clamp(14px, 2.5vw, 16px);
		text-align: left;
		border-bottom: 1px solid var(--pp-border, var(--border-subtle));
	}

	.lb-table thead th {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		font-weight: 900;
		color: var(--pp-text-muted, var(--text-secondary));
		background: var(--pp-surface-elevated, var(--surface-subtle));
	}

	.lb-th-rank {
		width: 4.5rem;
	}

	.lb-th-num,
	.lb-th-week,
	.lb-th-streak {
		text-align: right;
		width: 5rem;
	}

	.lb-row:last-child td {
		border-bottom: none;
	}

	.lb-row--gold {
		background: linear-gradient(
			90deg,
			rgba(245, 158, 11, 0.28) 0%,
			transparent 70%
		);
		box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.35);
	}

	.lb-row--silver {
		background: linear-gradient(
			90deg,
			rgba(148, 163, 184, 0.22) 0%,
			transparent 70%
		);
		box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
	}

	.lb-row--bronze {
		background: linear-gradient(
			90deg,
			rgba(180, 83, 9, 0.2) 0%,
			transparent 70%
		);
		box-shadow: inset 0 0 0 1px rgba(180, 83, 9, 0.3);
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
		box-shadow: 0 0 18px rgba(245, 158, 11, 0.45);
	}

	.lb-rank-podium--2 {
		background: linear-gradient(145deg, #e2e8f0, #94a3b8);
		color: #0f172a;
		box-shadow: 0 0 14px rgba(148, 163, 184, 0.4);
	}

	.lb-rank-podium--3 {
		background: linear-gradient(145deg, #fdba74, #c2410c);
		color: #fff;
		box-shadow: 0 0 14px rgba(194, 65, 12, 0.35);
	}

	.lb-row--me {
		outline: 2px solid var(--pp-accent, var(--brand-primary));
		outline-offset: -2px;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.06),
			0 0 22px color-mix(in srgb, var(--pp-accent, var(--brand-primary)) 22%, transparent);
		position: relative;
		z-index: 1;
	}

	.lb-td-rank {
		font-weight: 900;
		white-space: nowrap;
	}

	.lb-rank-num {
		font-variant-numeric: tabular-nums;
	}

	.lb-td-name {
		font-weight: 700;
		color: var(--pp-text, var(--text-primary));
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

	.lb-td-num,
	.lb-td-week,
	.lb-td-streak {
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		color: var(--pp-text, var(--text-primary));
	}

	.lb-td-week {
		color: var(--pp-accent, var(--brand-primary));
	}

	.lb-fire {
		font-weight: 800;
	}

	.lb-dash {
		color: var(--pp-text-muted, var(--text-secondary));
		font-weight: 600;
	}
</style>
