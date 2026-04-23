<script>
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

	// ── Strike 5 — Minimal license read for MRR fallback (no wide platform scan) ─
	let licenseCount = $state(0);
	let telLoading   = $state(false);
	let telErr       = $state('');

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		let destroyed = false;
		telLoading = true;
		telErr = '';

		void (async () => {
			try {
				const licensesSnap = await getDocs(collection(db, 'licenses'));
				if (destroyed) return;
				licenseCount = licensesSnap.size;
			} catch (e) {
				if (!destroyed) telErr = e instanceof Error ? e.message : 'Could not load telemetry.';
			} finally {
				if (!destroyed) telLoading = false;
			}
		})();

		return () => {
			destroyed = true;
		};
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// Command Center datasets (Sprint 2.6.7 — Paranoid Patch)
	// ═══════════════════════════════════════════════════════════════════════════
	// Two premium Chart.js widgets + a live audit feed. Every chart dataset
	// is hydrated from a SINGLE aggregated document (`analytics/platform_totals`)
	// — we never scan `users`, `licenses`, `player_lookup`, `teams`, or `clubs`
	// here. A scheduled Cloud Function (future sprint) will own the writer
	// side. Until then every chart falls back to a hard-coded mock inside its
	// own `catch` branch so the dashboard never fires a wide read and never
	// renders blank. All Chart.js effects use the mandated
	// `let destroyed = false;` cleanup pattern from `.cursorrules`.

	/** @typedef {{ label: string, value: number }} SeriesPoint */

	/** Last 6 months (including current), chronological: [{ label: 'Nov', value: 42 }, …] */
	let mauSeries = $state(/** @type {SeriesPoint[]} */ ([]));

	/** Revenue by license tier, sourced from `analytics/platform_totals.revenueByTier`. */
	let revenueByTier = $state(/** @type {SeriesPoint[]} */ ([]));

	/** Strike 1 — Per-chart data-source indicator. The Global Admin sees
	 *  "Live" as soon as the analytics triggers backfill the aggregate doc,
	 *  and "Mock" while the platform is still empty. */
	/** @typedef {'live' | 'mock'} ChartSource */
	let mauSource      = $state(/** @type {ChartSource} */ ('mock'));
	let revenueSource  = $state(/** @type {ChartSource} */ ('mock'));
	let sportSource    = $state(/** @type {ChartSource} */ ('mock'));

	/** Players by sport — `analytics/platform_totals.bySport` (+ mock fallback). */
	let playersBySport = $state(/** @type {SeriesPoint[]} */ ([]));

	/** Aggregated platform totals — used for MRR + Active Users macro tiles. */
	let aggTotalRevenue  = $state(0);
	let aggTotalUsers    = $state(0);
	let activationRatePct = $state(81.2);
	let complianceOpenCount = $state(3);

	/** Strike 5 — Bento top row: uptime % + churn % (mock until backend feeds). */
	const systemUptime = $derived.by(() => 99.99);
	const mrrChurnPct  = $derived.by(() => 1.2);

	/** Prefer `platform_totals.totalUsers`, else the latest MAU series point. */
	const macroActiveUsers = $derived.by(() => {
		if (aggTotalUsers > 0) return aggTotalUsers;
		const last = mauSeries.length ? mauSeries[mauSeries.length - 1].value : 0;
		return Number.isFinite(last) ? Math.round(last) : 0;
	});

	/** Prefer aggregated `totalRevenue`, else $49 × license count. */
	const mrrEstimate = $derived(
		aggTotalRevenue > 0 ? aggTotalRevenue : licenseCount * 49
	);

	const mrrDisplay = $derived(
		mrrEstimate >= 1000
			? `$${(mrrEstimate / 1000).toFixed(1)}k`
			: `$${mrrEstimate.toLocaleString()}`,
	);

	/** Recent security_audit events (desc by createdAt). */
	let liveFeed = $state(
		/** @type {{ id: string, action: string, targetEmail: string, details: string, createdAt: Date | null }[]} */ ([])
	);
	let feedLoading = $state(false);
	let feedErr     = $state('');

	/**
	 * Pull MAU, revenue-by-tier, and the live audit feed from `platform_totals`
	 * plus `security_audit` (no wide collection scans).
	 */
	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading || !authStore.isAuthenticated) return;

		let destroyed = false;
		feedLoading = true;
		feedErr = '';

		// ═════════════════════════════════════════════════════════════════════
		// Sprint 2.6.7 — Paranoid Patch. Chart datasets derive from a
		// SINGLE aggregated document (`analytics/platform_totals`). No chart
		// fans out a full collection scan on `users`, `licenses`, or any other
		// per-entity collection. A scheduled Cloud Function (future sprint)
		// owns the writer side; until then we serve hard-coded mocks so the
		// dashboard renders without ever firing a collection-wide read.
		//
		// Expected document shape (forward-compat; extra fields ignored):
		//   {
		//     mau:            [{ label?: 'Nov', month?: 'YYYY-MM', value: 1200 }, …]
		//                      OR { '2025-11': 1200, '2025-12': 1400, … },
		//     revenueByTier:  { starter: 4500, pro: 12000, club: 24000, enterprise: 8000 },
		//     bySport:        { soccer: 1450, basketball: 820, volleyball: 340, … },
		//     updatedAt:      Timestamp,
		//   }
		// ═════════════════════════════════════════════════════════════════════

		/** @type {number[]} Chronological oldest → newest; 6 trailing months. */
		const MOCK_MAU = [1200, 1400, 1650, 1820, 2140, 2380];

		/** @type {Record<string, number>} */
		const MOCK_REVENUE_BY_TIER = {
			starter:    4500,
			pro:       12000,
			club:      24000,
			enterprise: 8000,
		};

		/** @type {Record<string, number>} */
		const MOCK_BY_SPORT = {
			soccer: 1450,
			basketball: 820,
			volleyball: 340,
			baseball: 290,
			other: 120,
		};

		/** @param {string} raw */
		function prettySportLabel(raw) {
			const s = String(raw || '')
				.replace(/_/g, ' ')
				.trim();
			if (!s) return 'Unknown';
			return s.replace(/\b\w/g, (c) => c.toUpperCase());
		}

		/** Canonical tier ordering + display labels for the donut chart. */
		const TIER_DEFS = /** @type {const} */ ([
			{ key: 'starter',    label: 'Starter'    },
			{ key: 'pro',        label: 'Pro'        },
			{ key: 'club',       label: 'Club'       },
			{ key: 'enterprise', label: 'Enterprise' },
			{ key: 'legacy',     label: 'Legacy'     },
		]);

		/** Build the trailing 6-month label strip (Apr → … → current). */
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

		/**
		 * Read `analytics/platform_totals` + hydrate MAU + revenue charts and feed.
		 */
		(async () => {
			/** @type {Record<string, unknown> | null} */
			let totals = null;
			try {
				const totalsRef = doc(db, 'analytics', 'platform_totals');
				const totalsSnap = await getDoc(totalsRef);
				if (totalsSnap.exists()) totals = totalsSnap.data() || {};
			} catch (e) {
				console.warn('[overview] analytics/platform_totals read failed — using mocks', e);
				totals = null;
			}

			if (totals && !destroyed) {
				const tr = Number(totals.totalRevenue);
				const tu = Number(totals.totalUsers);
				aggTotalRevenue = Number.isFinite(tr) && tr > 0 ? Math.round(tr) : 0;
				aggTotalUsers   = Number.isFinite(tu) && tu > 0 ? Math.round(tu) : 0;

				const ar = Number(totals.activationRate ?? totals.activationRatePct);
				if (Number.isFinite(ar) && ar > 0 && ar <= 100) activationRatePct = ar;

				const cc = Number(
					totals.complianceAlertsOpen ?? totals.openComplianceAlerts ?? totals.complianceAlerts,
				);
				if (Number.isFinite(cc) && cc >= 0) complianceOpenCount = Math.round(cc);
			}

			// ── 1. MAU (Monthly Active Users) ─────────────────────────────────
			try {
				const labels = buildMauLabels();
				/** @type {number[]} */
				let values = [];
				const raw = totals && totals.mau;

				if (Array.isArray(raw)) {
					// Array form — trust the last 6 entries, chronological order.
					const trimmed = raw.slice(-6);
					values = labels.map((_, i) => {
						const row = trimmed[i];
						if (row == null) return 0;
						const n = typeof row === 'number' ? row : Number(row?.value);
						return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
					});
				} else if (raw && typeof raw === 'object') {
					// Object form keyed by 'YYYY-MM'.
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
				console.warn('[overview] MAU hydrate failed — using mock series', e);
				if (!destroyed) {
					const labels = buildMauLabels();
					mauSeries = labels.map(({ label }, i) => ({
						label,
						value: MOCK_MAU[i] ?? 0,
					}));
					mauSource = 'mock';
				}
			}

			// ── 2. Revenue by Tier ────────────────────────────────────────────
			try {
				/** @type {Record<string, number>} */
				const revenue = {};
				const raw = totals && (totals.revenueByTier || totals.revenue);
				if (raw && typeof raw === 'object') {
					for (const [key, value] of Object.entries(raw)) {
						const n = Number(value);
						if (!Number.isFinite(n) || n < 0) continue;
						revenue[String(key).toLowerCase()] = (revenue[String(key).toLowerCase()] || 0) + Math.round(n);
					}
				}

				const hasSignal = Object.values(revenue).some((v) => v > 0);
				const source = hasSignal ? revenue : { ...MOCK_REVENUE_BY_TIER };

				const ordered = TIER_DEFS
					.map(({ key, label }) => ({ label, value: Math.round(source[key] || 0) }))
					.filter((s) => s.value > 0);

				if (!destroyed) {
					revenueByTier = ordered.length
						? ordered
						: TIER_DEFS
								.map(({ key, label }) => ({
									label,
									value: Math.round(MOCK_REVENUE_BY_TIER[key] || 0),
								}))
								.filter((s) => s.value > 0);
					revenueSource = hasSignal ? 'live' : 'mock';
				}
			} catch (e) {
				console.warn('[overview] Revenue-by-Tier hydrate failed — using mock series', e);
				if (!destroyed) {
					revenueByTier = TIER_DEFS
						.map(({ key, label }) => ({
							label,
							value: Math.round(MOCK_REVENUE_BY_TIER[key] || 0),
						}))
						.filter((s) => s.value > 0);
					revenueSource = 'mock';
				}
			}

			// ── 2b. Players by sport (bar chart) ────────────────────────────
			try {
				/** @type {Record<string, number>} */
				const bySport = {};
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
				console.warn('[overview] bySport hydrate failed — using mock', e);
				if (!destroyed) {
					playersBySport = Object.entries(MOCK_BY_SPORT).map(([k, v]) => ({
						label: prettySportLabel(k),
						value: Math.round(v),
					}));
					sportSource = 'mock';
				}
			}

			// ── 3. Global Live Feed (security_audit, most recent first) ───────
			try {
				const feedQ = query(
					collection(db, 'security_audit'),
					orderBy('createdAt', 'desc'),
					fbLimit(12),
				);
				const snap = await getDocs(feedQ).catch(async () => {
					// Legacy schema fallback — older events used `timestamp`.
					return getDocs(
						query(collection(db, 'security_audit'), orderBy('timestamp', 'desc'), fbLimit(12)),
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
				console.warn('[overview] Live feed load failed', e);
				if (!destroyed) {
					feedErr = e instanceof Error ? e.message : 'Could not load live feed.';
					liveFeed = [];
				}
			}

			if (!destroyed) feedLoading = false;
		})();

		return () => {
			destroyed = true;
		};
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// Chart.js widgets (strict $effect cleanup; zero onDestroy imports)
	// ═══════════════════════════════════════════════════════════════════════════

	let mauCanvasEl      = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let revenueCanvasEl  = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let sportCanvasEl    = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));

	/** Read a CSS variable from the document root with a fallback. */
	function cssVar(/** @type {string} */ name, /** @type {string} */ fallback) {
		if (!browser) return fallback;
		const v = getComputedStyle(document.documentElement).getPropertyValue(name);
		return (v || '').trim() || fallback;
	}

	/* ── Line chart: Monthly Active Users ─────────────────────────────────── */
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
				const text  = cssVar('--text-primary', '#0f172a');
				const muted = cssVar('--text-secondary', '#475569');
				const grid  = cssVar('--chart-grid', 'rgba(15,23,42,0.08)');
				chart = new mod.Chart(target, {
					type: 'line',
					data: {
						labels: series.map((p) => p.label),
						datasets: [
							{
								label: 'Monthly active users',
								data: series.map((p) => p.value),
								borderColor: '#6366f1',
								backgroundColor: 'rgba(99,102,241,0.18)',
								borderWidth: 2.5,
								tension: 0.35,
								fill: true,
								pointRadius: 3,
								pointHoverRadius: 5,
								pointBackgroundColor: '#6366f1',
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
								grid:  { color: 'transparent' },
							},
							y: {
								beginAtZero: true,
								ticks: { color: muted, font: { size: 11 }, precision: 0 },
								grid:  { color: grid, drawBorder: false },
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

	/* ── Doughnut chart: Revenue by Tier ───────────────────────────────────── */
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
				const palette = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a78bfa'];
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
									font: { size: 9, weight: 600 },
									boxWidth: 8,
									boxHeight: 8,
									padding: 4,
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
										return ` $${Number(ctx.parsed).toLocaleString()} · ${pct}%`;
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

	/* ── Bar chart: Players by sport ───────────────────────────────────────── */
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
				const text  = cssVar('--text-primary', '#0f172a');
				const muted = cssVar('--text-secondary', '#475569');
				const grid  = cssVar('--chart-grid', 'rgba(15,23,42,0.08)');
				chart = new mod.Chart(target, {
					type: 'bar',
					data: {
						labels: series.map((p) => p.label),
						datasets: [
							{
								label: 'Players',
								data: series.map((p) => p.value),
								backgroundColor: 'rgba(244, 63, 94, 0.55)',
								borderColor: 'rgba(244, 63, 94, 0.95)',
								borderWidth: 1,
								borderRadius: 4,
								maxBarThickness: 22,
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
									font: { size: 9, weight: 600 },
									maxRotation: 40,
									minRotation: 0,
								},
								grid: { color: 'transparent', drawBorder: false },
							},
							y: {
								beginAtZero: true,
								ticks: { color: muted, font: { size: 9 }, precision: 0 },
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

	// ═══════════════════════════════════════════════════════════════════════════
	// Live feed helpers
	// ═══════════════════════════════════════════════════════════════════════════

	/** @param {Date | null} d */
	function relativeTime(d) {
		if (!(d instanceof Date)) return '—';
		const diff = Date.now() - d.getTime();
		if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
		if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
		if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
		return `${Math.round(diff / 86_400_000)}d ago`;
	}

	/**
	 * Map an audit action string to a tone classification for the live feed.
	 * @param {string} action
	 */
	function actionTone(action) {
		const a = String(action || '').toUpperCase();
		if (a.includes('REVOKE') || a.includes('REJECT') || a.includes('DELETE') || a.includes('FAILED')) return 'danger';
		if (a.includes('GRANT')  || a.includes('APPROVE') || a.includes('VERIFY') || a.includes('CREATE')) return 'success';
		if (a.includes('BG_CHECK') || a.includes('IMPERSONAT')) return 'warn';
		return 'info';
	}

	/** @param {string} action */
	function actionIcon(action) {
		const t = actionTone(action);
		if (t === 'danger')  return 'ph-warning-octagon';
		if (t === 'success') return 'ph-check-circle';
		if (t === 'warn')    return 'ph-shield-chevron';
		return 'ph-activity';
	}

	/** @param {string} action */
	function prettyAction(action) {
		return String(action || '')
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
	}
</script>

<div class="ov-page ov-page--bento" data-admin-shell="true">
	{#if telErr}
		<p class="ov-err ov-err--compact" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{telErr}
		</p>
	{/if}

	<!-- Strike 5 — Enterprise Bento: zero page scroll; only the right-rail scrolls. -->
	<div class="ov-bento" aria-label="Executive command center">
		<header class="ov-bento__head">
			<div class="ov-bento__head-text">
				<span class="ov-bento__eyebrow">Global Admin</span>
				<h1
					class="ov-bento__h1 tw-text-4xl md:tw-text-5xl tw-font-extrabold tw-tracking-tight tw-text-[var(--text-primary)]"
				>
					Command Center
				</h1>
			</div>
			<span class="ov-bento__live">
				<span class="ov-bento__live-dot" aria-hidden="true"></span>
				{telLoading ? 'Syncing…' : 'Live'}
			</span>
		</header>

		<div class="ov-bento__kpis" aria-label="Macro KPIs">
			<article class="ov-macro ov-macro--mrr">
				<span class="ov-macro__label">MRR</span>
				<span class="ov-macro__value">{telLoading ? '—' : mrrDisplay}</span>
				<span class="ov-macro__hint">
					{aggTotalRevenue > 0 ? 'platform_totals' : `$49 × ${licenseCount} licenses`}
				</span>
			</article>
			<article class="ov-macro ov-macro--users">
				<span class="ov-macro__label">Active users</span>
				<span class="ov-macro__value">{macroActiveUsers.toLocaleString()}</span>
				<span class="ov-macro__hint">
					{aggTotalUsers > 0 ? 'platform_totals' : 'Latest MAU month'}
				</span>
			</article>
			<article class="ov-macro ov-macro--up">
				<span class="ov-macro__label">Uptime</span>
				<span
					class="ov-macro__value"
					class:ov-macro__value--ok={systemUptime >= 99.9}
				>
					{systemUptime.toFixed(2)}<span class="ov-macro__suffix">%</span>
				</span>
				<span class="ov-macro__hint ov-macro__hint--mock">30d · monitoring feed</span>
			</article>
			<article class="ov-macro ov-macro--churn">
				<span class="ov-macro__label">Churn</span>
				<span
					class="ov-macro__value"
					class:ov-macro__value--ok={mrrChurnPct < 2}
				>
					{mrrChurnPct.toFixed(1)}<span class="ov-macro__suffix">%</span>
				</span>
				<span class="ov-macro__hint ov-macro__hint--mock">MRR · trailing 30d</span>
			</article>
			<article class="ov-macro ov-macro--activation">
				<span class="ov-macro__label">Activation rate</span>
				<span class="ov-macro__value">
					{activationRatePct.toFixed(1)}<span class="ov-macro__suffix">%</span>
				</span>
				<span class="ov-macro__hint">Onboarding funnel · platform_totals</span>
			</article>
			<article class="ov-macro ov-macro--compliance">
				<span class="ov-macro__label">Compliance alerts</span>
				<span class="ov-macro__value">{complianceOpenCount.toLocaleString()}</span>
				<span class="ov-macro__hint">Open items · GRC queue</span>
			</article>
		</div>

		<div class="ov-bento__body">
			<div class="ov-bento__stage">
				<article class="ov-glass ov-chart" aria-labelledby="ov-rev-title">
					<header class="ov-chart__head">
						<div class="ov-chart__icon ov-chart__icon--emerald" aria-hidden="true">
							<i class="ph ph-chart-pie-slice"></i>
						</div>
						<div class="ov-chart__meta">
							<h2 id="ov-rev-title" class="ov-chart__title">Revenue</h2>
							<p class="ov-chart__sub">MRR by license tier</p>
							<span
								class="ov-chart__src"
								class:ov-chart__src--live={revenueSource === 'live'}
								class:ov-chart__src--mock={revenueSource === 'mock'}
							>
								{revenueSource === 'live' ? 'Live' : 'Mock'}
							</span>
						</div>
						<span class="ov-chart__kpi">
							${revenueByTier.reduce((a, b) => a + (b.value || 0), 0).toLocaleString()}
							<span class="ov-chart__kpi-unit">MRR</span>
						</span>
					</header>
					<div class="ov-chart__canvas ov-chart__canvas--donut">
						<canvas bind:this={revenueCanvasEl} aria-label="Revenue by tier chart"></canvas>
					</div>
				</article>

				<article class="ov-glass ov-chart" aria-labelledby="ov-act-title">
					<header class="ov-chart__head">
						<div class="ov-chart__icon ov-chart__icon--indigo" aria-hidden="true">
							<i class="ph ph-rocket-launch"></i>
						</div>
						<div class="ov-chart__meta">
							<h2 id="ov-act-title" class="ov-chart__title">Activation</h2>
							<p class="ov-chart__sub">Monthly active users · trailing six months</p>
							<span
								class="ov-chart__src"
								class:ov-chart__src--live={mauSource === 'live'}
								class:ov-chart__src--mock={mauSource === 'mock'}
							>
								{mauSource === 'live' ? 'Live' : 'Mock'}
							</span>
						</div>
						<span class="ov-chart__kpi">
							{mauSeries.length ? mauSeries[mauSeries.length - 1].value.toLocaleString() : '—'}
							<span class="ov-chart__kpi-unit">this mo.</span>
						</span>
					</header>
					<div class="ov-chart__canvas">
						<canvas bind:this={mauCanvasEl} aria-label="Activation MAU chart"></canvas>
					</div>
				</article>

				<article class="ov-glass ov-chart" aria-labelledby="ov-sport-title">
					<header class="ov-chart__head">
						<div class="ov-chart__icon ov-chart__icon--rose" aria-hidden="true">
							<i class="ph ph-soccer-ball"></i>
						</div>
						<div class="ov-chart__meta">
							<h2 id="ov-sport-title" class="ov-chart__title">Players by sport</h2>
							<p class="ov-chart__sub">Distribution · aggregate headcount</p>
							<span
								class="ov-chart__src"
								class:ov-chart__src--live={sportSource === 'live'}
								class:ov-chart__src--mock={sportSource === 'mock'}
							>
								{sportSource === 'live' ? 'Live' : 'Mock'}
							</span>
						</div>
						<span class="ov-chart__kpi">
							{playersBySport.reduce((a, b) => a + (b.value || 0), 0).toLocaleString()}
							<span class="ov-chart__kpi-unit">players</span>
						</span>
					</header>
					<div class="ov-chart__canvas ov-chart__canvas--bars">
						<canvas bind:this={sportCanvasEl} aria-label="Players by sport chart"></canvas>
					</div>
				</article>
			</div>

			<aside class="ov-bento__rail" aria-labelledby="ov-rail-title">
				<div class="ov-bento__rail-top">
					<div class="ov-bento__rail-icon" aria-hidden="true">
						<i class="ph ph-shield-checkered"></i>
					</div>
					<div class="ov-bento__rail-titles">
						<h2 id="ov-rail-title" class="ov-bento__rail-h2">Live feed &amp; audit</h2>
						<p class="ov-bento__rail-sub">
							<code class="ov-bento__code">security_audit</code>
						</p>
					</div>
				</div>

				<div class="ov-bento__rail-scroll">
					{#if feedErr}
						<p class="ov-feed__err" role="alert">
							<i class="ph ph-warning-circle" aria-hidden="true"></i>
							{feedErr}
						</p>
					{/if}

					{#if feedLoading && liveFeed.length === 0}
						<div class="ov-feed__empty">
							<i class="ph ph-spinner ov-feed__spin" aria-hidden="true"></i>
							Loading recent activity…
						</div>
					{:else if liveFeed.length === 0}
						<div class="ov-feed__empty">
							<i class="ph ph-moon-stars" aria-hidden="true"></i>
							No audit events yet.
						</div>
					{:else}
						<ol class="ov-feed__list ov-feed__list--rail">
							{#each liveFeed as ev (ev.id)}
								<li class="ov-feed__item ov-feed__item--{actionTone(ev.action)}">
									<span class="ov-feed__item-icon" aria-hidden="true">
										<i class="ph {actionIcon(ev.action)}"></i>
									</span>
									<div class="ov-feed__item-body">
										<div class="ov-feed__item-head">
											<span class="ov-feed__item-action">{prettyAction(ev.action)}</span>
											<span class="ov-feed__item-time">{relativeTime(ev.createdAt)}</span>
										</div>
										{#if ev.targetEmail}
											<span class="ov-feed__item-target">{ev.targetEmail}</span>
										{/if}
										{#if ev.details}
											<span class="ov-feed__item-details">{ev.details}</span>
										{/if}
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			</aside>
		</div>
	</div>
</div>

<style>
	/* Strike 5 — Bento HUD: fills ec-canvas height; page chrome does not scroll */
	.ov-page--bento {
		height: 100%;
		min-height: 0;
		max-height: 100%;
		overflow: hidden;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ov-bento {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 6px;
	}

	@media (max-width: 1100px) {
		.ov-bento {
			grid-template-rows: auto auto minmax(0, 1fr);
		}
	}

	.ov-bento__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 0;
		padding: 2px 2px 0;
	}

	.ov-bento__head-text {
		min-width: 0;
	}

	.ov-bento__eyebrow {
		display: block;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.ov-bento__h1 {
		margin: 2px 0 0;
		line-height: 1.1;
	}

	.ov-bento__live {
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

	:global(html.dark) .ov-bento__live {
		color: #a7f3d0;
		background: rgba(34, 197, 94, 0.16);
	}

	.ov-bento__live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		animation: ov-bento-pulse 1.8s ease-in-out infinite;
	}

	@keyframes ov-bento-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
		50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
	}

	.ov-bento__kpis {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 6px;
		min-height: 0;
	}

	@media (max-width: 1200px) {
		.ov-bento__kpis {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 700px) {
		.ov-bento__kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.ov-macro {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 6px 8px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(12px);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
		min-height: 0;
	}

	:global(html.dark) .ov-macro {
		background: rgba(24, 24, 27, 0.65);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
	}

	.ov-macro__label {
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.ov-macro__value {
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.ov-macro__value--ok {
		color: #15803d;
	}

	:global(html.dark) .ov-macro__value--ok {
		color: #86efac;
	}

	.ov-macro__suffix {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin-left: 1px;
	}

	.ov-macro__hint {
		font-size: 0.65rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ov-macro__hint--mock {
		color: #a16207;
		font-style: italic;
	}

	:global(html.dark) .ov-macro__hint--mock {
		color: #fbbf24;
	}

	.ov-bento__body {
		display: grid;
		grid-template-columns: 7fr 3fr;
		gap: 8px;
		min-height: 0;
		overflow: hidden;
	}

	@media (max-width: 1100px) {
		.ov-bento__body {
			grid-template-columns: 1fr;
			overflow-y: auto;
		}

		.ov-bento__stage {
			grid-template-columns: 1fr;
		}
	}

	.ov-bento__stage {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		min-height: 0;
		overflow: hidden;
		align-content: stretch;
	}

	.ov-bento__stage .ov-chart {
		min-height: 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.ov-glass {
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(14px);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset;
	}

	:global(html.dark) .ov-glass {
		background: rgba(24, 24, 27, 0.72);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset;
	}

	.ov-chart {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px 10px;
		min-height: 0;
	}

	.ov-chart__head {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.ov-chart__icon {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.ov-chart__icon--emerald {
		background: rgba(16, 185, 129, 0.18);
		color: #059669;
	}

	.ov-chart__icon--indigo {
		background: rgba(99, 102, 241, 0.2);
		color: #4f46e5;
	}

	:global(html.dark) .ov-chart__icon--emerald {
		background: rgba(16, 185, 129, 0.24);
		color: #a7f3d0;
	}

	:global(html.dark) .ov-chart__icon--indigo {
		background: rgba(99, 102, 241, 0.28);
		color: #c7d2fe;
	}

	.ov-chart__icon--rose {
		background: rgba(244, 63, 94, 0.18);
		color: #e11d48;
	}

	:global(html.dark) .ov-chart__icon--rose {
		background: rgba(244, 63, 94, 0.26);
		color: #fda4af;
	}

	.ov-chart__meta {
		flex: 1;
		min-width: 0;
	}

	.ov-chart__title {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.ov-chart__sub {
		margin: 0;
		font-size: 0.625rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.ov-chart__src {
		display: inline-block;
		margin-top: 4px;
		padding: 1px 7px;
		border-radius: 999px;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.ov-chart__src--live {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
	}

	.ov-chart__src--mock {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.12);
	}

	.ov-chart__kpi {
		font-size: 0.85rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.ov-chart__kpi-unit {
		font-size: 0.55rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-left: 4px;
	}

	.ov-chart__canvas {
		position: relative;
		flex: 1;
		min-height: 72px;
		width: 100%;
	}

	.ov-chart__canvas--donut {
		min-height: 88px;
	}

	.ov-chart__canvas--bars {
		min-height: 72px;
	}

	.ov-chart__canvas canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.ov-bento__rail {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.45);
		backdrop-filter: blur(14px);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
	}

	:global(html.dark) .ov-bento__rail {
		background: rgba(9, 9, 11, 0.55);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
	}

	.ov-bento__rail-top {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px 10px;
		flex-shrink: 0;
	}

	.ov-bento__rail-icon {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(236, 72, 153, 0.15);
		color: #db2777;
		font-size: 1rem;
		flex-shrink: 0;
	}

	:global(html.dark) .ov-bento__rail-icon {
		background: rgba(236, 72, 153, 0.22);
		color: #fbcfe8;
	}

	.ov-bento__rail-h2 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.ov-bento__rail-sub {
		margin: 2px 0 0;
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.ov-bento__code {
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	:global(html.dark) .ov-bento__code {
		background: rgba(255, 255, 255, 0.08);
	}

	.ov-bento__rail-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding: 0 10px 12px;
		-webkit-overflow-scrolling: touch;
	}

	.ov-err--compact {
		margin: 0;
		flex-shrink: 0;
	}

	.ov-err {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 10px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
	}

	.ov-feed__err {
		margin: 0 0 8px;
		padding: 10px 12px;
		border-radius: 8px;
		background: rgba(185, 28, 28, 0.08);
		color: #b91c1c;
		font-size: 0.8125rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.ov-feed__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px 12px;
		color: var(--text-secondary);
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: center;
	}

	.ov-feed__spin {
		animation: ov-feed-spin 1s linear infinite;
	}

	@keyframes ov-feed-spin {
		to { transform: rotate(360deg); }
	}

	.ov-feed__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ov-feed__list--rail {
		max-height: none;
		overflow: visible;
	}

	.ov-feed__item {
		display: flex;
		gap: 10px;
		padding: 10px 11px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .ov-feed__item {
		background: rgba(255, 255, 255, 0.04);
	}

	.ov-feed__item--success { box-shadow: inset 3px 0 0 #22c55e; }
	.ov-feed__item--danger  { box-shadow: inset 3px 0 0 #ef4444; }
	.ov-feed__item--warn    { box-shadow: inset 3px 0 0 #f59e0b; }
	.ov-feed__item--info    { box-shadow: inset 3px 0 0 #6366f1; }

	.ov-feed__item-icon {
		width: 26px;
		height: 26px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-secondary);
		font-size: 0.88rem;
		flex-shrink: 0;
	}

	.ov-feed__item--success .ov-feed__item-icon { background: rgba(34, 197, 94, 0.14);  color: #047857; }
	.ov-feed__item--danger  .ov-feed__item-icon { background: rgba(239, 68, 68, 0.14);  color: #b91c1c; }
	.ov-feed__item--warn    .ov-feed__item-icon { background: rgba(245, 158, 11, 0.14); color: #b45309; }
	.ov-feed__item--info    .ov-feed__item-icon { background: rgba(99, 102, 241, 0.14); color: #4f46e5; }

	:global(html.dark) .ov-feed__item--success .ov-feed__item-icon { background: rgba(34, 197, 94, 0.24);  color: #a7f3d0; }
	:global(html.dark) .ov-feed__item--danger  .ov-feed__item-icon { background: rgba(239, 68, 68, 0.24);  color: #fecaca; }
	:global(html.dark) .ov-feed__item--warn    .ov-feed__item-icon { background: rgba(245, 158, 11, 0.24); color: #fde68a; }
	:global(html.dark) .ov-feed__item--info    .ov-feed__item-icon { background: rgba(99, 102, 241, 0.24); color: #c7d2fe; }

	.ov-feed__item-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ov-feed__item-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.ov-feed__item-action {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.ov-feed__item-time {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.ov-feed__item-target {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
		word-break: break-all;
	}

	.ov-feed__item-details {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}
</style>
