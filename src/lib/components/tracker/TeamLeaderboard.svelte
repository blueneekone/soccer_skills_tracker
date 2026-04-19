<script>
	import { browser } from '$app/environment';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** Optional team id for director / super_admin callables. */
	let { teamIdForStaff = '' } = $props();

	const getTeamLeaderboard = httpsCallable(functions, 'getTeamLeaderboard');

	let loading = $state(true);
	let err = $state('');
	/** @type {Array<{ rank: number, playerKey: string, displayName: string, xp: number, currentStreak: number, isCurrentUser: boolean }>} */
	let entries = $state([]);

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);

	$effect(() => {
		if (!browser) return;
		if (!authStore.isAuthenticated || authStore.isLoading) return;

		if (role === 'parent' || role === 'registrar') {
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
				const payload = {};
				if (role === 'director' || role === 'super_admin') {
					const tid =
						(typeof teamIdForStaff === 'string' && teamIdForStaff.trim()) ||
						(typeof profile?.teamId === 'string' ? profile.teamId : '');
					if (!tid || tid === 'admin') {
						if (!cancelled) {
							entries = [];
							loading = false;
						}
						return;
					}
					payload.teamId = tid.trim();
				}

				const res = await getTeamLeaderboard(payload);
				const data = /** @type {{ ok?: boolean, entries?: typeof entries }} */ (res.data);
				if (cancelled) return;
				if (data?.ok && Array.isArray(data.entries)) {
					entries = data.entries;
				} else {
					err = 'Could not load leaderboard.';
				}
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

	function medalForRank(r) {
		if (r === 1) return '🥇';
		if (r === 2) return '🥈';
		if (r === 3) return '🥉';
		return '';
	}

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
				<p class="lb-sub">Top players by XP · 🔥 = daily streak</p>
			</div>
		</div>

		{#if loading}
			<p class="lb-hint">Loading rankings…</p>
		{:else if err}
			<p class="lb-err" role="alert">{err}</p>
		{:else if entries.length === 0}
			<p class="lb-hint">No ranked players yet. Log in daily to earn XP and climb the board.</p>
		{:else}
			<div class="lb-table-wrap">
				<table class="lb-table">
					<thead>
						<tr>
							<th class="lb-th-rank">#</th>
							<th>Player</th>
							<th class="lb-th-num">XP</th>
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
									<span class="lb-medal" aria-hidden="true">{medalForRank(row.rank)}</span>
									<span class="lb-rank-num">{row.rank}</span>
								</td>
								<td class="lb-td-name">
									{row.displayName}
									{#if row.isCurrentUser}
										<span class="lb-you">You</span>
									{/if}
								</td>
								<td class="lb-td-num">{row.xp.toLocaleString()}</td>
								<td class="lb-td-streak">
									{#if row.currentStreak > 0}
										<span class="lb-fire" title="Current streak">🔥 {row.currentStreak}</span>
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
	}

	.lb-header {
		margin-bottom: clamp(14px, 2.5vw, 18px);
		padding-bottom: clamp(12px, 2vw, 16px);
		border-bottom: 1px solid var(--border-subtle);
	}

	.lb-title {
		margin: 0;
		font-size: clamp(1.1rem, 3.2vw, 1.35rem);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.lb-sub {
		margin: 8px 0 0;
		font-size: clamp(0.86rem, 2.4vw, 0.92rem);
		color: var(--text-secondary);
		font-weight: 600;
	}

	.lb-hint {
		margin: 0;
		font-weight: 600;
		color: var(--text-secondary);
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
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
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
		border-bottom: 1px solid var(--border-subtle);
	}

	.lb-table thead th {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		font-weight: 900;
		color: var(--text-secondary);
		background: var(--surface-subtle);
	}

	.lb-th-rank {
		width: 4.5rem;
	}

	.lb-th-num,
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
			rgba(245, 158, 11, 0.18) 0%,
			transparent 65%
		);
	}

	.lb-row--silver {
		background: linear-gradient(
			90deg,
			rgba(148, 163, 184, 0.22) 0%,
			transparent 65%
		);
	}

	.lb-row--bronze {
		background: linear-gradient(
			90deg,
			rgba(180, 83, 9, 0.16) 0%,
			transparent 65%
		);
	}

	.lb-row--me {
		outline: 2px solid var(--aggie-blue);
		outline-offset: -2px;
		box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
	}

	.lb-td-rank {
		font-weight: 900;
		white-space: nowrap;
	}

	.lb-medal {
		margin-right: 6px;
	}

	.lb-rank-num {
		font-variant-numeric: tabular-nums;
	}

	.lb-td-name {
		font-weight: 700;
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
		background: var(--aggie-blue);
		color: #fff;
		vertical-align: middle;
	}

	.lb-td-num,
	.lb-td-streak {
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
	}

	.lb-fire {
		font-weight: 800;
	}

	.lb-dash {
		color: var(--text-secondary);
		font-weight: 600;
	}

	:global(html.dark) .lb-table-wrap {
		background: rgba(15, 23, 42, 0.45);
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(html.dark) .lb-row--me {
		outline-color: #38bdf8;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
	}
</style>
