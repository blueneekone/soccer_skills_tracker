<script>
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import {
		enterpriseChartOptions,
		enterpriseRadialOptions,
		EC_ACCENT,
		EC_INK,
		EC_INK_LIGHT
	} from '$lib/charts/enterpriseChartTheme.js';
	import { getAttributeSchemaForSport } from '$lib/utils/sport-attributes.js';

	let { teamId = '' } = $props();

	let xpCanvasEl = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let radarCanvasEl = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let mounted = $state(false);
	/** @type {any} */
	let xpChart = null;
	/** @type {any} */
	let radarChart = null;
	let last7DayXpTotal = $state(0);

	$effect(() => {
		if (!browser || !mounted || !xpCanvasEl || !radarCanvasEl || !teamId) return;
		let cancelled = false;

		void (async () => {
			try {
				const [repsSnap, teamSnap, statsSnap, lookupSnap] = await Promise.all([
					getDocs(query(collection(db, 'reps'), where('teamId', '==', teamId))),
					getDoc(doc(db, 'teams', teamId)),
					getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
					getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId)))
				]);

				const dayKeys = getLast7DayKeys();
				const dailyLabels = dayKeys.map((k) => formatDayLabelFromKey(k));
				/** @type {Record<string, number>} */
				const xpByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]));
				repsSnap.forEach((row) => {
					const d = row.data();
					const key = toLocalDateKey(safeGetDate(d));
					if (!(key in xpByDay)) return;
					const mins = Number(d.minutes || 0);
					xpByDay[key] += Math.floor(mins * 2);
				});
				last7DayXpTotal = dayKeys.reduce((sum, k) => sum + xpByDay[k], 0);

				const teamData = teamSnap.exists() ? teamSnap.data() : {};
				const sportHint =
					typeof teamData?.sport === 'string' ? teamData.sport
					: typeof teamData?.courtType === 'string' ? teamData.courtType
					: 'generic';
				const schema = getAttributeSchemaForSport(sportHint);

				/** @type {Set<string>} */
				const activeNames = new Set();
				lookupSnap.forEach((row) => {
					const d = row.data();
					const status = typeof d.status === 'string' ? d.status.toLowerCase() : '';
					const playerName = typeof d.playerName === 'string' ? d.playerName.trim() : '';
					if (status === 'active' && playerName) activeNames.add(playerName);
				});

				const rosterStats = [];
				statsSnap.forEach((row) => {
					const d = row.data();
					const playerName = typeof d.playerName === 'string' ? d.playerName.trim() : '';
					if (activeNames.size > 0 && playerName && !activeNames.has(playerName)) return;
					rosterStats.push(d);
				});

				/** @type {number[]} */
				const avgValues = [];
				for (const key of schema.keys) {
					let sum = 0;
					let samples = 0;
					for (const stat of rosterStats) {
						const flat = Number(stat?.[key]);
						if (Number.isFinite(flat)) {
							sum += flat;
							samples += 1;
							continue;
						}
						const skillVal = Number(stat?.skills?.[key]);
						if (Number.isFinite(skillVal)) {
							sum += skillVal;
							samples += 1;
						}
					}
					avgValues.push(samples > 0 ? Math.round(sum / samples) : 0);
				}

				if (cancelled) return;
				await tick();
				const mod = await import('chart.js');
				const {
					Chart,
					LineController,
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
					RadarController,
					RadialLinearScale
				} = mod;
				Chart.register(
					LineController,
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
					RadarController,
					RadialLinearScale
				);

				xpChart?.destroy();
				const xpOpts = enterpriseChartOptions(false);
				xpChart = new Chart(xpCanvasEl, {
					type: 'line',
					data: {
						labels: dailyLabels,
						datasets: [
							{
								label: 'Team XP (daily)',
								data: dayKeys.map((k) => xpByDay[k]),
								borderColor: EC_ACCENT,
								backgroundColor: 'rgba(245, 158, 11, 0.14)',
								fill: true,
								tension: 0.28,
								pointRadius: 3,
								pointBackgroundColor: EC_INK
							}
						]
					},
					options: {
						...xpOpts,
						plugins: { ...xpOpts.plugins, legend: { display: false } },
						scales: {
							x: {
								grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
								ticks: { color: EC_INK_LIGHT, font: { size: 10 } }
							},
							y: {
								beginAtZero: true,
								grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
								ticks: { color: EC_INK_LIGHT, font: { size: 11 } }
							}
						}
					}
				});

				radarChart?.destroy();
				const radarOpts = enterpriseRadialOptions(false);
				radarChart = new Chart(radarCanvasEl, {
					type: 'radar',
					data: {
						labels: schema.labels,
						datasets: [
							{
								label: 'Team average attributes',
								data: avgValues,
								borderColor: EC_INK,
								backgroundColor: 'rgba(63, 63, 70, 0.16)',
								pointBackgroundColor: EC_ACCENT,
								pointBorderColor: '#ffffff',
								pointHoverBackgroundColor: EC_ACCENT
							}
						]
					},
					options: {
						...radarOpts,
						scales: {
							r: {
								min: 0,
								max: 99,
								ticks: { display: false, stepSize: 20, color: EC_INK_LIGHT },
								angleLines: { color: 'rgba(0,0,0,0.06)' },
								grid: { color: 'rgba(0,0,0,0.06)' },
								pointLabels: { color: EC_INK, font: { size: 11, weight: '600' } }
							}
						}
					}
				});
			} catch (e) {
				console.error('[CoachTeamXpVelocityChart] chart load failed', e);
			}
		})();

		return () => {
			cancelled = true;
			xpChart?.destroy();
			xpChart = null;
			radarChart?.destroy();
			radarChart = null;
		};
	});

	function getLast7DayKeys() {
		/** @type {string[]} */
		const keys = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		for (let i = 6; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(today.getDate() - i);
			keys.push(toLocalDateKey(d));
		}
		return keys;
	}

	/**
	 * @param {Date} d
	 */
	function toLocalDateKey(d) {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		const y = x.getFullYear();
		const m = String(x.getMonth() + 1).padStart(2, '0');
		const day = String(x.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	/**
	 * @param {string} dateKey
	 */
	function formatDayLabelFromKey(dateKey) {
		const [year, month, day] = dateKey.split('-').map(Number);
		const d = new Date(year, month - 1, day);
		return d.toLocaleDateString(undefined, { weekday: 'short' });
	}

	onMount(() => {
		mounted = true;
	});
</script>

{#if teamId}
	<div class="ec-coach-xp">
		<div class="ec-coach-xp__card">
			<h3 class="ec-coach-xp__title">Team XP velocity (last 7 days)</h3>
			<p class="ec-coach-xp__total">{last7DayXpTotal} XP</p>
			<p class="ec-coach-xp__sub">Daily team XP total (minutes × 2) across the last 7 days.</p>
			<div class="ec-coach-xp__chart">
				<canvas bind:this={xpCanvasEl} aria-label="Team XP velocity last 7 days chart"></canvas>
			</div>
		</div>

		<div class="ec-coach-xp__card">
			<h3 class="ec-coach-xp__title">Team average attributes</h3>
			<p class="ec-coach-xp__sub">Average ratings from active roster `player_stats` values for this team.</p>
			<div class="ec-coach-xp__chart ec-coach-xp__chart--radar">
				<canvas bind:this={radarCanvasEl} aria-label="Team average attributes radar chart"></canvas>
			</div>
		</div>
	</div>
{/if}

<style>
	.ec-coach-xp {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 14px;
		margin-bottom: 16px;
		align-items: stretch;
	}

	.ec-coach-xp__card {
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #ffffff;
		padding: 1.25rem;
		box-sizing: border-box;
	}

	:global(html.dark) .ec-coach-xp__card {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f172a;
	}

	.ec-coach-xp__title {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.ec-coach-xp__total {
		margin: 0;
		font-size: clamp(1.3rem, 3.2vw, 1.9rem);
		font-weight: 900;
		letter-spacing: -0.02em;
		color: var(--brand-primary, #f59e0b);
	}

	.ec-coach-xp__sub {
		margin: 0.3rem 0 0.8rem;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.ec-coach-xp__chart {
		position: relative;
		flex: 1 1 auto;
		height: 220px;
		max-width: 100%;
	}

	.ec-coach-xp__chart--radar {
		height: 250px;
	}
</style>
