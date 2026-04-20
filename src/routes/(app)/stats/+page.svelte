<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import Modal from '$lib/components/Modal.svelte';
	import ProPlayerCard from '$lib/components/stats/ProPlayerCard.svelte';

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = null;
	let chartJsReady = $state(false);

	const profile = $derived(authStore.userProfile);

	const playerEmailKey = $derived(
		(authStore.user?.email || '').trim().toLowerCase(),
	);

	const isPlayerRole = $derived(authStore.role === 'player');

	/** @param {string} link */
	function publicRecruitOriginForLink(link) {
		try {
			return new URL(link).origin;
		} catch {
			return '';
		}
	}

	function publicRecruitProfileUrl() {
		if (!browser || !playerEmailKey) return '';
		const env = import.meta.env.VITE_PUBLIC_SITE_URL;
		const origin =
			typeof env === 'string' && env.trim().length > 0
				? env.replace(/\/$/, '')
				: window.location.origin;
		return `${origin}/recruit/${encodeURIComponent(playerEmailKey)}`;
	}

	let recruitToggle = $state(false);
	let recruitSaving = $state(false);
	let recruitErr = $state('');
	let qrDataUrl = $state('');
	let copyFeedback = $state('');

	$effect(() => {
		recruitToggle = !!profile?.recruitProfilePublic;
	});

	/**
	 * @param {boolean} next
	 */
	async function onRecruitToggle(next) {
		if (!playerEmailKey || !isPlayerRole || recruitSaving) return;
		recruitSaving = true;
		recruitErr = '';
		try {
			await updateDoc(doc(db, 'users', playerEmailKey), {
				recruitProfilePublic: next,
			});
			await authStore.refresh({ silent: true });
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Could not update recruiting preference.';
			recruitErr = msg;
			recruitToggle = !next;
		} finally {
			recruitSaving = false;
		}
	}

	$effect(() => {
		if (!browser || !recruitToggle || !playerEmailKey) {
			qrDataUrl = '';
			return;
		}
		const url = publicRecruitProfileUrl();
		let cancelled = false;
		(async () => {
			try {
				const QR = (await import('qrcode')).default;
				const dataUrl = await QR.toDataURL(url, {
					width: 220,
					margin: 2,
					color: { dark: '#0f172a', light: '#ffffff' },
				});
				if (!cancelled) qrDataUrl = dataUrl;
			} catch (e) {
				console.error(e);
				if (!cancelled) qrDataUrl = '';
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function copyRecruitLink() {
		const url = publicRecruitProfileUrl();
		if (!url) return;
		copyFeedback = '';
		try {
			await navigator.clipboard.writeText(url);
			copyFeedback = 'Copied';
			setTimeout(() => {
				copyFeedback = '';
			}, 2000);
		} catch {
			copyFeedback = 'Copy failed';
		}
	}

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
	const rankCrestClass = $derived(`stats-rank-crest--${currentRank.name.toLowerCase()}`);

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
		(async () => {
			const mod = await import('chart.js');
			ChartCtor = mod.Chart;
			mod.Chart.register(...mod.registerables);
			chartJsReady = true;
		})();
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
		chartJsReady;
		if (!ChartCtor || !chartEl || loading) return;
		const { labels, data } = buildChartData(chartRange);
		const { bar, tick, grid } = chartColors();
		if (chartInstance) chartInstance.destroy();
		chartInstance = new ChartCtor(chartEl, {
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
		return () => {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		};
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

	<ProPlayerCard
		playerEmailKey={playerEmailKey}
		playerDisplayName={profile?.playerName || ''}
	/>

	{#if isPlayerRole && playerEmailKey}
		<div class="recruit-center-outer bento-section">
			<div class="card recruit-center-shell">
				<div class="recruit-center-header">
					<div>
						<h2 class="recruit-center-title">Recruiting center</h2>
						<p class="recruit-center-sub">
							Share a public link with college scouts. Only coach-verified Pro Card
							metrics are exposed, and you must be 16+ with a public profile enabled
							server-side.
						</p>
					</div>
					<label class="recruit-switch" title="Public recruiting profile">
						<input
							type="checkbox"
							role="switch"
							checked={recruitToggle}
							disabled={recruitSaving}
							onchange={(e) => onRecruitToggle(e.currentTarget.checked)}
						/>
						<span class="recruit-switch-ui" aria-hidden="true"></span>
						<span class="recruit-switch-label">
							{recruitToggle ? 'Public' : 'Private'}
						</span>
					</label>
				</div>
				{#if recruitErr}
					<p class="recruit-err" role="alert">{recruitErr}</p>
				{/if}
				{#if recruitToggle}
					<div class="recruit-qr-row">
						<div class="recruit-qr-frame">
							{#if qrDataUrl}
								<img
									src={qrDataUrl}
									width="220"
									height="220"
									alt="QR code linking to your public recruiting profile"
									class="recruit-qr-img"
								/>
							{:else}
								<p class="recruit-qr-placeholder">Generating QR code…</p>
							{/if}
						</div>
						<div class="recruit-link-actions">
							<p class="recruit-url-hint">
								QR and copy use
								<strong>{publicRecruitOriginForLink(publicRecruitProfileUrl()) || '—'}</strong>.
								Set <code class="recruit-code">VITE_PUBLIC_SITE_URL</code> in production
								if the app is served from a different host than your public domain.
							</p>
							<button
								type="button"
								class="secondary-btn"
								onclick={copyRecruitLink}
								disabled={!qrDataUrl}
							>
								Copy profile link
							</button>
							{#if copyFeedback}
								<span class="recruit-copy-feedback">{copyFeedback}</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="bento-section">
		<div class="card">
			<div class="card-body text-center">
				<div class="stats-rank-crest {rankCrestClass}" aria-hidden="true">
					<span class="stats-rank-crest-letter">{currentRank.name.charAt(0)}</span>
				</div>
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

	.recruit-center-outer {
		grid-template-columns: 1fr;
		gap: clamp(16px, 3vw, 24px);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.recruit-center-shell {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.recruit-center-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: clamp(14px, 3vw, 20px);
		margin-bottom: clamp(12px, 2vw, 16px);
		padding-bottom: clamp(12px, 2vw, 16px);
		border-bottom: 1px solid var(--border-subtle);
	}

	.recruit-center-title {
		margin: 0;
		font-size: clamp(1.1rem, 3.2vw, 1.35rem);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.recruit-center-sub {
		margin: 8px 0 0;
		max-width: 52ch;
		font-size: clamp(0.86rem, 2.4vw, 0.92rem);
		color: var(--text-secondary);
		font-weight: 600;
		line-height: 1.55;
	}

	.recruit-switch {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		font-weight: 800;
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.recruit-switch input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.recruit-switch-ui {
		position: relative;
		width: 48px;
		height: 28px;
		border-radius: 999px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		transition: background 0.2s ease;
		flex-shrink: 0;
	}

	.recruit-switch-ui::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
		transition: transform 0.2s ease;
	}

	.recruit-switch input:checked + .recruit-switch-ui {
		background: linear-gradient(135deg, var(--aggie-blue) 0%, #1e3a5f 100%);
		border-color: rgba(15, 23, 42, 0.35);
	}

	.recruit-switch input:checked + .recruit-switch-ui::after {
		transform: translateX(20px);
	}

	.recruit-switch input:focus-visible + .recruit-switch-ui {
		outline: 2px solid var(--focus-ring-color);
		outline-offset: 2px;
	}

	.recruit-switch input:disabled + .recruit-switch-ui {
		opacity: 0.55;
	}

	.recruit-switch-label {
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.72rem;
	}

	.recruit-err {
		margin: 0 0 12px;
		color: var(--danger-red);
		font-weight: 700;
		font-size: 0.9rem;
	}

	.recruit-qr-row {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(20px, 4vw, 28px);
		align-items: flex-start;
	}

	.recruit-qr-frame {
		padding: clamp(12px, 2vw, 16px);
		border-radius: var(--radius-premium);
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
	}

	.recruit-qr-img {
		display: block;
		border-radius: 12px;
	}

	.recruit-qr-placeholder {
		margin: 0;
		width: 220px;
		height: 220px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		color: var(--text-secondary);
		font-size: 0.9rem;
		text-align: center;
		padding: 12px;
		box-sizing: border-box;
	}

	.recruit-link-actions {
		flex: 1;
		min-width: min(100%, 240px);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.recruit-url-hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-secondary);
		font-weight: 600;
		line-height: 1.5;
	}

	.recruit-code {
		font-size: 0.78em;
		padding: 2px 6px;
		border-radius: 6px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}

	.recruit-copy-feedback {
		font-size: 0.82rem;
		font-weight: 800;
		color: var(--success-green);
	}

	:global(html.dark) .recruit-qr-frame {
		background: rgba(15, 23, 42, 0.55);
		border-color: rgba(255, 255, 255, 0.12);
	}
</style>
