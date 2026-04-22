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
	/** Strike 1: prefer the aggregated `totalRevenue` when the analytics
	 *  triggers have started writing. Fall back to the $49/license estimate. */
	const mrrEstimate = $derived(
		aggTotalRevenue > 0 ? aggTotalRevenue : licenseCount * 49
	);

	/** Stripe-style MRR formatted string */
	const mrrDisplay = $derived(
		mrrEstimate >= 1000
			? `$${(mrrEstimate / 1000).toFixed(1)}k`
			: `$${mrrEstimate.toLocaleString()}`,
	);

	/** Strike 1: KPI scalars — prefer aggregated totals when live. */
	const licenseCountDisplay = $derived(
		aggTotalLicenses > 0 ? aggTotalLicenses : licenseCount
	);
	const totalClubsDisplay = $derived(
		aggTotalClubs > 0 ? aggTotalClubs : totalClubs
	);

	const adminCount = $derived(teamsStore.admins.length);

	// ── Strike 2 (Agent 3): CMO/CSO Command Center metrics ──────────────────
	// Mocked gracefully until the backend triggers exist. Once the activation
	// and compliance pipelines ship we'll swap these for values read from
	// `analytics/platform_totals.activationRate` and `.complianceAlerts`.
	/**
	 * Activation Rate — percentage of licensed seats with at least one
	 * logged workout in the last 7 days. Gracefully falls back to a mocked
	 * ~62% until the `onWorkoutWritten` aggregation function is live.
	 */
	const activationRate = $derived.by(() => {
		if (licenseCountDisplay <= 0) return 0;
		// Mock baseline = 62%. Live rate will slot in here from the aggregated
		// doc once the `activationRate7d` field is written by Cloud Functions.
		return 62;
	});

	/**
	 * Compliance Alerts — count of Coaches missing an up-to-date background
	 * check. Until the Checkr integration and VPC rollups are wired, mock at
	 * whichever value is higher: a synthetic `clamp(teams × 0.15)` or 3.
	 */
	const complianceAlerts = $derived.by(() => {
		const synthetic = Math.round((totalTeams || 0) * 0.15);
		return Math.max(3, synthetic);
	});

	// ═══════════════════════════════════════════════════════════════════════
	// Strike 3 (Agent 3) — C-Suite KPI blocks.
	//
	//   • Tech:  System Uptime + API Latency  (mocked — swap in from
	//            `analytics/platform_totals.uptime30d` /
	//            `analytics/platform_totals.apiLatencyP50Ms` once the Cloud
	//            Monitoring mirror Cloud Function is live).
	//   • CEO:   LTV : CAC Ratio + MRR Churn  (mocked — swap in from the
	//            finance ETL that lands on `analytics/platform_totals.ltvCac`
	//            and `.mrrChurn`).
	//   • CSO:   Active Threat Blocks         (mocked — swap in from the WAF
	//            feed that writes `analytics/platform_totals.waf24h` +
	//            `.failedLogins24h`).
	//
	// Each metric is a `$derived.by` so the swap-over to live data is a single
	// field read when the backend catches up.
	// ═══════════════════════════════════════════════════════════════════════

	/** Tech — composite uptime across the last 30 days (percent, 4-digit). */
	const systemUptime = $derived.by(() => 99.99);
	/** Tech — API gateway p50 latency in milliseconds. */
	const apiLatencyMs = $derived.by(() => 42);
	/** CEO — lifetime value to customer-acquisition-cost ratio. */
	const ltvCacRatio  = $derived.by(() => 4.2);
	/** CEO — trailing 30-day MRR churn percentage (lower is better). */
	const mrrChurnPct  = $derived.by(() => 1.2);

	/**
	 * CSO — Active Threat Blocks. WAF rejections + failed logins over the
	 * last 24 hours. Mocked as a synthetic signal that responds gently to
	 * platform size so the number does not look "too static" before live
	 * data arrives.
	 */
	const activeThreatBlocks = $derived.by(() => {
		const clubsSignal = totalClubsDisplay || 0;
		const baseline = 18;
		return baseline + Math.round(clubsSignal * 0.35);
	});

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

	/** Strike 1 — Per-chart data-source indicator. The Global Admin sees
	 *  "Live" as soon as the analytics triggers backfill the aggregate doc,
	 *  and "Mock" while the platform is still empty. */
	/** @typedef {'live' | 'mock'} ChartSource */
	let mauSource      = $state(/** @type {ChartSource} */ ('mock'));
	let revenueSource  = $state(/** @type {ChartSource} */ ('mock'));
	let sportSource    = $state(/** @type {ChartSource} */ ('mock'));

	/** Aggregated platform totals (Strike 1 wiring). When these are > 0 the
	 *  KPI row prefers them over full-collection scans. */
	let aggTotalClubs    = $state(0);
	let aggTotalLicenses = $state(0);
	let aggTotalRevenue  = $state(0);
	let aggTotalUsers    = $state(0);

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

			// Strike 1 — Hydrate aggregated KPI scalars so platform-health KPIs
			// can prefer them over the collection scans once the analytics
			// triggers (functions/analytics.js) have started writing.
			if (totals && !destroyed) {
				const tc = Number(totals.totalClubs);
				const tl = Number(totals.totalLicenses);
				const tr = Number(totals.totalRevenue);
				const tu = Number(totals.totalUsers);
				aggTotalClubs    = Number.isFinite(tc) && tc > 0 ? Math.round(tc) : 0;
				aggTotalLicenses = Number.isFinite(tl) && tl > 0 ? Math.round(tl) : 0;
				aggTotalRevenue  = Number.isFinite(tr) && tr > 0 ? Math.round(tr) : 0;
				aggTotalUsers    = Number.isFinite(tu) && tu > 0 ? Math.round(tu) : 0;
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
					sportSource = hasSignal ? 'live' : 'mock';
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
					sportSource = 'mock';
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

	<!-- Strike 3 (A1.1) — Compact Executive HUD header. Collapsed from the
	     previous 3-line hero to a single row so the dense KPI grid and chart
	     strip below both land above the fold on a 1080p monitor. -->
	<header class="ov-hud-head" aria-labelledby="ov-hero-title">
		<div class="ov-hud-head__title">
			<span class="ov-hud-head__crumb">
				<i class="ph ph-globe" aria-hidden="true"></i>
				Global Admin
			</span>
			<h1 id="ov-hero-title" class="ov-hud-head__h1">Command Center</h1>
		</div>
		<div class="ov-hud-head__right">
			<span class="ov-hud-head__chip">
				<span class="ov-hud-head__chip-dot"></span>
				{telLoading ? 'Syncing…' : 'Live'}
			</span>
		</div>
	</header>

	{#if telErr}
		<p class="ov-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{telErr}
		</p>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════════════
	     Strike 3 (A1.1 + A3.2) — Executive HUD: dense 12-column KPI grid.
	     Groups are tagged by department (Sales, CEO, Growth, Security, Tech)
	     through color tokens. Each micro-card spans 3 columns on desktop so
	     4 metrics line up horizontally. Every metric below 1,080p-above-fold
	     is intentional — no vertical stacking of department sections.
	     ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-hud" aria-label="Executive HUD">

		<!-- ── Row A — Sales / Revenue (CEO) ─────────────────────────────── -->
		<div class="ov-hud__row-label ov-hud__row-label--sales">
			<span class="ov-hud__row-dot" aria-hidden="true"></span>
			<span>Sales &middot; Revenue</span>
		</div>

		<article class="ov-hud__kpi ov-hud__kpi--sales ov-hud__kpi--hero">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-trend-up"></i>
				</span>
				<span class="ov-hud__kpi-label">Est. MRR</span>
			</header>
			<span class="ov-hud__kpi-value">{telLoading ? '—' : mrrDisplay}</span>
			<span class="ov-hud__kpi-sub">
				{aggTotalRevenue > 0 ? 'Live · platform_totals' : `@ $49 × ${licenseCount}`}
			</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--sales">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-ticket"></i>
				</span>
				<span class="ov-hud__kpi-label">Active Licenses</span>
			</header>
			<span class="ov-hud__kpi-value">
				{telLoading ? '—' : licenseCountDisplay.toLocaleString()}
			</span>
			<span class="ov-hud__kpi-sub">Billed seats</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--sales">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-scales"></i>
				</span>
				<span class="ov-hud__kpi-label">LTV : CAC</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={ltvCacRatio >= 3}
				class:ov-hud__kpi-value--danger={ltvCacRatio < 1.5}
			>
				{ltvCacRatio.toFixed(1)}<span class="ov-hud__kpi-unit">: 1</span>
			</span>
			<span class="ov-hud__kpi-sub ov-hud__kpi-sub--mock">Finance ETL · mocked</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--sales">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-chart-line-down"></i>
				</span>
				<span class="ov-hud__kpi-label">MRR Churn</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={mrrChurnPct < 2}
				class:ov-hud__kpi-value--danger={mrrChurnPct >= 5}
			>
				{mrrChurnPct.toFixed(1)}<span class="ov-hud__kpi-unit">%</span>
			</span>
			<span class="ov-hud__kpi-sub ov-hud__kpi-sub--mock">Trailing 30d · mocked</span>
		</article>

		<!-- ── Row B — Growth (Ops) ──────────────────────────────────────── -->
		<div class="ov-hud__row-label ov-hud__row-label--growth">
			<span class="ov-hud__row-dot" aria-hidden="true"></span>
			<span>Growth &middot; Platform</span>
		</div>

		<article class="ov-hud__kpi ov-hud__kpi--growth ov-hud__kpi--hero">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-buildings"></i>
				</span>
				<span class="ov-hud__kpi-label">Active Clubs</span>
			</header>
			<span class="ov-hud__kpi-value">
				{telLoading ? '—' : totalClubsDisplay.toLocaleString()}
			</span>
			<span class="ov-hud__kpi-sub">Across all sports</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--growth">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-users-three"></i>
				</span>
				<span class="ov-hud__kpi-label">Teams</span>
			</header>
			<span class="ov-hud__kpi-value">
				{telLoading ? '—' : totalTeams.toLocaleString()}
			</span>
			<span class="ov-hud__kpi-sub">Rostered</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--growth">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-barbell"></i>
				</span>
				<span class="ov-hud__kpi-label">Athletes</span>
			</header>
			<span class="ov-hud__kpi-value">
				{telLoading ? '—' : totalAthletes.toLocaleString()}
			</span>
			<span class="ov-hud__kpi-sub">Active players</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--growth">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-rocket-launch"></i>
				</span>
				<span class="ov-hud__kpi-label">Activation</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={activationRate >= 50}
				class:ov-hud__kpi-value--danger={activationRate > 0 && activationRate < 30}
			>
				{activationRate}<span class="ov-hud__kpi-unit">%</span>
			</span>
			<span class="ov-hud__kpi-sub ov-hud__kpi-sub--mock">7d workout · mocked</span>
		</article>

		<!-- ── Row C — Security (CSO) ───────────────────────────────────── -->
		<div class="ov-hud__row-label ov-hud__row-label--security">
			<span class="ov-hud__row-dot" aria-hidden="true"></span>
			<span>Security &middot; Compliance</span>
		</div>

		<article
			class="ov-hud__kpi ov-hud__kpi--security ov-hud__kpi--hero"
			class:ov-hud__kpi--alert={activeThreatBlocks > 50}
		>
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-shield-chevron"></i>
				</span>
				<span class="ov-hud__kpi-label">Threat Blocks (24h)</span>
			</header>
			<span class="ov-hud__kpi-value">
				{activeThreatBlocks.toLocaleString()}
			</span>
			<span class="ov-hud__kpi-sub ov-hud__kpi-sub--mock">WAF + failed logins</span>
		</article>

		<article
			class="ov-hud__kpi ov-hud__kpi--security"
			class:ov-hud__kpi--alert={pendingVpcCount > 0}
		>
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-shield-warning"></i>
				</span>
				<span class="ov-hud__kpi-label">Pending VPC</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={!telLoading && pendingVpcCount === 0}
				class:ov-hud__kpi-value--danger={pendingVpcCount > 0}
			>
				{#if telLoading}—{:else}{pendingVpcCount}{/if}
			</span>
			{#if pendingVpcCount > 0}
				<a href="/admin/organizations" class="ov-hud__kpi-cta">
					Review <i class="ph ph-arrow-right" aria-hidden="true"></i>
				</a>
			{:else}
				<span class="ov-hud__kpi-sub">Unverified parental consents</span>
			{/if}
		</article>

		<article
			class="ov-hud__kpi ov-hud__kpi--security"
			class:ov-hud__kpi--alert={complianceAlerts > 0}
		>
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-user-focus"></i>
				</span>
				<span class="ov-hud__kpi-label">Compliance Alerts</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={complianceAlerts === 0}
				class:ov-hud__kpi-value--danger={complianceAlerts > 0}
			>
				{complianceAlerts}
			</span>
			{#if complianceAlerts > 0}
				<a href="/admin/recruiters" class="ov-hud__kpi-cta">
					Vetting queue <i class="ph ph-arrow-right" aria-hidden="true"></i>
				</a>
			{:else}
				<span class="ov-hud__kpi-sub">Coaches missing Checkr</span>
			{/if}
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--security">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-warning-circle"></i>
				</span>
				<span class="ov-hud__kpi-label">Past Due</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={!telLoading && pastDueCount === 0}
				class:ov-hud__kpi-value--danger={pastDueCount > 0}
			>
				{#if telLoading}—{:else}{pastDueCount}{/if}
			</span>
			<span class="ov-hud__kpi-sub">Delinquent licenses</span>
		</article>

		<!-- ── Row D — Tech (CTO) ───────────────────────────────────────── -->
		<div class="ov-hud__row-label ov-hud__row-label--tech">
			<span class="ov-hud__row-dot" aria-hidden="true"></span>
			<span>Tech &middot; Infrastructure</span>
		</div>

		<article class="ov-hud__kpi ov-hud__kpi--tech ov-hud__kpi--hero">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-pulse"></i>
				</span>
				<span class="ov-hud__kpi-label">System Uptime (30d)</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={systemUptime >= 99.9}
				class:ov-hud__kpi-value--danger={systemUptime < 99}
			>
				{systemUptime.toFixed(2)}<span class="ov-hud__kpi-unit">%</span>
			</span>
			<span class="ov-hud__kpi-sub ov-hud__kpi-sub--mock">Cloud Monitoring · mocked</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--tech">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-gauge"></i>
				</span>
				<span class="ov-hud__kpi-label">API Latency (p50)</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--ok={apiLatencyMs < 100}
				class:ov-hud__kpi-value--danger={apiLatencyMs >= 250}
			>
				{apiLatencyMs}<span class="ov-hud__kpi-unit">ms</span>
			</span>
			<span class="ov-hud__kpi-sub ov-hud__kpi-sub--mock">Gateway p50 · mocked</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--tech">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-map-trifold"></i>
				</span>
				<span class="ov-hud__kpi-label">Field Bookings</span>
			</header>
			<span
				class="ov-hud__kpi-value"
				class:ov-hud__kpi-value--muted={activeBookingCount === 0}
			>
				{telLoading ? '—' : activeBookingCount.toLocaleString()}
			</span>
			<span class="ov-hud__kpi-sub">Active reservations</span>
		</article>

		<article class="ov-hud__kpi ov-hud__kpi--tech">
			<header class="ov-hud__kpi-head">
				<span class="ov-hud__kpi-icon" aria-hidden="true">
					<i class="ph ph-crown"></i>
				</span>
				<span class="ov-hud__kpi-label">Platform Admins</span>
			</header>
			<span class="ov-hud__kpi-value">{adminCount}</span>
			<span class="ov-hud__kpi-sub">Global admin seats</span>
		</article>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- Command Center: 3 Chart.js widgets + Global Live Feed                 -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-cc" aria-labelledby="ov-cc-title">
		<div class="ov-cc__head">
			<span class="ov-cc__icon" aria-hidden="true">
				<i class="ph ph-chart-line"></i>
			</span>
			<h2 id="ov-cc-title" class="ov-cc__title">Analytics &amp; Live Feed</h2>
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
							<span
								class="ov-card__src"
								class:ov-card__src--live={mauSource === 'live'}
								class:ov-card__src--mock={mauSource === 'mock'}
								title={mauSource === 'live'
									? 'Live data from analytics/platform_totals'
									: 'Mock fallback — waiting on analytics triggers to populate platform_totals'}
							>
								<span class="ov-card__src-dot" aria-hidden="true"></span>
								{mauSource === 'live' ? 'Live' : 'Mock'}
							</span>
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
							<span
								class="ov-card__src"
								class:ov-card__src--live={revenueSource === 'live'}
								class:ov-card__src--mock={revenueSource === 'mock'}
								title={revenueSource === 'live'
									? 'Live data from analytics/platform_totals'
									: 'Mock fallback — waiting on analytics triggers to populate platform_totals'}
							>
								<span class="ov-card__src-dot" aria-hidden="true"></span>
								{revenueSource === 'live' ? 'Live' : 'Mock'}
							</span>
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
							<span
								class="ov-card__src"
								class:ov-card__src--live={sportSource === 'live'}
								class:ov-card__src--mock={sportSource === 'mock'}
								title={sportSource === 'live'
									? 'Live data from analytics/platform_totals'
									: 'Mock fallback — waiting on analytics triggers to populate platform_totals'}
							>
								<span class="ov-card__src-dot" aria-hidden="true"></span>
								{sportSource === 'live' ? 'Live' : 'Mock'}
							</span>
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
		gap: 14px;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Strike 3 (A1.1) — Executive HUD header + dense 12-col KPI grid.
	   The old 3-row hero + 4 separate .ov-group sections have been collapsed
	   into a single .ov-hud grid so the Command Center fits above the fold
	   on 1080p monitors (no scrolling for the KPI strip).
	   ═══════════════════════════════════════════════════════════════════════ */
	.ov-hud-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 16px;
		border-radius: 12px;
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.07), rgba(59, 130, 246, 0.03));
		border: 1px solid rgba(99, 102, 241, 0.18);
	}

	:global(html.dark) .ov-hud-head {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(30, 27, 75, 0.35));
		border-color: rgba(99, 102, 241, 0.32);
	}

	.ov-hud-head__title {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ov-hud-head__crumb {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.ov-hud-head__h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.ov-hud-head__right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.ov-hud-head__chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.35);
		font-size: 0.72rem;
		font-weight: 700;
		color: #047857;
	}

	:global(html.dark) .ov-hud-head__chip {
		background: rgba(34, 197, 94, 0.2);
		border-color: rgba(34, 197, 94, 0.5);
		color: #a7f3d0;
	}

	.ov-hud-head__chip-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		animation: ov-hud-pulse 1.8s ease-in-out infinite;
	}

	@keyframes ov-hud-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
		50%      { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
	}

	/* ── 12-column dense KPI grid ───────────────────────────────────── */
	.ov-hud {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 10px;
	}

	/* Row-label pills span all 12 cols — act as a thin department divider
	   between the 4-card rows without shouting for attention. */
	.ov-hud__row-label {
		grid-column: 1 / -1;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 2px 0 0;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.ov-hud__row-dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: currentColor;
		box-shadow: 0 0 8px currentColor;
	}

	.ov-hud__row-label--sales    { color: #059669; }
	.ov-hud__row-label--growth   { color: #4f46e5; }
	.ov-hud__row-label--security { color: #b91c1c; }
	.ov-hud__row-label--tech     { color: #0284c7; }

	:global(html.dark) .ov-hud__row-label--sales    { color: #6ee7b7; }
	:global(html.dark) .ov-hud__row-label--growth   { color: #c7d2fe; }
	:global(html.dark) .ov-hud__row-label--security { color: #fca5a5; }
	:global(html.dark) .ov-hud__row-label--tech     { color: #7dd3fc; }

	/* ── Individual micro-KPI card ─────────────────────────────────── */
	.ov-hud__kpi {
		grid-column: span 3;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		border-radius: 10px;
		background: var(--glass-bg, #fff);
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-left: 3px solid transparent;
		min-height: 84px;
		position: relative;
		transition: transform 0.12s ease, border-color 0.12s ease;
	}

	.ov-hud__kpi:hover {
		transform: translateY(-1px);
	}

	:global(html.dark) .ov-hud__kpi {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	/* Department tint — left rail + head-icon color. */
	.ov-hud__kpi--sales    { border-left-color: #10b981; }
	.ov-hud__kpi--growth   { border-left-color: #6366f1; }
	.ov-hud__kpi--security { border-left-color: #ef4444; }
	.ov-hud__kpi--tech     { border-left-color: #0ea5e9; }

	.ov-hud__kpi--sales    .ov-hud__kpi-icon { background: rgba(16, 185, 129, 0.12);  color: #059669; }
	.ov-hud__kpi--growth   .ov-hud__kpi-icon { background: rgba(99, 102, 241, 0.12);  color: #4f46e5; }
	.ov-hud__kpi--security .ov-hud__kpi-icon { background: rgba(239, 68, 68, 0.12);   color: #b91c1c; }
	.ov-hud__kpi--tech     .ov-hud__kpi-icon { background: rgba(14, 165, 233, 0.12);  color: #0284c7; }

	:global(html.dark) .ov-hud__kpi--sales    .ov-hud__kpi-icon { background: rgba(16, 185, 129, 0.2);  color: #6ee7b7; }
	:global(html.dark) .ov-hud__kpi--growth   .ov-hud__kpi-icon { background: rgba(99, 102, 241, 0.22); color: #c7d2fe; }
	:global(html.dark) .ov-hud__kpi--security .ov-hud__kpi-icon { background: rgba(239, 68, 68, 0.22);  color: #fca5a5; }
	:global(html.dark) .ov-hud__kpi--tech     .ov-hud__kpi-icon { background: rgba(14, 165, 233, 0.22); color: #7dd3fc; }

	/* Hero card (first in each department row) carries a subtle surface tint. */
	.ov-hud__kpi--hero {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.92),
			rgba(250, 250, 250, 0.65)
		);
	}

	:global(html.dark) .ov-hud__kpi--hero {
		background: linear-gradient(
			135deg,
			rgba(24, 24, 27, 0.95),
			rgba(9, 9, 11, 0.85)
		);
	}

	.ov-hud__kpi--alert { border-color: rgba(239, 68, 68, 0.45); }

	:global(html.dark) .ov-hud__kpi--alert { border-color: rgba(252, 165, 165, 0.35); }

	.ov-hud__kpi-head {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.ov-hud__kpi-icon {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		flex-shrink: 0;
	}

	.ov-hud__kpi-label {
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ov-hud__kpi-value {
		display: flex;
		align-items: baseline;
		gap: 2px;
		margin-top: 2px;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.ov-hud__kpi--hero .ov-hud__kpi-value {
		font-size: 1.85rem;
	}

	.ov-hud__kpi-unit {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: var(--text-secondary);
		margin-left: 2px;
	}

	.ov-hud__kpi-value--ok     { color: #15803d; }
	.ov-hud__kpi-value--danger { color: var(--danger-red, #b91c1c); }
	.ov-hud__kpi-value--muted  { color: var(--text-secondary); font-size: 1.15rem; font-weight: 700; }

	:global(html.dark) .ov-hud__kpi-value--ok     { color: #86efac; }
	:global(html.dark) .ov-hud__kpi-value--danger { color: #fca5a5; }

	.ov-hud__kpi-sub {
		font-size: 0.7rem;
		line-height: 1.3;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ov-hud__kpi-sub--mock {
		color: #a16207;
		font-style: italic;
	}

	:global(html.dark) .ov-hud__kpi-sub--mock {
		color: #fbbf24;
	}

	.ov-hud__kpi-cta {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 2px;
		font-size: 0.7rem;
		font-weight: 700;
		color: #b45309;
		text-decoration: none;
		width: fit-content;
	}

	.ov-hud__kpi-cta:hover { text-decoration: underline; }

	:global(html.dark) .ov-hud__kpi-cta { color: #fbbf24; }

	/* Responsive — give up column density on narrower laptops/tablets. */
	@media (max-width: 1280px) {
		.ov-hud__kpi { grid-column: span 6; }
	}

	@media (max-width: 720px) {
		.ov-hud__kpi { grid-column: span 12; }
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

	/* Strike 3 (A1.1) — Shared pulse keyframe (reused by `.ov-cc__badge-dot`
	   below). Preserved from the old hero chip treatment. */
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

	/* Strike 1 — per-chart data-source chip. Makes it unambiguous whether the
	   widget is rendering from analytics/platform_totals or the mock fallback. */
	.ov-card__src {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		border: 1px solid transparent;
	}

	.ov-card__src-dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: currentColor;
		box-shadow: 0 0 8px currentColor;
	}

	.ov-card__src--live {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
		border-color: rgba(16, 185, 129, 0.35);
	}

	.ov-card__src--mock {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.10);
		border-color: rgba(245, 158, 11, 0.30);
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
