<script>
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import {
		enterpriseRadialOptions,
		EC_ACCENT,
		EC_INK,
		EC_INK_LIGHT,
	} from '$lib/charts/enterpriseChartTheme.js';
	import { getAttributeSchemaForSport } from '$lib/utils/sport-attributes.js';

	let { teamId = '' } = $props();

	let radarCanvasEl = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let mounted = $state(false);
	/** @type {any} */
	let radarChart = null;
	let last7DayXpTotal = $state(0);

	/** @type {Array<{ label: string, heightPct: number, xp: number }>} */
	let velocityBars = $state([]);

	$effect(() => {
		if (!browser || !mounted || !radarCanvasEl || !teamId) return;
		let cancelled = false;

		void (async () => {
			try {
				const [repsSnap, teamSnap, statsSnap, lookupSnap] = await Promise.all([
					getDocs(query(collection(db, 'reps'), where('teamId', '==', teamId))),
					getDoc(doc(db, 'teams', teamId)),
					getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
					getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId))),
				]);

				const dayKeys = getLast7DayKeys();
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

				const maxDayXp = Math.max(1, ...dayKeys.map((k) => xpByDay[k]));
				velocityBars = dayKeys.map((k) => {
					const xp = xpByDay[k];
					const heightPct = Math.max(18, Math.round((xp / maxDayXp) * 92));
					const [y, m, day] = k.split('-').map(Number);
					const dt = new Date(y, m - 1, day);
					return { label: shortWeekLabel(dt), heightPct, xp };
				});

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
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
					RadarController,
					RadialLinearScale,
				} = mod;
				Chart.register(
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
					RadarController,
					RadialLinearScale,
				);

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
								pointHoverBackgroundColor: EC_ACCENT,
							},
						],
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
								pointLabels: { color: EC_INK, font: { size: 11, weight: '600' } },
							},
						},
					},
				});
			} catch (e) {
				console.error('[CoachTeamXpVelocityChart] chart load failed', e);
			}
		})();

		return () => {
			cancelled = true;
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
	 * Single-letter weekday labels: M T W Th F S Su
	 * @param {Date} d
	 */
	function shortWeekLabel(d) {
		const dow = d.getDay();
		const labels = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];
		return labels[dow];
	}

	onMount(() => {
		mounted = true;
	});
</script>

{#if teamId}
	<div class="ec-coach-xp">
		<div
			class="ec-coach-xp__card flex flex-col rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md"
		>
			<h3 class="mb-1 text-sm font-bold text-slate-100">Team XP velocity (last 7 days)</h3>
			<p class="mb-1 font-mono text-2xl font-black tracking-tight text-cyan-400 tabular-nums">
				{last7DayXpTotal.toLocaleString()} XP
			</p>
			<p class="mb-6 text-xs text-slate-500">Daily team XP (minutes × 2) · pure CSS bars</p>

			<div class="flex min-h-[11rem] flex-1 items-end justify-between gap-1.5 px-0.5 sm:gap-2">
				{#each velocityBars as bar, i (`${bar.label}-${i}-${bar.xp}`)}
					<div class="flex min-w-0 flex-1 flex-col items-center gap-2">
						<div
							class="flex h-36 w-full items-end justify-center rounded-t-md bg-slate-950/50 ring-1 ring-inset ring-white/[0.06]"
						>
							<div
								class="w-[72%] max-w-[3rem] rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-[height] duration-300"
								style="height: {bar.heightPct}%"
								title="{bar.xp} XP"
							></div>
						</div>
						<span class="text-xs text-slate-500">{bar.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<div
			class="ec-coach-xp__card flex flex-col rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md"
		>
			<h3 class="mb-1 text-sm font-bold text-slate-100">Team average attributes</h3>
			<p class="mb-4 text-xs text-slate-500">
				Average ratings from active roster `player_stats` for this team.
			</p>
			<div class="ec-coach-xp__chart ec-coach-xp__chart--radar flex-1">
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
		box-sizing: border-box;
		min-width: 0;
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
