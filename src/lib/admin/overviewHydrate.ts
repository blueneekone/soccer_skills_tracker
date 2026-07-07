import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	type Firestore,
} from 'firebase/firestore';
import type {
	OverviewAuditEvent,
	OverviewChartPoint,
	OverviewHydrateResult,
} from '$lib/types/adminOverview.js';




const MOCK_MAU = [
	{ label: 'Jan', value: 1200 },
	{ label: 'Feb', value: 1350 },
	{ label: 'Mar', value: 1520 },
	{ label: 'Apr', value: 1800 },
	{ label: 'May', value: 2100 },
	{ label: 'Jun', value: 2450 },
];
const MOCK_REVENUE_BY_TIER = [
	{ label: 'Starter', value: 12500 },
	{ label: 'Pro', value: 28400 },
	{ label: 'Club', value: 45000 },
	{ label: 'Enterprise', value: 85000 },
];
const MOCK_PLAYERS_BY_SPORT = [
	{ label: 'Soccer', value: 14500 },
	{ label: 'Basketball', value: 8200 },
	{ label: 'Tennis', value: 4100 },
	{ label: 'Volleyball', value: 2300 },
];

const TIER_DEFS = [
	{ key: 'starter', label: 'Starter' },
	{ key: 'pro', label: 'Pro' },
	{ key: 'club', label: 'Club' },
	{ key: 'enterprise', label: 'Enterprise' },
	{ key: 'legacy', label: 'Legacy' },
] as const;

export function prettySportLabel(raw: unknown): string {
	const s = String(raw || '')
		.replace(/_/g, ' ')
		.trim();
	if (!s) return 'Unknown';
	return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildMauLabels(): { key: string; label: string }[] {
	const now = new Date();
	const out: { key: string; label: string }[] = [];
	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		out.push({ key, label: d.toLocaleString(undefined, { month: 'short' }) });
	}
	return out;
}

function hydrateMauSeries(totals: Record<string, unknown> | null): {
	series: OverviewChartPoint[];
} {
	const labels = buildMauLabels();
	let values: number[] = [];
	const raw = totals?.mau;

	if (Array.isArray(raw)) {
		const trimmed = raw.slice(-6);
		values = labels.map((_, i) => {
			const row = trimmed[i];
			if (row == null) return 0;
			const n = typeof row === 'number' ? row : Number((row as { value?: number })?.value);
			return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
		});
	} else if (raw && typeof raw === 'object') {
		const map = raw as Record<string, unknown>;
		values = labels.map(({ key }) => {
			const n = Number(map[key]);
			return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
		});
	}

	return {
		series: values.some((v) => v > 0) ? labels.map(({ label }, i) => ({ label, value: values[i] ?? 0 })) : MOCK_MAU,
	};
}

function hydrateRevenueByTier(totals: Record<string, unknown> | null): {
	series: OverviewChartPoint[];
} {
	const revenue: Record<string, number> = {};
	const raw = totals && (totals.revenueByTier || totals.revenue);
	if (raw && typeof raw === 'object') {
		for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
			const n = Number(value);
			if (!Number.isFinite(n) || n < 0) continue;
			revenue[String(key).toLowerCase()] = (revenue[String(key).toLowerCase()] || 0) + Math.round(n);
		}
	}

	const ordered = TIER_DEFS.map(({ key, label }) => ({
		label,
		value: Math.round(revenue[key] || 0),
	})).filter((s) => s.value > 0);

	return {
		series: ordered.length > 0 ? ordered : MOCK_REVENUE_BY_TIER,
	};
}

function hydratePlayersBySport(totals: Record<string, unknown> | null): {
	series: OverviewChartPoint[];
} {
	const bySport: Record<string, number> = {};
	const rawSport = totals?.bySport;
	if (rawSport && typeof rawSport === 'object') {
		for (const [key, value] of Object.entries(rawSport as Record<string, unknown>)) {
			const n = Number(value);
			if (!Number.isFinite(n) || n < 0) continue;
			const k = String(key).toLowerCase();
			bySport[k] = (bySport[k] || 0) + Math.round(n);
		}
	}

	const ordered = Object.entries(bySport)
		.map(([k, value]) => ({ label: prettySportLabel(k), value }))
		.filter((s) => s.value > 0)
		.sort((a, b) => b.value - a.value);

	return {
		series: ordered.length > 0 ? ordered : MOCK_PLAYERS_BY_SPORT,
	};
}

export async function loadSecurityAuditFeed(db: Firestore): Promise<{
	rows: OverviewAuditEvent[];
	err: string;
}> {
	try {
		const feedQ = query(collection(db, 'security_audit'), orderBy('timestamp', 'desc'), limit(12));
		const snap = await getDocs(feedQ);
		if (!snap) return { rows: [], err: '' };

		const rows: OverviewAuditEvent[] = [];
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
		return { rows, err: '' };
	} catch (e) {
		console.warn('[overview] security_audit load failed', e);
		return {
			rows: [],
			err: e instanceof Error ? e.message : 'Could not load audit log.',
		};
	}
}

/** Loads platform_totals + security_audit for the admin overview command center. */
export async function hydrateAdminOverview(db: Firestore): Promise<OverviewHydrateResult> {
	let totals: Record<string, unknown> | null = null;
	try {
		const totalsSnap = await getDoc(doc(db, 'analytics', 'platform_totals'));
		if (totalsSnap.exists()) totals = totalsSnap.data() || {};
	} catch (e) {
		console.warn('[overview] analytics/platform_totals read failed — using defaults', e);
	}

	const mau = hydrateMauSeries(totals);
	const revenue = hydrateRevenueByTier(totals);
	const sport = hydratePlayersBySport(totals);
	const feed = await loadSecurityAuditFeed(db);

	return {
		mauSeries: mau.series,
		revenueByTier: revenue.series,
		playersBySport: sport.series,
		liveFeed: feed.rows,
		feedErr: feed.err,
		executive: {
			mrr: Number(totals?.mrr) || 0,
			arr: Number(totals?.arr) || 0,
			activeOrgs: Number(totals?.activeOrgs) || 0,
			totalPlayers: Number(totals?.totalPlayers) || 0,
			wauMau: Number(totals?.wauMau) || 0,
			arpu: Number(totals?.arpu) || 0,
			grossRetention: Number(totals?.grossRetention) || 0,
			ltv: Number(totals?.ltv) || 0,
		},
		growth: {
			ltvCac: Number(totals?.ltvCac) || 0,
			churn: Number(totals?.churn) || 0,
			pipelineARR: Number(totals?.pipelineARR) || 0,
			paybackMo: Number(totals?.paybackMo) || 0,
		},
		platform: {
			apiLatency: Number(totals?.apiLatency) || 0,
			uptime: Number(totals?.uptime) || 0,
			dbReads: Number(totals?.dbReads) || 0,
			storage: Number(totals?.storage) || 0,
		},
		security: {
			wafBlocks: Number(totals?.wafBlocks) || 0,
			failedAuth: Number(totals?.failedAuth) || 0,
			mfaBypasses: Number(totals?.mfaBypasses) || 0,
			vettingPending: Number(totals?.vettingPending) || 0,
			flaggedOrgs: Number(totals?.flaggedOrgs) || 0,
			apiAbuse: Number(totals?.apiAbuse) || 0,
			privEscalation: Number(totals?.privEscalation) || 0,
			suspiciousIps: Number(totals?.suspiciousIps) || 0,
		},
		socRibbon: {
			mttr: Number(totals?.mttr) || 0,
			playbooks: Number(totals?.playbooks) || 0,
			detections: Number(totals?.detections) || 0,
			ingestLag: Number(totals?.ingestLag) || 0,
		},
	};
}
