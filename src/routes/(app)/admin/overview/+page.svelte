<script lang="ts">
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDoc,
		query,
		orderBy,
		limit as fbLimit,
		getDocs,
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import '$lib/styles/enterprise-console.css';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** Strike 16 â€” Tabbed command center (SOAR/SIEM-style statistical surfaces) */
	const TAB_IDS = /** @type {const} */ (['executive', 'growth', 'security', 'platform']);
	const TAB_LABELS = /** @type {const} */ (['Executive', 'Growth', 'Security', 'Platform']);

	/** @type {'executive' | 'growth' | 'security' | 'platform'} */
	let activeTab = $state('executive');

	/** SOC-style ribbon â€” headline operational telemetry (representative / demo). */
	const SOC_RIBBON = /** @type {const} */ ([
		{ k: 'MTTR', v: '18m', s: 'Incidents Â· rolling 7d p50' },
		{ k: 'Playbooks', v: '2.4k', s: 'Automation runs Â· 24h' },
		{ k: 'Detections', v: '847/s', s: 'Rule evaluations Â· pipeline' },
		{ k: 'Ingest lag', v: '240ms', s: 'Audit + metrics Â· p95' },
	]);

	/**
	 * @typedef {'crit' | 'high' | 'med' | 'low' | 'ok' | 'info'} SocBand
	 * @typedef {{ label: string, value: string, hint: string, band?: SocBand, delta?: string, deltaDir?: 'up' | 'down' | 'flat' }} SocMetric
	 */

	/** @type {SocMetric[]} */
	let strike13Executive = $state([
		{ label: 'MRR', value: '$42.5k', hint: 'Monthly recurring', band: 'info', delta: '+4.2%', deltaDir: 'up' },
		{ label: 'ARR', value: '$510k', hint: 'Annual run rate', band: 'info', delta: '+11%', deltaDir: 'up' },
		{ label: 'Active Orgs', value: '142', hint: 'Tenant footprint', band: 'low', delta: '+6', deltaDir: 'up' },
		{ label: 'Total Players', value: '12.4k', hint: 'Platform headcount', band: 'low', delta: '+2.1%', deltaDir: 'up' },
		{ label: 'WAU/MAU', value: '68%', hint: 'Weekly / monthly', band: 'ok', delta: 'â€”', deltaDir: 'flat' },
		{ label: 'ARPU', value: '$299', hint: 'Blended ARPU', band: 'info', delta: '+$12', deltaDir: 'up' },
		{ label: 'Gross Retention', value: '98%', hint: 'Logo gross', band: 'ok', delta: '+0.4pp', deltaDir: 'up' },
		{ label: 'LTV', value: '$12k', hint: 'Cohort average', band: 'info', delta: '+3%', deltaDir: 'up' },
	]);

	/** @type {SocMetric[]} */
	let strike13Security = $state([
		{ label: 'WAF Blocks', value: '1,402', hint: 'Edge policy Â· 24h', band: 'info', delta: '+112', deltaDir: 'up' },
		{ label: 'Failed Auth', value: '45', hint: 'Rolling 24h', band: 'med', delta: 'âˆ’8%', deltaDir: 'down' },
		{ label: 'MFA Bypasses', value: '0', hint: 'Policy exceptions', band: 'ok', delta: '0', deltaDir: 'flat' },
		{ label: 'Vetting Pending', value: '14', hint: 'Background queue', band: 'med', delta: '+3', deltaDir: 'up' },
		{ label: 'Flagged Orgs', value: '2', hint: 'Compliance review', band: 'high', delta: 'âˆ’1', deltaDir: 'down' },
		{ label: 'API Abuse', value: '12', hint: 'Throttle / WAF', band: 'med', delta: '+2', deltaDir: 'up' },
		{ label: 'Priv. Escalation', value: '0', hint: 'Elevation attempts', band: 'ok', delta: '0', deltaDir: 'flat' },
		{ label: 'Suspicious IPs', value: '4', hint: 'Threat intel feed', band: 'high', delta: '+1', deltaDir: 'up' },
	]);

	/** Growth / platform tiles (charts hydrate from Firestore aggregates). */
	const MOCK_KPI = /** @type {const} */ ({
		growth: { ltvCac: '4.2', churn: '1.2%', pipelineARR: '$1.8M', paybackMo: '14' },
		platform: { apiLatency: '42ms', uptime: '99.99%', dbReads: '1.2M', storage: '2.4 TB' },
	});

	/** @type {SocMetric[]} */
	const GROWTH_TILES = [
		{
			label: 'LTV:CAC',
			value: MOCK_KPI.growth.ltvCac,
			hint: 'Blended cohort',
			band: 'ok',
			delta: '+0.3',
			deltaDir: 'up',
		},
		{
			label: 'Churn',
			value: MOCK_KPI.growth.churn,
			hint: 'Logo + revenue',
			band: 'low',
			delta: 'âˆ’0.1pp',
			deltaDir: 'down',
		},
		{
			label: 'Pipeline ARR',
			value: MOCK_KPI.growth.pipelineARR,
			hint: 'Weighted forecast',
			band: 'info',
			delta: '+$180k',
			deltaDir: 'up',
		},
		{
			label: 'CAC payback',
			value: `${MOCK_KPI.growth.paybackMo} mo`,
			hint: 'Months to recover',
			band: 'med',
			delta: 'âˆ’1 mo',
			deltaDir: 'down',
		},
	];

	/** @type {SocMetric[]} */
	const PLATFORM_TILES = [
		{
			label: 'API latency',
			value: MOCK_KPI.platform.apiLatency,
			hint: 'p50 edge â†’ API',
			band: 'ok',
			delta: 'âˆ’4ms',
			deltaDir: 'down',
		},
		{
			label: 'Uptime',
			value: MOCK_KPI.platform.uptime,
			hint: 'Trailing 30d SLO',
			band: 'ok',
			delta: '+0.01%',
			deltaDir: 'up',
		},
		{
			label: 'DB reads',
			value: MOCK_KPI.platform.dbReads,
			hint: 'Firestore aggregate',
			band: 'info',
			delta: '+8%',
			deltaDir: 'up',
		},
		{
			label: 'Storage',
			value: MOCK_KPI.platform.storage,
			hint: 'Object + media vault',
			band: 'low',
			delta: '+120 GB',
			deltaDir: 'up',
		},
	];

	/** @typedef {{ label: string, value: number }} SeriesPoint */
	/** @typedef {'live' | 'mock'} ChartSource */

	let mauSeries = $state(/** @type {SeriesPoint[]} */ ([]));
	let revenueByTier = $state(/** @type {SeriesPoint[]} */ ([]));
	let playersBySport = $state(/** @type {SeriesPoint[]} */ ([]));

	let mauSource = $state(/** @type {ChartSource} */ ('mock'));
	let revenueSource = $state(/** @type {ChartSource} */ ('mock'));
	let sportSource = $state(/** @type {ChartSource} */ ('mock'));

	let liveFeed = $state(
		/** @type {{ id: string, action: string, targetEmail: string, details: string, createdAt: Date | null }[]} */ (
			[]
		),
	);
	let feedLoading = $state(false);
	let feedErr = $state('');

	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading || !authStore.isAuthenticated) return;

		let destroyed = false;
		feedLoading = true;
		feedErr = '';

		const MOCK_MAU = [1200, 1400, 1650, 1820, 2140, 2380];
		const MOCK_REVENUE_BY_TIER = {
			starter: 4500,
			pro: 12000,
			club: 24000,
			enterprise: 8000,
		};
		const MOCK_BY_SPORT = {
			soccer: 1450,
			basketball: 820,
			volleyball: 340,
			baseball: 290,
			other: 120,
		};

		function prettySportLabel(raw) {
			const s = String(raw || '')
				.replace(/_/g, ' ')
				.trim();
			if (!s) return 'Unknown';
			return s.replace(/\b\w/g, (c) => c.toUpperCase());
		}

		const TIER_DEFS = /** @type {const} */ ([
			{ key: 'starter', label: 'Starter' },
			{ key: 'pro', label: 'Pro' },
			{ key: 'club', label: 'Club' },
			{ key: 'enterprise', label: 'Enterprise' },
			{ key: 'legacy', label: 'Legacy' },
		]);

		function buildMauLabels() {
			const now = new Date();
			const out = /** @type {{ key: string, label: string }[]} */ ([]);
			for (let i = 5; i >= 0; i--) {
				const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
				const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
				out.push({ key, label: d.toLocaleString(undefined, { month: 'short' }) });
			}
			return out;
		}

		(async () => {
			/** @type {Record<string, unknown> | null} */
			let totals = null;
			try {
				const totalsRef = doc(db, 'analytics', 'platform_totals');
				const totalsSnap = await getDoc(totalsRef);
				if (totalsSnap.exists()) totals = totalsSnap.data() || {};
			} catch (e) {
				console.warn('[overview] analytics/platform_totals read failed â€” using defaults', e);
				totals = null;
			}

			try {
				const labels = buildMauLabels();
				let values = /** @type {number[]} */ ([]);
				const raw = totals && totals.mau;

				if (Array.isArray(raw)) {
					const trimmed = raw.slice(-6);
					values = labels.map((_, i) => {
						const row = trimmed[i];
						if (row == null) return 0;
						const n = typeof row === 'number' ? row : Number(row?.value);
						return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
					});
				} else if (raw && typeof raw === 'object') {
					const map = /** @type {Record<string, unknown>} */ (raw);
					values = labels.map(({ key }) => {
						const n = Number(map[key]);
						return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
					});
				}

				const hasSignal = values.some((v) => v > 0);
				if (!hasSignal) values = [...MOCK_MAU];

				if (!destroyed) {
					mauSeries = labels.map(({ label }, i) => ({
						label,
						value: values[i] ?? 0,
					}));
					mauSource = hasSignal ? 'live' : 'mock';
				}
			} catch (e) {
				console.warn('[overview] MAU hydrate failed', e);
				if (!destroyed) {
					const labels = buildMauLabels();
					mauSeries = labels.map(({ label }, i) => ({
						label,
						value: MOCK_MAU[i] ?? 0,
					}));
					mauSource = 'mock';
				}
			}

			try {
				const revenue = /** @type {Record<string, number>} */ ({});
				const raw = totals && (totals.revenueByTier || totals.revenue);
				if (raw && typeof raw === 'object') {
					for (const [key, value] of Object.entries(raw)) {
						const n = Number(value);
						if (!Number.isFinite(n) || n < 0) continue;
						revenue[String(key).toLowerCase()] =
							(revenue[String(key).toLowerCase()] || 0) + Math.round(n);
					}
				}

				const hasSignal = Object.values(revenue).some((v) => v > 0);
				const source = hasSignal ? revenue : { ...MOCK_REVENUE_BY_TIER };

				const ordered = TIER_DEFS.map(({ key, label }) => ({
					label,
					value: Math.round(source[key] || 0),
				})).filter((s) => s.value > 0);

				if (!destroyed) {
					revenueByTier = ordered.length
						? ordered
						: TIER_DEFS.map(({ key, label }) => ({
								label,
								value: Math.round(MOCK_REVENUE_BY_TIER[key] || 0),
							})).filter((s) => s.value > 0);
					revenueSource = hasSignal ? 'live' : 'mock';
				}
			} catch (e) {
				console.warn('[overview] Revenue hydrate failed', e);
				if (!destroyed) {
					revenueByTier = TIER_DEFS.map(({ key, label }) => ({
						label,
						value: Math.round(MOCK_REVENUE_BY_TIER[key] || 0),
					})).filter((s) => s.value > 0);
					revenueSource = 'mock';
				}
			}

			try {
				const bySport = /** @type {Record<string, number>} */ ({});
				const rawSport = totals && totals.bySport;
				if (rawSport && typeof rawSport === 'object') {
					for (const [key, value] of Object.entries(rawSport)) {
						const n = Number(value);
						if (!Number.isFinite(n) || n < 0) continue;
						const k = String(key).toLowerCase();
						bySport[k] = (bySport[k] || 0) + Math.round(n);
					}
				}

				const hasSignal = Object.values(bySport).some((v) => v > 0);
				const sourceMap = hasSignal ? bySport : { ...MOCK_BY_SPORT };

				const ordered = Object.entries(sourceMap)
					.map(([k, value]) => ({ label: prettySportLabel(k), value }))
					.filter((s) => s.value > 0)
					.sort((a, b) => b.value - a.value);

				if (!destroyed) {
					playersBySport = ordered.length
						? ordered
						: Object.entries(MOCK_BY_SPORT).map(([k, v]) => ({
								label: prettySportLabel(k),
								value: Math.round(v),
							}));
					sportSource = hasSignal ? 'live' : 'mock';
				}
			} catch (e) {
				console.warn('[overview] bySport hydrate failed', e);
				if (!destroyed) {
					playersBySport = Object.entries(MOCK_BY_SPORT).map(([k, v]) => ({
						label: prettySportLabel(k),
						value: Math.round(v),
					}));
					sportSource = 'mock';
				}
			}

			try {
				const feedQ = query(
					collection(db, 'security_audit'),
					orderBy('createdAt', 'desc'),
					fbLimit(120),
				);
				const snap = await getDocs(feedQ).catch(async () => {
					return getDocs(
						query(collection(db, 'security_audit'), orderBy('timestamp', 'desc'), fbLimit(120)),
					).catch(() => null);
				});
				if (!snap) {
					if (!destroyed) liveFeed = [];
				} else {
					const rows = [];
					snap.forEach((d) => {
						const data = d.data();
						const ts =
							data?.createdAt?.toDate?.() ||
							data?.timestamp?.toDate?.() ||
							(data?.createdAt instanceof Date ? data.createdAt : null) ||
							null;
						rows.push({
							id: d.id,
							action: String(data?.action || 'EVENT'),
							targetEmail: String(data?.targetEmail || data?.target || data?.actorEmail || ''),
							details: String(data?.details || data?.message || ''),
							createdAt: ts instanceof Date ? ts : null,
						});
					});
					if (!destroyed) liveFeed = rows;
				}
			} catch (e) {
				console.warn('[overview] security_audit load failed', e);
				if (!destroyed) {
					feedErr = e instanceof Error ? e.message : 'Could not load audit log.';
					liveFeed = [];
				}
			}

			if (!destroyed) feedLoading = false;
		})();

		return () => {
			destroyed = true;
		};
	});

	let mauCanvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let revenueCanvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let sportCanvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));

	function cssVar(/** @type {string} */ name, /** @type {string} */ fallback) {
		if (!browser) return fallback;
		const v = getComputedStyle(document.documentElement).getPropertyValue(name);
		return (v || '').trim() || fallback;
	}

	$effect(() => {
		if (!browser || !mauCanvasEl) return;
		const target = mauCanvasEl;
		const series = mauSeries;
		let destroyed = false;
		/** @type {import('chart.js').Chart | null} */
		let chart = null;

		(async () => {
			try {
				const mod = await import('chart.js');
				if (destroyed || !target.isConnected) return;
				mod.Chart.register(...mod.registerables);
				const text = cssVar('--text-primary', '#0f172a');
				const muted = cssVar('--text-secondary', '#475569');
				const grid = cssVar('--chart-grid', 'rgba(15,23,42,0.08)');
				chart = new mod.Chart(target, {
					type: 'line',
					data: {
						labels: series.map((p) => p.label),
						datasets: [
							{
								label: 'Monthly active users',
								data: series.map((p) => p.value),
								borderColor: '#14b8a6',
								backgroundColor: 'rgba(20, 184, 166,0.14)',
								borderWidth: 2.5,
								tension: 0.35,
								fill: true,
								pointRadius: 3,
								pointHoverRadius: 5,
								pointBackgroundColor: '#14b8a6',
								pointBorderColor: '#ffffff',
								pointBorderWidth: 1.5,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						animation: { duration: 420 },
						plugins: {
							legend: { display: false },
							tooltip: {
								backgroundColor: 'rgba(9,9,11,0.92)',
								titleColor: '#fafafa',
								bodyColor: '#d4d4d8',
								padding: 10,
								cornerRadius: 8,
								displayColors: false,
							},
						},
						scales: {
							x: {
								ticks: { color: muted, font: { size: 11, weight: 600 } },
								grid: { color: 'transparent' },
							},
							y: {
								beginAtZero: true,
								ticks: { color: muted, font: { size: 11 }, precision: 0 },
								grid: { color: grid, drawBorder: false },
							},
						},
					},
				});
				void text;
			} catch (e) {
				console.warn('[overview] MAU chart init failed', e);
			}
		})();

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

	$effect(() => {
		if (!browser || !revenueCanvasEl) return;
		const target = revenueCanvasEl;
		const series = revenueByTier;
		let destroyed = false;
		/** @type {import('chart.js').Chart | null} */
		let chart = null;

		(async () => {
			try {
				const mod = await import('chart.js');
				if (destroyed || !target.isConnected) return;
				mod.Chart.register(...mod.registerables);
				const muted = cssVar('--text-secondary', '#475569');
				const palette = ['#14b8a6', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#38bdf8'];
				chart = new mod.Chart(target, {
					type: 'doughnut',
					data: {
						labels: series.map((p) => p.label),
						datasets: [
							{
								data: series.map((p) => p.value),
								backgroundColor: series.map((_, i) => palette[i % palette.length]),
								borderColor: 'rgba(0,0,0,0)',
								borderWidth: 2,
								hoverOffset: 6,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						cutout: '64%',
						animation: { duration: 480 },
						plugins: {
							legend: {
								position: 'bottom',
								labels: {
									color: muted,
									font: { size: 10, weight: 600 },
									boxWidth: 10,
									boxHeight: 10,
									padding: 8,
									usePointStyle: true,
								},
							},
							tooltip: {
								backgroundColor: 'rgba(9,9,11,0.92)',
								titleColor: '#fafafa',
								bodyColor: '#d4d4d8',
								padding: 10,
								cornerRadius: 8,
								callbacks: {
									label: (ctx) => {
										const total = ctx.dataset.data.reduce(
											(a, b) => Number(a) + Number(b),
											0,
										);
										const pct = total > 0 ? Math.round((Number(ctx.parsed) / total) * 100) : 0;
										return ` $${Number(ctx.parsed).toLocaleString()} Â· ${pct}%`;
									},
								},
							},
						},
					},
				});
			} catch (e) {
				console.warn('[overview] Revenue chart init failed', e);
			}
		})();

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

	$effect(() => {
		if (!browser || !sportCanvasEl) return;
		const target = sportCanvasEl;
		const series = playersBySport;
		let destroyed = false;
		/** @type {import('chart.js').Chart | null} */
		let chart = null;

		(async () => {
			try {
				const mod = await import('chart.js');
				if (destroyed || !target.isConnected) return;
				mod.Chart.register(...mod.registerables);
				const text = cssVar('--text-primary', '#0f172a');
				const muted = cssVar('--text-secondary', '#475569');
				const grid = cssVar('--chart-grid', 'rgba(15,23,42,0.08)');
				chart = new mod.Chart(target, {
					type: 'bar',
					data: {
						labels: series.map((p) => p.label),
						datasets: [
							{
								label: 'Players',
								data: series.map((p) => p.value),
								backgroundColor: 'rgba(20, 184, 166, 0.45)',
								borderColor: 'rgba(20, 184, 166, 0.9)',
								borderWidth: 1,
								borderRadius: 4,
								maxBarThickness: 28,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						animation: { duration: 400 },
						plugins: {
							legend: { display: false },
							tooltip: {
								backgroundColor: 'rgba(9,9,11,0.92)',
								titleColor: '#fafafa',
								bodyColor: '#d4d4d8',
								padding: 8,
								cornerRadius: 8,
								displayColors: false,
							},
						},
						scales: {
							x: {
								ticks: {
									color: muted,
									font: { size: 10, weight: 600 },
									maxRotation: 45,
									minRotation: 0,
								},
								grid: { color: 'transparent', drawBorder: false },
							},
							y: {
								beginAtZero: true,
								ticks: { color: muted, font: { size: 10 }, precision: 0 },
								grid: { color: grid, drawBorder: false },
							},
						},
					},
				});
				void text;
			} catch (e) {
				console.warn('[overview] Sport chart init failed', e);
			}
		})();

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

	function relativeTime(d) {
		if (!(d instanceof Date)) return 'â€”';
		const diff = Date.now() - d.getTime();
		if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
		if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
		if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
		return `${Math.round(diff / 86_400_000)}d ago`;
	}

	function actionTone(action) {
		const a = String(action || '').toUpperCase();
		if (a.includes('REVOKE') || a.includes('REJECT') || a.includes('DELETE') || a.includes('FAILED'))
			return 'danger';
		if (a.includes('GRANT') || a.includes('APPROVE') || a.includes('VERIFY') || a.includes('CREATE'))
			return 'success';
		if (a.includes('BG_CHECK') || a.includes('IMPERSONAT')) return 'warn';
		return 'info';
	}

	function actionIcon(action: string): IconName {
		const t = actionTone(action);
		if (t === 'danger') return 'status.warning-circle' as IconName;
		if (t === 'success') return 'status.verified' as IconName;
		if (t === 'warn') return 'status.warning' as IconName;
		return 'status.info' as IconName;
	}

	function prettyAction(action) {
		return String(action || '')
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
	}
</script>

<div
	class="cc-root tw-box-border tw-mx-auto tw-flex tw-w-full tw-max-w-[1680px] tw-flex-col tw-px-5 tw-pt-4"
	data-admin-shell="true"
>
	{#snippet socMetric(kpi)}
		<article
			class="cc-soc-card"
			class:cc-soc-card--crit={kpi.band === 'crit'}
			class:cc-soc-card--high={kpi.band === 'high'}
			class:cc-soc-card--med={kpi.band === 'med'}
			class:cc-soc-card--low={kpi.band === 'low'}
			class:cc-soc-card--ok={kpi.band === 'ok'}
			class:cc-soc-card--info={kpi.band === 'info' || !kpi.band}
		>
			<div class="cc-soc-card__top">
				<span class="cc-soc-card__label">{kpi.label}</span>
				{#if kpi.delta}
					<span
						class="cc-soc-card__delta"
						class:cc-soc-card__delta--up={kpi.deltaDir === 'up'}
						class:cc-soc-card__delta--down={kpi.deltaDir === 'down'}
						class:cc-soc-card__delta--flat={kpi.deltaDir === 'flat' || !kpi.deltaDir}
						>{kpi.delta}</span
					>
				{/if}
			</div>
			<span class="cc-soc-card__value">{kpi.value}</span>
			<span class="cc-soc-card__hint">{kpi.hint}</span>
		</article>
	{/snippet}

	<header class="cc-hero">
		<div class="cc-hero__text">
			<span class="cc-eyebrow">Global admin Â· operations console</span>
			<h1
				class="tw-m-0 tw-!text-4xl tw-!font-black tw-!tracking-tighter tw-!text-white md:tw-!text-5xl"
				style="line-height: 1.08;"
			>
				Command center
			</h1>
			<p class="cc-lede">
				Dense statistical surfaces in the spirit of SOAR / SIEM control rooms: KPI ribbons, severity-banded
				cards, and live audit ingest. Charts â€” MAU <strong class="cc-lede-strong">{mauSource}</strong>, revenue
				<strong class="cc-lede-strong">{revenueSource}</strong>, sports
				<strong class="cc-lede-strong">{sportSource}</strong>.
			</p>
		</div>
		<div class="cc-hero__badges">
			<span class="cc-live" title="Telemetry and audit stream connected">
				<span class="cc-live__dot" aria-hidden="true"></span>
				Live ingest
			</span>
			<span class="cc-hero__meta">Last refresh Â· client</span>
		</div>
	</header>

	<div
		class="cc-tabs tw-flex tw-flex-wrap tw-gap-1 tw-border-b tw-border-white/10 tw-px-0 tw-py-0"
		role="tablist"
		aria-label="Command center departments"
	>
		{#each TAB_IDS as tid, idx (tid)}
			<button
				type="button"
				id="cc-tab-{tid}"
				class="cc-tab"
				class:cc-tab--active={activeTab === tid}
				role="tab"
				aria-selected={activeTab === tid}
				aria-controls="cc-panel-{tid}"
				tabindex={activeTab === tid ? 0 : -1}
				onclick={() => (activeTab = tid)}
			>
				{TAB_LABELS[idx]}
			</button>
		{/each}
	</div>

	<div class="cc-body tw-pb-12">
		<div class="cc-soc-ribbon" aria-label="Operations snapshot">
			{#each SOC_RIBBON as row (row.k)}
				<div class="cc-soc-ribbon__cell">
					<span class="cc-soc-ribbon__metric">{row.k}</span>
					<span class="cc-soc-ribbon__value">{row.v}</span>
					<span class="cc-soc-ribbon__sub">{row.s}</span>
				</div>
			{/each}
		</div>
		<p class="cc-soc-legend">
			<span class="cc-soc-legend__title">Severity key</span>
			<span class="cc-soc-legend__items">
				<span><i class="cc-soc-dot cc-soc-dot--crit"></i> critical</span>
				<span><i class="cc-soc-dot cc-soc-dot--high"></i> high</span>
				<span><i class="cc-soc-dot cc-soc-dot--med"></i> medium</span>
				<span><i class="cc-soc-dot cc-soc-dot--low"></i> low</span>
				<span><i class="cc-soc-dot cc-soc-dot--ok"></i> steady</span>
				<span><i class="cc-soc-dot cc-soc-dot--info"></i> info</span>
			</span>
		</p>

		{#if activeTab === 'executive'}
			<section
				class="cc-panel"
				id="cc-panel-executive"
				role="tabpanel"
				aria-labelledby="cc-tab-executive"
			>
			<div class="cc-soc-grid bento-grid bento-grid--4col tw-mb-bento-lg">
				{#each strike13Executive as kpi (kpi.label)}
					{@render socMetric(kpi)}
				{/each}
			</div>

				<article class="cc-chart-card cc-chart-card--soc">
					<header class="cc-chart-card__head">
					<div class="cc-chart-card__icon cc-chart-card__icon--indigo" aria-hidden="true">
						<Icon name={"data.trending" as IconName} />
					</div>
						<div>
							<h2 class="cc-chart-card__title">Master activation (MAU)</h2>
							<p class="cc-chart-card__sub">Trailing six months Â· enterprise growth signal</p>
							<span
								class="cc-src"
								class:cc-src--live={mauSource === 'live'}
								class:cc-src--mock={mauSource === 'mock'}
							>
								{mauSource === 'live' ? 'Live' : 'Synthetic'}
							</span>
						</div>
					</header>
					<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
						<canvas
							class="cc-canvas-fill"
							bind:this={mauCanvasEl}
							aria-label="Master activation line chart"
						></canvas>
					</div>
				</article>
			</section>
		{:else if activeTab === 'growth'}
			<section class="cc-panel" id="cc-panel-growth" role="tabpanel" aria-labelledby="cc-tab-growth">
			<div class="cc-soc-grid bento-grid bento-grid--4col tw-mb-bento-lg">
				{#each GROWTH_TILES as kpi (kpi.label)}
					{@render socMetric(kpi)}
				{/each}
			</div>

				<div class="cc-chart-row tw-min-w-0">
					<article class="cc-chart-card cc-chart-card--half cc-chart-card--soc">
						<header class="cc-chart-card__head">
						<div class="cc-chart-card__icon cc-chart-card__icon--emerald" aria-hidden="true">
							<Icon name={"data.chart-pie" as IconName} />
						</div>
							<div>
								<h2 class="cc-chart-card__title">Revenue by tier</h2>
								<p class="cc-chart-card__sub">MRR composition</p>
								<span
									class="cc-src"
									class:cc-src--live={revenueSource === 'live'}
									class:cc-src--mock={revenueSource === 'mock'}
								>
									{revenueSource === 'live' ? 'Live' : 'Synthetic'}
								</span>
							</div>
						</header>
						<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
							<canvas
								class="cc-canvas-fill"
								bind:this={revenueCanvasEl}
								aria-label="Revenue doughnut chart"
							></canvas>
						</div>
					</article>

					<article class="cc-chart-card cc-chart-card--half cc-chart-card--soc">
						<header class="cc-chart-card__head">
							<div class="cc-chart-card__icon cc-chart-card__icon--cyan" aria-hidden="true">
							<Icon name={"sport.soccer" as IconName} />
							</div>
							<div>
								<h2 class="cc-chart-card__title">Players by sport</h2>
								<p class="cc-chart-card__sub">Headcount distribution</p>
								<span
									class="cc-src"
									class:cc-src--live={sportSource === 'live'}
									class:cc-src--mock={sportSource === 'mock'}
								>
									{sportSource === 'live' ? 'Live' : 'Synthetic'}
								</span>
							</div>
						</header>
						<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
							<canvas
								class="cc-canvas-fill"
								bind:this={sportCanvasEl}
								aria-label="Players by sport bar chart"
							></canvas>
						</div>
					</article>
				</div>
			</section>
		{:else if activeTab === 'security'}
			<section class="cc-panel" id="cc-panel-security" role="tabpanel" aria-labelledby="cc-tab-security">
				<div class="cc-soc-split">
				<div class="cc-soc-grid bento-grid bento-grid--3col">
					{#each strike13Security as kpi (kpi.label)}
						{@render socMetric(kpi)}
					{/each}
				</div>
					<aside class="cc-soc-aside" aria-label="Automation and orchestration">
						<div class="cc-soc-aside__head">
							<span class="cc-soc-aside__eyebrow">SOAR-style</span>
							<h3 class="cc-soc-aside__title">Playbooks &amp; queue</h3>
							<p class="cc-soc-aside__sub">Representative automation counters for executive review.</p>
						</div>
						<ul class="cc-soc-aside__list">
							<li>
								<span class="cc-soc-aside__k">Armed playbooks</span>
								<span class="cc-soc-aside__v">12</span>
							</li>
							<li>
								<span class="cc-soc-aside__k">Open cases</span>
								<span class="cc-soc-aside__v">7</span>
							</li>
							<li>
								<span class="cc-soc-aside__k">Auto-remediated (24h)</span>
								<span class="cc-soc-aside__v">94%</span>
							</li>
							<li>
								<span class="cc-soc-aside__k">Mean queue depth</span>
								<span class="cc-soc-aside__v">23</span>
							</li>
							<li>
								<span class="cc-soc-aside__k">False-positive rate</span>
								<span class="cc-soc-aside__v">4.1%</span>
							</li>
						</ul>
					</aside>
				</div>

				<article class="cc-feed-shell cc-feed-shell--soc">
					<header class="cc-feed-shell__head">
						<h2 class="cc-feed-shell__title">Live event stream</h2>
						<p class="cc-feed-shell__sub">
							<code class="cc-code">security_audit</code>
							Â· {liveFeed.length} events ingested
						</p>
					</header>
					{#if feedErr}
						<p class="cc-err cc-err--inline" role="alert">{feedErr}</p>
					{/if}
				{#if feedLoading && liveFeed.length === 0}
					<div class="cc-feed-empty">
						<Icon name={"status.loading" as IconName} class="cc-spin" aria-hidden="true" />
						Loading audit streamâ€¦
					</div>
				{:else if liveFeed.length === 0}
					<div class="cc-feed-empty">
						<Icon name={"env.moon" as IconName} aria-hidden="true" />
						No audit events yet.
					</div>
					{:else}
						<ol class="cc-feed-list">
							{#each liveFeed as ev (ev.id)}
								<li class="cc-feed-item cc-feed-item--{actionTone(ev.action)}">
								<span class="cc-feed-item__icon" aria-hidden="true">
									<Icon name={actionIcon(ev.action)} />
								</span>
									<div class="cc-feed-item__body">
										<div class="cc-feed-item__row">
											<span class="cc-feed-item__action">{prettyAction(ev.action)}</span>
											<span class="cc-feed-item__time">{relativeTime(ev.createdAt)}</span>
										</div>
										{#if ev.targetEmail}
											<span class="cc-feed-item__target">{ev.targetEmail}</span>
										{/if}
										{#if ev.details}
											<span class="cc-feed-item__details">{ev.details}</span>
										{/if}
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</article>
			</section>
		{:else}
			<section class="cc-panel" id="cc-panel-platform" role="tabpanel" aria-labelledby="cc-tab-platform">
			<div class="cc-soc-grid bento-grid bento-grid--4col tw-mb-bento-lg">
				{#each PLATFORM_TILES as kpi (kpi.label)}
					{@render socMetric(kpi)}
				{/each}
			</div>

				<div class="cc-platform-note">
					<p>
					<Icon name={"status.info" as IconName} aria-hidden="true" />
					KPI tiles above are fixed for executive review; charts on other tabs still hydrate from
						<code class="cc-code">analytics/platform_totals</code> when available.
					</p>
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	/* Layout shell: height + overflow come from Tailwind on the root element */
	.cc-root {
		box-sizing: border-box;
	}

	.cc-err {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
		margin: 0 0 14px;
	}

	.cc-err--inline {
		margin: 0 0 12px;
	}

	.cc-hero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.cc-hero__text {
		min-width: 0;
	}

	.cc-eyebrow {
		display: block;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.cc-hero__text > h1 {
		margin: 4px 0 6px;
	}

	.cc-lede {
		margin: 0;
		max-width: 72ch;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.cc-lede-strong {
		font-weight: 800;
		color: #a5f3fc;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		font-size: 0.72em;
	}

	.cc-hero__badges {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		flex-shrink: 0;
	}

	.cc-hero__meta {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.35);
		font-variant-numeric: tabular-nums;
	}

	/* Operations ribbon (SOAR / SIEM density) */
	.cc-soc-ribbon {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--bento-gap-sm);
		margin-bottom: var(--bento-gap-sm);
	}

	@media (min-width: 33rem) {
		.cc-soc-ribbon {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 64rem) {
		.cc-soc-ribbon {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.cc-soc-ribbon__cell {
		padding: 12px 14px;
		border-radius: 12px;
		background: linear-gradient(145deg, rgba(9, 9, 11, 0.92), rgba(24, 24, 27, 0.88));
		border: 1px solid rgba(20, 184, 166, 0.22);
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.35) inset,
			0 12px 28px rgba(0, 0, 0, 0.35);
	}

	.cc-soc-ribbon__metric {
		display: block;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(165, 243, 252, 0.85);
		margin-bottom: 4px;
	}

	.cc-soc-ribbon__value {
		display: block;
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
		line-height: 1.1;
	}

	.cc-soc-ribbon__sub {
		display: block;
		margin-top: 4px;
		font-size: 0.68rem;
		font-weight: 600;
		line-height: 1.35;
		color: rgba(161, 161, 170, 0.95);
	}

	.cc-soc-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		margin: 0 0 18px;
		padding: 8px 12px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}

	.cc-soc-legend__title {
		color: rgba(255, 255, 255, 0.55);
		margin-right: 4px;
	}

	.cc-soc-legend__items {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
	}

	.cc-soc-legend__items span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.cc-soc-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.cc-soc-dot--crit {
		background: #f87171;
		box-shadow: 0 0 10px rgba(248, 113, 113, 0.45);
	}
	.cc-soc-dot--high {
		background: #fb923c;
		box-shadow: 0 0 8px rgba(251, 146, 60, 0.35);
	}
	.cc-soc-dot--med {
		background: #facc15;
	}
	.cc-soc-dot--low {
		background: #4ade80;
	}
	.cc-soc-dot--ok {
		background: #34d399;
	}
	.cc-soc-dot--info {
		background: #14b8a6;
	}

	/* Severity-banded metric tiles */
	.cc-soc-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 18px;
		border-radius: 14px;
		background: linear-gradient(180deg, rgba(12, 12, 14, 0.98), rgba(9, 9, 11, 0.99));
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 14px 36px rgba(0, 0, 0, 0.4);
		border-left: 3px solid rgba(113, 113, 122, 0.6);
		min-width: 0;
	}

	.cc-soc-card--crit {
		border-left-color: #ef4444;
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.4),
			0 0 24px rgba(239, 68, 68, 0.12);
	}
	.cc-soc-card--high {
		border-left-color: #f97316;
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.4),
			0 0 20px rgba(249, 115, 22, 0.1);
	}
	.cc-soc-card--med {
		border-left-color: #eab308;
	}
	.cc-soc-card--low {
		border-left-color: #84cc16;
	}
	.cc-soc-card--ok {
		border-left-color: #22c55e;
	}
	.cc-soc-card--info {
		border-left-color: #14b8a6;
	}

	.cc-soc-card__top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}

	.cc-soc-card__label {
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: rgba(161, 161, 170, 0.95);
	}

	.cc-soc-card__delta {
		font-size: 0.65rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.cc-soc-card__delta--up {
		color: #67e8f9;
	}
	.cc-soc-card__delta--down {
		color: #fde68a;
	}
	.cc-soc-card__delta--flat {
		color: #71717a;
	}

	.cc-soc-card__value {
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
		line-height: 1.15;
	}

	@media (min-width: 1024px) {
		.cc-soc-card__value {
			font-size: 1.5rem;
		}
	}

	.cc-soc-card--ok .cc-soc-card__value {
		color: #86efac;
	}

	.cc-soc-card__hint {
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.35;
		color: rgba(113, 113, 122, 0.98);
	}

	.cc-soc-split {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--bento-gap-md);
		align-items: start;
		margin-bottom: var(--bento-gap-lg);
	}

	@media (min-width: 69rem) {
		.cc-soc-split {
			grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
		}
	}

	.cc-soc-aside {
		padding: 16px 18px;
		border-radius: 14px;
		background: rgba(9, 9, 11, 0.75);
		border: 1px solid rgba(20, 184, 166, 0.18);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
	}

	.cc-soc-aside__head {
		margin-bottom: 14px;
	}

	.cc-soc-aside__eyebrow {
		display: block;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(20, 184, 166, 0.85);
		margin-bottom: 4px;
	}

	.cc-soc-aside__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		color: #fafafa;
	}

	.cc-soc-aside__sub {
		margin: 6px 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.4;
		color: rgba(161, 161, 170, 0.95);
	}

	.cc-soc-aside__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.cc-soc-aside__list li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.78rem;
	}

	.cc-soc-aside__list li:first-child {
		border-top: none;
		padding-top: 0;
	}

	.cc-soc-aside__k {
		font-weight: 600;
		color: rgba(212, 212, 216, 0.95);
	}

	.cc-soc-aside__v {
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #e4e4e7;
	}

	.cc-chart-card--soc {
		border-top: 2px solid rgba(20, 184, 166, 0.35);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.06) inset,
			0 18px 40px rgba(0, 0, 0, 0.18);
	}

	:global(html.dark) .cc-chart-card--soc {
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 18px 48px rgba(0, 0, 0, 0.45);
	}

	.cc-chart-card__icon--cyan {
		background: rgba(20, 184, 166, 0.2);
		color: #14b8a6;
	}

	:global(html.dark) .cc-chart-card__icon--cyan {
		background: rgba(20, 184, 166, 0.22);
		color: #a5f3fc;
	}

	.cc-feed-shell--soc {
		border-top: 2px solid rgba(99, 102, 241, 0.35);
		background: rgba(9, 9, 11, 0.35);
	}

	:global(html.dark) .cc-feed-shell--soc {
		background: rgba(9, 9, 11, 0.72);
		border-color: rgba(129, 140, 248, 0.35);
	}

	.cc-feed-shell--soc .cc-feed-shell__title {
		font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
		letter-spacing: -0.03em;
	}

	.cc-live {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
		color: #047857;
		background: rgba(34, 197, 94, 0.1);
		flex-shrink: 0;
	}

	:global(html.dark) .cc-live {
		color: #a7f3d0;
		background: rgba(34, 197, 94, 0.16);
	}

	.cc-live__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		animation: cc-pulse 1.8s ease-in-out infinite;
	}

	@keyframes cc-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
		}
	}

	.cc-tabs {
		flex-shrink: 0;
		margin-bottom: 10px;
		padding-top: 8px;
		position: sticky;
		top: 0;
		z-index: 8;
		/* Opaque bar so scrolling KPIs / charts never show through the sticky tabs */
		background-color: var(--ec-canvas-bg, #09090b);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
	}

	:global(html.dark) .cc-tabs {
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.cc-tab {
		appearance: none;
		margin: 0;
		cursor: pointer;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		padding: 10px 14px 12px;
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.cc-tab:hover {
		color: rgba(255, 255, 255, 0.72);
	}

	.cc-tab:focus-visible {
		outline: 2px solid var(--brand-primary, #6366f1);
		outline-offset: 2px;
		border-radius: 4px;
	}

	.cc-tab--active {
		color: #fafafa;
		border-bottom-color: rgba(255, 255, 255, 0.85);
	}

	.cc-body {
		overscroll-behavior: contain;
	}

	.cc-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding-bottom: 32px;
	}

	.cc-kpi-grid {
		display: grid;
		gap: 12px;
	}

	.cc-kpi-grid--3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 900px) {
		.cc-kpi-grid--3 {
			grid-template-columns: 1fr;
		}
	}

	.cc-kpi {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(12px);
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.06));
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
	}

	:global(html.dark) .cc-kpi {
		background: rgba(24, 24, 27, 0.72);
		border-color: rgba(255, 255, 255, 0.08);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
	}

	.cc-kpi__label {
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.cc-kpi__value {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.cc-kpi__value--ok {
		color: #15803d;
	}

	:global(html.dark) .cc-kpi__value--ok {
		color: #86efac;
	}

	.cc-kpi__hint {
		font-size: 0.7rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.cc-chart-card {
		border-radius: 16px;
		padding: 16px 18px 18px;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(14px);
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.06));
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset;
	}

	:global(html.dark) .cc-chart-card {
		background: rgba(24, 24, 27, 0.72);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.cc-chart-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		min-width: 0;
	}

	@media (max-width: 960px) {
		.cc-chart-row {
			grid-template-columns: 1fr;
		}
	}

	.cc-chart-card--half {
		min-width: 0;
	}

	.cc-chart-card__head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 12px;
	}

	.cc-chart-card__icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.cc-chart-card__icon--indigo {
		background: rgba(99, 102, 241, 0.2);
		color: #4f46e5;
	}

	.cc-chart-card__icon--emerald {
		background: rgba(16, 185, 129, 0.18);
		color: #059669;
	}

	.cc-chart-card__icon--rose {
		background: rgba(244, 63, 94, 0.18);
		color: #e11d48;
	}

	:global(html.dark) .cc-chart-card__icon--indigo {
		background: rgba(99, 102, 241, 0.28);
		color: #c7d2fe;
	}

	:global(html.dark) .cc-chart-card__icon--emerald {
		background: rgba(16, 185, 129, 0.24);
		color: #a7f3d0;
	}

	:global(html.dark) .cc-chart-card__icon--rose {
		background: rgba(244, 63, 94, 0.26);
		color: #fda4af;
	}

	.cc-chart-card__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.cc-chart-card__sub {
		margin: 2px 0 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.cc-src {
		display: inline-block;
		margin-top: 6px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.cc-src--live {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
	}

	.cc-src--mock {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.12);
	}

	.cc-canvas-fill {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	.cc-feed-shell {
		border-radius: 16px;
		padding: 16px 18px 20px;
		background: rgba(255, 255, 255, 0.45);
		backdrop-filter: blur(14px);
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.06));
	}

	:global(html.dark) .cc-feed-shell {
		background: rgba(9, 9, 11, 0.55);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.cc-feed-shell__head {
		margin-bottom: 14px;
	}

	.cc-feed-shell__title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.cc-feed-shell__sub {
		margin: 4px 0 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.cc-code {
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
		font-size: 0.75rem;
		font-weight: 700;
	}

	:global(html.dark) .cc-code {
		background: rgba(255, 255, 255, 0.08);
	}

	.cc-feed-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 16px;
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.cc-spin {
		animation: cc-spin 1s linear infinite;
	}

	@keyframes cc-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.cc-feed-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.cc-feed-item {
		display: flex;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .cc-feed-item {
		background: rgba(255, 255, 255, 0.04);
	}

	.cc-feed-item--success {
		box-shadow: inset 3px 0 0 #22c55e;
	}
	.cc-feed-item--danger {
		box-shadow: inset 3px 0 0 #ef4444;
	}
	.cc-feed-item--warn {
		box-shadow: inset 3px 0 0 #f59e0b;
	}
	.cc-feed-item--info {
		box-shadow: inset 3px 0 0 #6366f1;
	}

	.cc-feed-item__icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.cc-feed-item__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cc-feed-item__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}

	.cc-feed-item__action {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.cc-feed-item__time {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.cc-feed-item__target {
		font-size: 0.8rem;
		font-weight: 600;
		word-break: break-all;
	}

	.cc-feed-item__details {
		font-size: 0.78rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.cc-platform-note {
		padding: 16px 18px;
		border-radius: 14px;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
		color: var(--text-primary);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.cc-platform-note p {
		margin: 0;
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.cc-platform-note i {
		margin-top: 2px;
		flex-shrink: 0;
	}

	/* â”€â”€ Mobile progressive disclosure (< 768px) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	   Keep the KPI tiles as the primary surface; collapse the verbose hero
	   text and compress chart heights so the page is scannable on one screen.
	   Bottom padding reserves space for the MobileTabBar.
	 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
	@media (max-width: 767.98px) {
		.cc-root {
			padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}

		/* Hide verbose hero description; keep only the heading */
		.cc-lede {
			display: none;
		}

		.cc-hero__badges {
			display: none;
		}

		.cc-hero__text h1 {
			font-size: 1.5rem !important;
		}

		/* SOC ribbon: horizontal scroll instead of grid */
		.cc-soc-ribbon {
			display: flex;
			flex-direction: row;
			overflow-x: auto;
			scrollbar-width: none;
			gap: 8px;
			padding-bottom: 4px;
		}

		.cc-soc-ribbon__cell {
			flex: 0 0 auto;
			min-width: 100px;
		}

		/* Compress chart heights on mobile */
		.tw-h-\[350px\] {
			height: 200px !important;
		}

		.tw-h-\[260px\] {
			height: 180px !important;
		}

		/* Full-width chart row on mobile */
		.cc-chart-row {
			flex-direction: column;
		}

		.cc-chart-card--half {
			width: 100%;
		}
	}

	/* Reserve bottom space on tablet too (for tab bar) */
	@media (max-width: 1023.98px) {
		.cc-root {
			padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
		}
	}
</style>
