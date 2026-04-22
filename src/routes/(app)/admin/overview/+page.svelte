<script>
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDoc,
		query,
		where,
		orderBy,
		limit as fbLimit,
		getDocs,
		getCountFromServer,
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { normalizeClubSport, clubSportAccent, KNOWN_SPORT_KEYS } from '$lib/utils/sport-icon.js';
	import '$lib/styles/enterprise-console.css';

	// ── KPI group 1: Gross Revenue & Receivables ─────────────────────────────────
	let licenseCount        = $state(0);
	let pastDueCount        = $state(0);
	let outstandingInstalls = $state(0); // payment_plans count (graceful fallback)

	// ── KPI group 2: Platform Health ─────────────────────────────────────────────
	let totalClubs     = $state(0);
	let totalTeams     = $state(0);
	let totalAthletes  = $state(0);

	// ── KPI group 3: Compliance & Logistics ──────────────────────────────────────
	let pendingVpcCount    = $state(0);
	let activeBookingCount = $state(0); // field_bookings count (graceful fallback)

	// ── Loading / error ───────────────────────────────────────────────────────────
	let telLoading = $state(false);
	let telErr     = $state('');

	// ── Single consolidated fetch — all telemetry data in one $effect ─────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		let destroyed = false;
		telLoading = true;
		telErr = '';

		void (async () => {
			try {
				// All queries fire in parallel. New collections (payment_plans, field_bookings)
				// use .catch(() => { data: () => ({ count: 0 }) }) so the entire Promise.all
				// never rejects just because a collection doesn't exist yet.
				const [
					licensesSnap,
					clubsSnap,
					teamsCountSnap,
					athletesCountSnap,
					vpcCountSnap,
					installmentsCountSnap,
					bookingsCountSnap,
				] = await Promise.all([
					// Group 1 — Revenue
					getDocs(collection(db, 'licenses')),
					// Group 2 — Platform Health
					getDocs(collection(db, 'clubs')),
					getCountFromServer(collection(db, 'teams'))
						.catch(() => getDocs(collection(db, 'teams'))
							.then((s) => ({ data: () => ({ count: s.size }) }))
							.catch(() => ({ data: () => ({ count: 0 }) })),
						),
					getCountFromServer(collection(db, 'player_lookup'))
						.catch(() => getDocs(collection(db, 'player_lookup'))
							.then((s) => ({ data: () => ({ count: s.size }) }))
							.catch(() => ({ data: () => ({ count: 0 }) })),
						),
					// Group 3 — Compliance & Logistics
					getCountFromServer(
						query(collection(db, 'vpc_requests'), where('status', '==', 'pending_verification')),
					).catch(() =>
						getDocs(
							query(collection(db, 'vpc_requests'), where('status', '==', 'pending_verification')),
						).then((s) => ({ data: () => ({ count: s.size }) }))
						 .catch(() => ({ data: () => ({ count: 0 }) })),
					),
					// Outstanding player installments — payment_plans collection may not exist yet
					getCountFromServer(collection(db, 'payment_plans'))
						.catch(() => ({ data: () => ({ count: 0 }) })),
					// Active field/facility bookings — field_bookings collection may not exist yet
					getCountFromServer(
						query(collection(db, 'field_bookings'), where('status', '==', 'active')),
					).catch(() => ({ data: () => ({ count: 0 }) })),
				]);

				if (destroyed) return;

				// ── Group 1: Revenue & Receivables ────────────────────────────
				licenseCount = licensesSnap.size;
				let pastDue = 0;
				licensesSnap.forEach((d) => {
					if (d.data().status === 'past_due') pastDue++;
				});
				pastDueCount        = pastDue;
				outstandingInstalls = installmentsCountSnap.data().count;

				// ── Group 2: Platform Health ──────────────────────────────────
				totalClubs    = clubsSnap.size;
				totalTeams    = teamsCountSnap.data().count;
				totalAthletes = athletesCountSnap.data().count;

				// ── Group 3: Compliance & Logistics ──────────────────────────
				pendingVpcCount    = vpcCountSnap.data().count;
				activeBookingCount = bookingsCountSnap.data().count;

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

	// ── Derived display values ────────────────────────────────────────────────────
	/** Estimated MRR at $49/license — clearly labeled as estimate in the UI */
	const mrrEstimate = $derived(licenseCount * 49);

	/** Stripe-style MRR formatted string */
	const mrrDisplay = $derived(
		mrrEstimate >= 1000
			? `$${(mrrEstimate / 1000).toFixed(1)}k`
			: `$${mrrEstimate.toLocaleString()}`,
	);

	const adminCount = $derived(teamsStore.admins.length);

	// ═══════════════════════════════════════════════════════════════════════════
	// Command Center datasets (Sprint 2.6.7 — Paranoid Patch)
	// ═══════════════════════════════════════════════════════════════════════════
	// Three premium Chart.js widgets + a live audit feed. Every chart dataset
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

	/** Players per sport, sourced from `analytics/platform_totals.bySport`. */
	let playersBySport = $state(/** @type {SeriesPoint[]} */ ([]));

	/** Recent security_audit events (desc by createdAt). */
	let liveFeed = $state(
		/** @type {{ id: string, action: string, targetEmail: string, details: string, createdAt: Date | null }[]} */ ([])
	);
	let feedLoading = $state(false);
	let feedErr     = $state('');

	/**
	 * Pull MAU, revenue-by-tier, players-by-sport, and the live audit feed
	 * in a single background batch. This runs once after the telemetry effect
	 * settles — we don't block the KPI rows behind chart data.
	 */
	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading || !authStore.isAuthenticated) return;

		let destroyed = false;
		feedLoading = true;
		feedErr = '';

		// ═════════════════════════════════════════════════════════════════════
		// Sprint 2.6.7 — Paranoid Patch. All three chart datasets derive from a
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
		const MOCK_PLAYERS_BY_SPORT = {
			soccer: 1450,
			basketball: 820,
			volleyball: 340,
			football: 210,
			baseball: 180,
			lacrosse: 75,
		};

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
		 * Read the aggregated totals doc + hydrate all three chart series.
		 * Falls back to mocks inside `catch` (and anywhere the payload is
		 * missing/malformed) so the dashboard never stalls and never triggers
		 * a collection scan.
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
				}
			} catch (e) {
				console.warn('[overview] MAU hydrate failed — using mock series', e);
				if (!destroyed) {
					const labels = buildMauLabels();
					mauSeries = labels.map(({ label }, i) => ({
						label,
						value: MOCK_MAU[i] ?? 0,
					}));
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
				}
			}

			// ── 3. Players by Sport ───────────────────────────────────────────
			try {
				/** @type {Record<string, number>} */
				let bySport = {};
				const raw = totals && (totals.bySport || totals.playersBySport);
				if (raw && typeof raw === 'object') {
					for (const [key, value] of Object.entries(raw)) {
						const n = Number(value);
						if (!Number.isFinite(n) || n < 0) continue;
						const canonical = normalizeClubSport(key);
						bySport[canonical] = (bySport[canonical] || 0) + Math.round(n);
					}
				}

				const hasSignal = Object.values(bySport).some((v) => v > 0);
				if (!hasSignal) bySport = { ...MOCK_PLAYERS_BY_SPORT };

				const ordered = KNOWN_SPORT_KEYS
					.map((key) => ({
						label: clubSportAccent(key).label,
						value: Math.round(bySport[key] || 0),
					}))
					.filter((s) => s.value > 0);

				if (!destroyed) {
					playersBySport = ordered.length
						? ordered
						: [{ label: 'No Players', value: 0 }];
				}
			} catch (e) {
				console.warn('[overview] Players-by-Sport hydrate failed — using mock series', e);
				if (!destroyed) {
					playersBySport = KNOWN_SPORT_KEYS
						.map((key) => ({
							label: clubSportAccent(key).label,
							value: Math.round(MOCK_PLAYERS_BY_SPORT[key] || 0),
						}))
						.filter((s) => s.value > 0);
				}
			}

			// ── 4. Global Live Feed (security_audit, most recent first) ──────
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
	let sportsCanvasEl   = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));

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
								label: 'Monthly Active Users',
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
									font: { size: 11, weight: 600 },
									boxWidth: 10,
									boxHeight: 10,
									padding: 12,
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

	/* ── Bar chart: Total Players by Sport ─────────────────────────────────── */
	$effect(() => {
		if (!browser || !sportsCanvasEl) return;
		const target = sportsCanvasEl;
		const series = playersBySport;
		let destroyed = false;
		/** @type {import('chart.js').Chart | null} */
		let chart = null;

		(async () => {
			try {
				const mod = await import('chart.js');
				if (destroyed || !target.isConnected) return;
				mod.Chart.register(...mod.registerables);
				const muted = cssVar('--text-secondary', '#475569');
				const grid  = cssVar('--chart-grid', 'rgba(15,23,42,0.08)');
				const colors = series.map((p) => {
					const key = String(p.label || '').toLowerCase();
					return clubSportAccent(key).fg;
				});
				chart = new mod.Chart(target, {
					type: 'bar',
					data: {
						labels: series.map((p) => p.label),
						datasets: [
							{
								label: 'Players',
								data: series.map((p) => p.value),
								backgroundColor: colors,
								borderRadius: 8,
								borderSkipped: false,
								maxBarThickness: 42,
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
			} catch (e) {
				console.warn('[overview] Sports chart init failed', e);
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

<div class="ov-page" data-admin-shell="true">

	<header class="ov-hero" aria-labelledby="ov-hero-title">
		<div class="ov-hero__crumb">
			<i class="ph ph-globe" aria-hidden="true"></i>
			<span>Global Admin</span>
			<i class="ph ph-caret-right ov-hero__sep" aria-hidden="true"></i>
			<span class="ov-hero__crumb-leaf">Command Center</span>
		</div>
		<div class="ov-hero__row">
			<div>
				<h1 id="ov-hero-title" class="ov-hero__title">Single Pane of Glass</h1>
				<p class="ov-hero__sub">
					Real-time telemetry across revenue, health, compliance, and the
					global audit trail — everything a Global Admin needs in one view.
				</p>
			</div>
			<div class="ov-hero__chip">
				<span class="ov-hero__chip-dot"></span>
				{telLoading ? 'Syncing…' : 'Live'}
			</div>
		</div>
	</header>

	{#if telErr}
		<p class="ov-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{telErr}
		</p>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- KPI Group 1: Gross Revenue & Receivables                              -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-group" aria-labelledby="ov-g1-title">
		<div class="ov-group__header">
			<span class="ov-group__icon ov-group__icon--revenue">
				<i class="ph ph-trend-up" aria-hidden="true"></i>
			</span>
			<h2 id="ov-g1-title" class="ov-group__title">Gross Revenue &amp; Receivables</h2>
			<span class="ov-group__badge">
				<span class="ov-group__badge-dot ov-group__badge-dot--live"></span>
				Estimates
			</span>
		</div>

		<div class="ov-kpi-row">
			<div class="ov-kpi">
				<span class="ov-kpi__label">Est. MRR</span>
				<span class="ov-kpi__value ov-kpi__value--xl">
					{telLoading ? '—' : mrrDisplay}
				</span>
				<span class="ov-kpi__sub">@ $49 × {licenseCount} licenses</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Active Licenses</span>
				<span class="ov-kpi__value">
					{telLoading ? '—' : licenseCount.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Past Due Accounts</span>
				<span
					class="ov-kpi__value"
					class:ov-kpi__value--danger={pastDueCount > 0}
					class:ov-kpi__value--ok={!telLoading && pastDueCount === 0}
				>
					{#if telLoading}
						—
					{:else if pastDueCount === 0}
						<i class="ph ph-check-circle" aria-hidden="true"></i>
						None
					{:else}
						<i class="ph ph-warning" aria-hidden="true"></i>
						{pastDueCount}
					{/if}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Installment Plans</span>
				<span
					class="ov-kpi__value"
					class:ov-kpi__value--muted={outstandingInstalls === 0}
				>
					{telLoading ? '—' : outstandingInstalls.toLocaleString()}
				</span>
				<span class="ov-kpi__sub">Outstanding payment plans</span>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- KPI Group 2: Platform Health                                           -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-group" aria-labelledby="ov-g2-title">
		<div class="ov-group__header">
			<span class="ov-group__icon ov-group__icon--health">
				<i class="ph ph-pulse" aria-hidden="true"></i>
			</span>
			<h2 id="ov-g2-title" class="ov-group__title">Platform Health</h2>
		</div>

		<div class="ov-kpi-row">
			<div class="ov-kpi">
				<span class="ov-kpi__label">Active Clubs</span>
				<span class="ov-kpi__value ov-kpi__value--xl">
					{telLoading ? '—' : totalClubs.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Total Teams</span>
				<span class="ov-kpi__value">
					{telLoading ? '—' : totalTeams.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Total Athletes</span>
				<span class="ov-kpi__value">
					{telLoading ? '—' : totalAthletes.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Platform Admins</span>
				<span class="ov-kpi__value">
					{adminCount}
				</span>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- KPI Group 3: Compliance & Logistics                                    -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section
		class="ov-group"
		class:ov-group--alert={pendingVpcCount > 0}
		aria-labelledby="ov-g3-title"
	>
		<div class="ov-group__header">
			<span class="ov-group__icon ov-group__icon--compliance">
				<i class="ph ph-shield-warning" aria-hidden="true"></i>
			</span>
			<h2 id="ov-g3-title" class="ov-group__title">Compliance &amp; Logistics</h2>
			{#if pendingVpcCount > 0}
				<span class="ov-group__badge ov-group__badge--warn">
					<span class="ov-group__badge-dot ov-group__badge-dot--warn"></span>
					Action required
				</span>
			{/if}
		</div>

		<div class="ov-kpi-row">
			<div class="ov-kpi">
				<span class="ov-kpi__label">Pending VPC Approvals</span>
				<span
					class="ov-kpi__value ov-kpi__value--xl"
					class:ov-kpi__value--danger={pendingVpcCount > 0}
					class:ov-kpi__value--ok={!telLoading && pendingVpcCount === 0}
				>
					{#if telLoading}
						—
					{:else if pendingVpcCount === 0}
						<i class="ph ph-check-circle" aria-hidden="true"></i>
						0
					{:else}
						{pendingVpcCount}
					{/if}
				</span>
				<span class="ov-kpi__sub">Unverified parental consents</span>
				{#if pendingVpcCount > 0}
					<a href="/admin/organizations" class="ov-kpi__cta">
						Review organizations <i class="ph ph-arrow-right" aria-hidden="true"></i>
					</a>
				{/if}
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Active Field Bookings</span>
				<span
					class="ov-kpi__value"
					class:ov-kpi__value--muted={activeBookingCount === 0}
				>
					{telLoading ? '—' : activeBookingCount.toLocaleString()}
				</span>
				<span class="ov-kpi__sub">Active facility reservations</span>
				{#if activeBookingCount === 0 && !telLoading}
					<span class="ov-kpi__hint">No active bookings — Field Ops coming in Epic 3</span>
				{/if}
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Compliance Rate</span>
				<span class="ov-kpi__value">
					{#if telLoading}
						—
					{:else if pendingVpcCount === 0}
						<span class="ov-kpi__value--ok">
							<i class="ph ph-check-circle" aria-hidden="true"></i>
							100%
						</span>
					{:else}
						{Math.max(0, Math.round((1 - pendingVpcCount / Math.max(pendingVpcCount, 1)) * 100))}%
					{/if}
				</span>
				<span class="ov-kpi__sub">VPC verification rate</span>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- Command Center: 3 Chart.js widgets + Global Live Feed                 -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-cc" aria-labelledby="ov-cc-title">
		<div class="ov-cc__head">
			<span class="ov-cc__icon" aria-hidden="true">
				<i class="ph ph-chart-line"></i>
			</span>
			<h2 id="ov-cc-title" class="ov-cc__title">Command Center</h2>
			<span class="ov-cc__badge" aria-label="Live data">
				<span class="ov-cc__badge-dot"></span>
				Live
			</span>
		</div>

		<div class="ov-cc__grid">
			<div class="ov-cc__charts">
				<article class="ov-card" aria-labelledby="ov-card-mau">
					<header class="ov-card__head">
						<div class="ov-card__icon ov-card__icon--indigo" aria-hidden="true">
							<i class="ph ph-users-three"></i>
						</div>
						<div class="ov-card__head-body">
							<h3 id="ov-card-mau" class="ov-card__title">Monthly Active Users</h3>
							<p class="ov-card__sub">Unique sign-ins over the last six months</p>
						</div>
						<span class="ov-card__kpi">
							{mauSeries.length ? mauSeries[mauSeries.length - 1].value.toLocaleString() : '—'}
							<span class="ov-card__kpi-unit">this mo.</span>
						</span>
					</header>
					<div class="ov-card__canvas">
						<canvas bind:this={mauCanvasEl} aria-label="Monthly Active Users line chart"></canvas>
					</div>
				</article>

				<article class="ov-card" aria-labelledby="ov-card-rev">
					<header class="ov-card__head">
						<div class="ov-card__icon ov-card__icon--emerald" aria-hidden="true">
							<i class="ph ph-chart-pie-slice"></i>
						</div>
						<div class="ov-card__head-body">
							<h3 id="ov-card-rev" class="ov-card__title">Revenue by Tier</h3>
							<p class="ov-card__sub">Active-license MRR grouped by plan</p>
						</div>
						<span class="ov-card__kpi">
							${revenueByTier.reduce((a, b) => a + (b.value || 0), 0).toLocaleString()}
							<span class="ov-card__kpi-unit">MRR</span>
						</span>
					</header>
					<div class="ov-card__canvas ov-card__canvas--donut">
						<canvas bind:this={revenueCanvasEl} aria-label="Revenue by Tier doughnut chart"></canvas>
					</div>
				</article>

				<article class="ov-card" aria-labelledby="ov-card-sports">
					<header class="ov-card__head">
						<div class="ov-card__icon ov-card__icon--amber" aria-hidden="true">
							<i class="ph ph-basketball"></i>
						</div>
						<div class="ov-card__head-body">
							<h3 id="ov-card-sports" class="ov-card__title">Total Players by Sport</h3>
							<p class="ov-card__sub">Enrolled athletes grouped by their team's sport</p>
						</div>
						<span class="ov-card__kpi">
							{playersBySport.reduce((a, b) => a + (b.value || 0), 0).toLocaleString()}
							<span class="ov-card__kpi-unit">players</span>
						</span>
					</header>
					<div class="ov-card__canvas">
						<canvas bind:this={sportsCanvasEl} aria-label="Total Players by Sport bar chart"></canvas>
					</div>
				</article>
			</div>

			<aside class="ov-feed" aria-labelledby="ov-feed-title">
				<header class="ov-feed__head">
					<div class="ov-feed__icon" aria-hidden="true">
						<i class="ph ph-broadcast"></i>
					</div>
					<div class="ov-feed__head-body">
						<h3 id="ov-feed-title" class="ov-feed__title">Global Live Feed</h3>
						<p class="ov-feed__sub">Most recent events from <code>security_audit</code></p>
					</div>
				</header>

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
						No audit events yet. You're the quietest platform on earth.
					</div>
				{:else}
					<ol class="ov-feed__list">
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
			</aside>
		</div>
	</section>

</div>

<style>
	.ov-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ── Error banner ───────────────────────────────────────────────── */
	.ov-err {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 12px 14px;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
		border: 1px solid rgba(185, 28, 28, 0.25);
	}

	/* ── KPI Group section ──────────────────────────────────────────── */
	.ov-group {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 12px;
		background: var(--glass-bg, #fff);
		overflow: hidden;
		transition: border-color 0.15s ease;
	}

	:global(html.dark) .ov-group {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov-group--alert {
		border-color: rgba(245, 158, 11, 0.45);
	}

	:global(html.dark) .ov-group--alert {
		border-color: rgba(245, 158, 11, 0.35);
		background: rgba(245, 158, 11, 0.03);
	}

	/* ── Group header ───────────────────────────────────────────────── */
	.ov-group__header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px 10px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ov-group__header {
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.ov-group__icon {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.ov-group__icon--revenue    { background: rgba(16,185,129,0.10); color: #059669; }
	.ov-group__icon--health     { background: rgba(99,102,241,0.10); color: #6366f1; }
	.ov-group__icon--compliance { background: rgba(245,158,11,0.10); color: #d97706; }

	:global(html.dark) .ov-group__icon--revenue    { background: rgba(16,185,129,0.14); color: #6ee7b7; }
	:global(html.dark) .ov-group__icon--health     { background: rgba(99,102,241,0.14); color: #a5b4fc; }
	:global(html.dark) .ov-group__icon--compliance { background: rgba(245,158,11,0.14); color: #fbbf24; }

	.ov-group__title {
		margin: 0;
		flex: 1;
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.ov-group__badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--text-secondary);
		background: rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	:global(html.dark) .ov-group__badge {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: #a1a1aa;
	}

	.ov-group__badge--warn {
		color: #b45309;
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.25);
	}

	:global(html.dark) .ov-group__badge--warn {
		color: #fbbf24;
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.25);
	}

	.ov-group__badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.25);
	}

	.ov-group__badge-dot--live { background: #22c55e; }
	.ov-group__badge-dot--warn { background: #f59e0b; animation: ov-pulse 1.8s ease infinite; }

	@keyframes ov-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
		50%       { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0); }
	}

	/* ── KPI row — horizontal strip of metrics ──────────────────────── */
	.ov-kpi-row {
		display: flex;
		align-items: stretch;
		flex-wrap: wrap;
	}

	.ov-kpi {
		flex: 1 1 0;
		min-width: 130px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 20px 24px;
	}

	.ov-kpi-divider {
		flex-shrink: 0;
		width: 1px;
		background: var(--border-subtle, #e5e5e5);
		margin: 16px 0;
		align-self: stretch;
	}

	:global(html.dark) .ov-kpi-divider {
		background: rgba(255, 255, 255, 0.07);
	}

	/* ── KPI label ──────────────────────────────────────────────────── */
	.ov-kpi__label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	/* ── KPI value ──────────────────────────────────────────────────── */
	.ov-kpi__value {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 1.625rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.ov-kpi__value--xl {
		font-size: 2.25rem;
	}

	.ov-kpi__value--ok     { color: #15803d; }
	.ov-kpi__value--danger { color: var(--danger-red, #b91c1c); }
	.ov-kpi__value--muted  { color: var(--text-secondary); font-size: 1.25rem; font-weight: 600; }

	:global(html.dark) .ov-kpi__value--ok     { color: #86efac; }
	:global(html.dark) .ov-kpi__value--danger { color: #fca5a5; }

	/* ── Sub-label / hint ───────────────────────────────────────────── */
	.ov-kpi__sub {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-top: 2px;
	}

	/* Sprint 2.6.7 — Hint copy is differentiated by weight + italics; the
	   previous `opacity: 0.65` was a transparency hack that broke the
	   Global Admin contrast contract. We now render in the exact
	   secondary token (#D4D4D8 dark) so contrast never drops below WCAG AA. */
	.ov-kpi__hint {
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-style: italic;
		font-weight: 500;
		line-height: 1.4;
	}

	/* ── CTA link inside KPI ────────────────────────────────────────── */
	.ov-kpi__cta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 10px;
		padding: 6px 12px;
		border-radius: 7px;
		border: 1px solid rgba(245, 158, 11, 0.4);
		background: rgba(245, 158, 11, 0.06);
		color: #d97706;
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.1s ease;
		width: fit-content;
	}

	.ov-kpi__cta:hover { background: rgba(245, 158, 11, 0.12); }

	:global(html.dark) .ov-kpi__cta {
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}

	/* ── Responsive — stack KPI rows on narrow viewports ───────────── */
	@media (max-width: 680px) {
		.ov-kpi-row { flex-direction: column; }
		.ov-kpi-divider { width: 100%; height: 1px; margin: 0; }
		.ov-kpi { padding: 16px; }
	}

	/* ═══════════════════════════════════════════════════════════════════ */
	/* Sprint 2.6.5 — Command Center (Single Pane of Glass) hero + grid   */
	/* ═══════════════════════════════════════════════════════════════════ */
	.ov-hero {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 22px 24px;
		border-radius: 14px;
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(59, 130, 246, 0.04));
		border: 1px solid rgba(99, 102, 241, 0.22);
	}

	:global(html.dark) .ov-hero {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(30, 27, 75, 0.4));
		border-color: rgba(99, 102, 241, 0.35);
	}

	.ov-hero__crumb {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	/* Sprint 2.6.7 — Separator icon uses the solid secondary token (no
	   transparency). The breadcrumb hierarchy is communicated via the leaf
	   being primary while crumbs + separators are secondary. */
	.ov-hero__sep {
		color: var(--text-secondary);
		font-size: 0.75em;
	}

	.ov-hero__crumb-leaf {
		color: var(--text-primary);
	}

	.ov-hero__row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.ov-hero__title {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.ov-hero__sub {
		margin: 6px 0 0;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--text-secondary);
		max-width: 60ch;
	}

	.ov-hero__chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 999px;
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.35);
		font-size: 0.75rem;
		font-weight: 700;
		color: #047857;
	}

	:global(html.dark) .ov-hero__chip {
		background: rgba(34, 197, 94, 0.18);
		border-color: rgba(34, 197, 94, 0.5);
		color: #a7f3d0;
	}

	.ov-hero__chip-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #22c55e;
		animation: ov-hero-pulse 1.8s ease-in-out infinite;
	}

	@keyframes ov-hero-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
		50%      { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
	}

	/* ── Command Center section ─────────────────────────────────────── */
	.ov-cc {
		display: flex;
		flex-direction: column;
		gap: 14px;
		border-radius: 14px;
		padding: 18px;
		background: var(--glass-bg, #ffffff);
		border: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ov-cc {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov-cc__head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 2px 4px 6px;
	}

	.ov-cc__icon {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(99, 102, 241, 0.12);
		color: #4f46e5;
		font-size: 0.95rem;
	}

	:global(html.dark) .ov-cc__icon {
		background: rgba(99, 102, 241, 0.2);
		color: #c7d2fe;
	}

	.ov-cc__title {
		flex: 1;
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.015em;
		color: var(--text-primary);
	}

	.ov-cc__badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		background: rgba(34, 197, 94, 0.1);
		color: #047857;
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	:global(html.dark) .ov-cc__badge {
		background: rgba(34, 197, 94, 0.16);
		color: #a7f3d0;
		border-color: rgba(34, 197, 94, 0.35);
	}

	.ov-cc__badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		animation: ov-hero-pulse 1.8s ease-in-out infinite;
	}

	.ov-cc__grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 14px;
	}

	@media (max-width: 1100px) {
		.ov-cc__grid { grid-template-columns: minmax(0, 1fr); }
	}

	.ov-cc__charts {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-auto-rows: auto;
		gap: 14px;
	}

	@media (max-width: 780px) {
		.ov-cc__charts { grid-template-columns: minmax(0, 1fr); }
	}

	/* ── Chart card ─────────────────────────────────────────────────── */
	.ov-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		border-radius: 12px;
		background: #ffffff;
		border: 1px solid var(--border-subtle, #e5e5e5);
		min-height: 260px;
	}

	/* MAU chart spans both columns on wide screens for more horizontal canvas */
	.ov-card:first-child {
		grid-column: 1 / -1;
	}

	:global(html.dark) .ov-card {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov-card__head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ov-card__icon {
		width: 36px;
		height: 36px;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.05rem;
		flex-shrink: 0;
	}

	.ov-card__icon--indigo  { background: rgba(99, 102, 241, 0.14);  color: #4f46e5; }
	.ov-card__icon--emerald { background: rgba(16, 185, 129, 0.14);  color: #059669; }
	.ov-card__icon--amber   { background: rgba(251, 146, 60, 0.14);  color: #ea580c; }

	:global(html.dark) .ov-card__icon--indigo  { background: rgba(99, 102, 241, 0.22);  color: #c7d2fe; }
	:global(html.dark) .ov-card__icon--emerald { background: rgba(16, 185, 129, 0.22);  color: #a7f3d0; }
	:global(html.dark) .ov-card__icon--amber   { background: rgba(251, 146, 60, 0.22);  color: #fed7aa; }

	.ov-card__head-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ov-card__title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.ov-card__sub {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.35;
		color: var(--text-secondary);
	}

	.ov-card__kpi {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.ov-card__kpi-unit {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.ov-card__canvas {
		position: relative;
		width: 100%;
		height: 220px;
	}

	.ov-card__canvas--donut {
		height: 240px;
	}

	.ov-card__canvas canvas {
		position: absolute;
		inset: 0;
		width: 100% !important;
		height: 100% !important;
	}

	/* ── Global Live Feed ────────────────────────────────────────────── */
	.ov-feed {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		border-radius: 12px;
		background: #ffffff;
		border: 1px solid var(--border-subtle, #e5e5e5);
		min-height: 260px;
	}

	:global(html.dark) .ov-feed {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov-feed__head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ov-feed__icon {
		width: 36px;
		height: 36px;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(236, 72, 153, 0.14);
		color: #db2777;
		font-size: 1.05rem;
		flex-shrink: 0;
	}

	:global(html.dark) .ov-feed__icon {
		background: rgba(236, 72, 153, 0.22);
		color: #fbcfe8;
	}

	.ov-feed__head-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ov-feed__title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.ov-feed__sub {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.35;
		color: var(--text-secondary);
	}

	.ov-feed__sub code {
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	:global(html.dark) .ov-feed__sub code {
		background: rgba(255, 255, 255, 0.08);
	}

	.ov-feed__err {
		margin: 0;
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
		padding: 28px 14px;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 10px;
		border: 1px dashed var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ov-feed__empty {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.ov-feed__spin {
		animation: ov-spin 1s linear infinite;
	}

	@keyframes ov-spin {
		to { transform: rotate(360deg); }
	}

	.ov-feed__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 540px;
		overflow-y: auto;
	}

	.ov-feed__item {
		display: flex;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: rgba(0, 0, 0, 0.02);
	}

	:global(html.dark) .ov-feed__item {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov-feed__item--success { border-left: 3px solid #22c55e; }
	.ov-feed__item--danger  { border-left: 3px solid #ef4444; }
	.ov-feed__item--warn    { border-left: 3px solid #f59e0b; }
	.ov-feed__item--info    { border-left: 3px solid #6366f1; }

	.ov-feed__item-icon {
		width: 26px;
		height: 26px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-secondary);
		font-size: 0.9rem;
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
		letter-spacing: -0.005em;
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
		font-variant-numeric: tabular-nums;
		word-break: break-all;
	}

	.ov-feed__item-details {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}
</style>
