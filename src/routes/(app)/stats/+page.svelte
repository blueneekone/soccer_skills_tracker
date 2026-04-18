<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import Modal from '$lib/components/Modal.svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	const profile = $derived(authStore.userProfile);

	let logs = $state([]);
	let trials = $state([]);
	let evals = $state([]);
	let loading = $state(true);

	// XP & Rank
	const RANKS = [
		{ name: 'ROOKIE', min: 0, max: 499 },
		{ name: 'STARTER', min: 500, max: 999 },
		{ name: 'VETERAN', min: 1000, max: 1999 },
		{ name: 'PRO', min: 2000, max: 2999 },
		{ name: 'LEGEND', min: 3000, max: Infinity }
	];
	const totalMins = $derived(logs.reduce((s, l) => s + (Number(l.minutes) || 0), 0));
	const xpPoints = $derived(Math.floor(totalMins * 2));
	const currentRank = $derived(RANKS.find((r) => xpPoints >= r.min && xpPoints <= r.max) || RANKS[0]);
	const nextRank = $derived(RANKS[RANKS.indexOf(currentRank) + 1]);
	const xpPct = $derived(nextRank ? Math.min(100, ((xpPoints - currentRank.min) / (nextRank.min - currentRank.min)) * 100) : 100);

	// Calendar
	let calOffset = $state(0);
	let dayModalOpen = $state(false);
	let dayModalDate = $state('');
	let dayModalLogs = $state([]);

	const calYear = $derived(new Date(new Date().getFullYear(), new Date().getMonth() + calOffset, 1).getFullYear());
	const calMonth = $derived(new Date(new Date().getFullYear(), new Date().getMonth() + calOffset, 1).getMonth());
	const calLabel = $derived(new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
	const daysInMonth = $derived(new Date(calYear, calMonth + 1, 0).getDate());
	const calDays = $derived(() => {
		const days = [];
		for (let i = 1; i <= daysInMonth; i++) {
			const d = new Date(calYear, calMonth, i);
			const hasLog = logs.some((l) => safeGetDate(l).toDateString() === d.toDateString());
			days.push({ num: i, date: d, hasLog });
		}
		return days;
	});

	const openDayModal = (day) => {
		if (!day.hasLog) return;
		dayModalDate = day.date.toDateString();
		dayModalLogs = logs.filter((l) => safeGetDate(l).toDateString() === day.date.toDateString());
		dayModalOpen = true;
	};

	// Chart (colors follow CSS vars for WCAG AAA in light + dark)
	let chartEl;
	let chartInstance;
	let chartRange = $state('7');
	let chartThemeKey = $state(0);

	onMount(() => {
		if (!browser) return;
		const mo = new MutationObserver(() => chartThemeKey++);
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => mo.disconnect();
	});

	const chartColors = () => {
		if (!browser) {
			return { bar: '#0f172a', tick: '#334155', grid: 'rgba(15,23,42,0.12)' };
		}
		const cs = getComputedStyle(document.documentElement);
		const pick = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
		return {
			bar: pick('--chart-bar', '#0f172a'),
			tick: pick('--chart-tick', '#334155'),
			grid: pick('--chart-grid', 'rgba(15,23,42,0.12)')
		};
	};

	const buildChartData = (range) => {
		let labels = [], data = [];
		const now = new Date();
		if (range === '7' || range === '30') {
			const days = parseInt(range);
			data = Array(days).fill(0);
			for (let i = days - 1; i >= 0; i--) {
				const d = new Date();
				d.setDate(now.getDate() - i);
				labels.push(range === '7' ? d.toLocaleDateString('en-US', { weekday: 'short' }) : `${d.getMonth() + 1}/${d.getDate()}`);
				data[(days - 1) - i] = logs.filter((l) => safeGetDate(l).toDateString() === d.toDateString()).reduce((s, l) => s + Number(l.minutes || 0), 0);
			}
		} else if (range === '90') {
			data = Array(12).fill(0);
			for (let i = 11; i >= 0; i--) {
				const wEnd = new Date(); wEnd.setDate(now.getDate() - i * 7);
				const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6);
				labels.push(`${wStart.getMonth() + 1}/${wStart.getDate()}`);
				data[11 - i] = logs.filter((l) => { const d = safeGetDate(l); return d >= wStart && d <= wEnd; }).reduce((s, l) => s + Number(l.minutes || 0), 0);
			}
		} else {
			data = Array(12).fill(0);
			for (let i = 11; i >= 0; i--) {
				const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
				labels.push(m.toLocaleDateString('en-US', { month: 'short' }));
				data[11 - i] = logs.filter((l) => { const d = safeGetDate(l); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); }).reduce((s, l) => s + Number(l.minutes || 0), 0);
			}
		}
		return { labels, data };
	};

	$effect(() => {
		chartThemeKey;
		if (!chartEl || loading) return;
		const { labels, data } = buildChartData(chartRange);
		const { bar, tick, grid } = chartColors();
		if (chartInstance) chartInstance.destroy();
		chartInstance = new Chart(chartEl, {
			type: 'bar',
			data: { labels, datasets: [{ data, backgroundColor: bar, borderRadius: 4 }] },
			options: {
				plugins: { legend: { display: false } },
				scales: {
					x: {
						ticks: { color: tick },
						grid: { display: false }
					},
					y: {
						beginAtZero: true,
						ticks: { color: tick },
						grid: { color: grid }
					}
				},
				responsive: true,
				maintainAspectRatio: false
			}
		});
	});

	// Leaderboard
	let lbFilter = $state('weekly');
	let lbEntries = $state([]);

	const loadLeaderboard = async () => {
		const tid = profile?.teamId;
		if (!tid) return;
		const filterDate = new Date();
		if (lbFilter === 'daily') filterDate.setDate(filterDate.getDate() - 1);
		else if (lbFilter === 'weekly') filterDate.setDate(filterDate.getDate() - 7);
		else if (lbFilter === 'monthly') filterDate.setMonth(filterDate.getMonth() - 1);
		else filterDate.setFullYear(2000);
		try {
			const snap = await getDocs(query(collection(db, 'reps'), where('teamId', '==', tid)));
			const stats = {};
			snap.forEach((d) => {
				const data = d.data();
				if (safeGetDate(data) >= filterDate) {
					const p = data.player || 'Unknown';
					stats[p] = (stats[p] || 0) + Number(data.minutes || 0);
				}
			});
			lbEntries = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
		} catch (e) { console.error(e); }
	};

	$effect(() => { if (!loading && profile?.teamId) loadLeaderboard(); });
	$effect(() => { if (lbFilter) loadLeaderboard(); });

	// CSV Export
	const exportCSV = () => {
		if (!logs.length) return alert('No logs found to export.');
		let csv = 'data:text/csv;charset=utf-8,Date,Time,Player,Minutes,Drills\n';
		logs.forEach((log) => {
			const d = safeGetDate(log);
			const drills = Array.isArray(log.drills) ? log.drills.map((x) => x.name).join('; ') : (log.drillSummary || 'Custom Session');
			csv += `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${log.player}","${log.minutes}","${drills.replace(/"/g, '""')}"\n`;
		});
		const link = document.createElement('a');
		link.href = encodeURI(csv);
		link.download = `${(profile?.playerName || 'Export').replace(/\s+/g, '_')}_Stats.csv`;
		document.body.appendChild(link); link.click(); document.body.removeChild(link);
	};

	// Load data
	$effect(() => {
		if (!profile?.playerName || !profile?.teamId) return;
		const pname = profile.playerName;
		const tid = profile.teamId;
		loading = true;
		Promise.all([
			getDocs(query(collection(db, 'reps'), where('player', '==', pname), where('teamId', '==', tid))),
			getDocs(query(collection(db, 'trials'), where('player', '==', pname))),
			getDocs(query(collection(db, 'evaluations'), where('player', '==', pname)))
		]).then(([rSnap, tSnap, eSnap]) => {
			logs = []; rSnap.forEach((d) => logs.push(d.data()));
			trials = []; tSnap.forEach((d) => trials.push({ id: d.id, ...d.data() }));
			trials.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
			evals = []; eSnap.forEach((d) => evals.push({ id: d.id, ...d.data() }));
			evals.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
		}).catch(console.error)
		.finally(() => (loading = false));
	});
</script>

<div class="view-section">
	<div class="cal-header-row no-print">
		<h2 class="view-title m-0">Player Stats</h2>
		<div class="header-btns">
			<button class="secondary-btn" onclick={exportCSV}>📥 Export CSV</button>
			<button class="secondary-btn" onclick={() => window.print()}>🖨️ Print Report</button>
		</div>
	</div>

	<div class="bento-section">
		<div class="card">
			<div class="card-body text-center">
				<h1 class="level-display">{currentRank.name}</h1>
				<p class="current-rank-label">Current Rank</p>
				<div class="xp-bar-container">
					<div class="xp-bar-fill" style="width: {xpPct}%"></div>
				</div>
				<div class="stats-totals-row">
					<div class="text-center"><span class="stat-number">{logs.length}</span><br /><span class="stat-label">Sessions</span></div>
					<div class="text-center"><span class="stat-number">{totalMins}</span><br /><span class="stat-label">Minutes</span></div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-gold-header">⭐ Challenge Progress</div>
			<div class="card-body p-0 overflow-x-auto">
				<table class="admin-table">
					<thead><tr><th>Date</th><th>Type</th><th>Skill</th><th>Result</th></tr></thead>
					<tbody>
						{#if trials.length === 0}
							<tr><td colspan="4" class="text-center">No trials completed yet.</td></tr>
						{:else}
							{#each trials as t}
								<tr>
									<td>{t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
									<td>{t.type}</td>
									<td>{t.skill}</td>
									<td>{t.result} {t.isCoach ? '⭐' : ''}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<div class="bento-section">
		<div class="card">
			<div class="card-header leaderboard-header-flex">
				<span>🏅 TEAM LEADERBOARD</span>
				<select bind:value={lbFilter} class="leaderboard-filter">
					<option value="weekly">Weekly</option>
					<option value="daily">Daily</option>
					<option value="monthly">Monthly</option>
					<option value="alltime">All-Time</option>
				</select>
			</div>
			<div class="card-body p-0 overflow-x-auto">
				<table class="admin-table">
					<thead><tr><th>Rank</th><th>Player</th><th>Total Minutes</th></tr></thead>
					<tbody>
						{#if lbEntries.length === 0}
							<tr><td colspan="3" class="text-center">No data for this time period</td></tr>
						{:else}
							{#each lbEntries as [player, mins], i}
								<tr><td>{i + 1}</td><td>{player}</td><td>{mins}m</td></tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div class="card">
			<div class="card-header">📈 Training Trend</div>
			<div class="card-body">
				<select bind:value={chartRange} class="trend-filter">
					<option value="7">Last 7 Days</option>
					<option value="30">Last 30 Days</option>
					<option value="90">Last 90 Days</option>
					<option value="all">All Time (Monthly)</option>
				</select>
				<div class="chart-container">
					<canvas bind:this={chartEl}></canvas>
				</div>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-header">
			<button class="action-btn" onclick={() => calOffset--}>◀</button>
			<span class="calendar-month-label">{calLabel}</span>
			<button class="action-btn" onclick={() => calOffset++}>▶</button>
		</div>
		<div class="card-body">
			<div class="cal-days-header cal-grid">
				{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as d}
					<div class="text-center text-sm-sub">{d}</div>
				{/each}
			</div>
			<div class="cal-grid">
				{#each calDays() as day}
					<div
						class="cal-day"
						class:has-log={day.hasLog}
						role={day.hasLog ? 'button' : 'cell'}
						tabindex={day.hasLog ? 0 : undefined}
						onclick={() => openDayModal(day)}
						onkeydown={(e) => e.key === 'Enter' && openDayModal(day)}
					>
						{day.num}
						{#if day.hasLog}<div class="cal-dot"></div>{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Coach Evaluations -->
	{#if evals.length > 0}
		<div class="card">
			<div class="card-header bg-blue-header">📋 Coach Evaluations</div>
			<div class="card-body p-0">
				<ul class="session-list">
					{#each evals as e}
						<li class="session-item eval-item">
							<div class="eval-content">
								<b>{e.skill}</b>
								<div class="text-sm-sub">{e.timestamp ? new Date(e.timestamp.seconds * 1000).toLocaleDateString() : ''}</div>
								{#if e.notes}<div class="eval-note">{e.notes}</div>{/if}
							</div>
							<span class="eval-score">Score: {e.score}/5</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- Day Modal -->
	<Modal bind:open={dayModalOpen} title={dayModalDate}>
		{#each dayModalLogs as l}
			<div class="day-log-item">
				<b>{l.player || 'Unknown'}</b><br />
				<span class="text-sm-sub">{l.drillSummary || l.drill || 'Workout'} ({l.minutes || 0}m)</span>
			</div>
		{/each}
	</Modal>
</div>

<style>
	.header-btns {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.leaderboard-header-flex {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}
	.leaderboard-filter {
		width: auto;
		margin: 0;
		padding: 6px 10px;
		font-size: 0.85rem;
	}
	.trend-filter {
		margin-bottom: 16px;
		width: auto;
	}
	.eval-item {
		border-left: 4px solid #065f46;
		align-items: flex-start;
	}
	.eval-content { flex: 1; }
	.eval-note {
		font-size: 0.8rem;
		background: #ecfdf5;
		color: #14532d;
		padding: 4px 8px;
		border-radius: 4px;
		margin-top: 4px;
		border: 1px solid #a7f3d0;
	}
	.eval-score {
		background: #065f46;
		color: #ffffff;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 800;
		white-space: nowrap;
	}
	.day-log-item {
		padding: 8px 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	:global(html.dark) .eval-item {
		border-left-color: #34d399;
	}
	:global(html.dark) .eval-note {
		background: rgba(52, 211, 153, 0.12);
		color: #d1fae5;
		border-color: rgba(52, 211, 153, 0.35);
	}
	:global(html.dark) .eval-score {
		background: #047857;
		color: #ffffff;
	}
	.day-log-item:last-child { border-bottom: none; }
</style>
