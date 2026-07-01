/** Admin command center — chart series point. */
export type OverviewChartPoint = {
	label: string;
	value: number;
};

/** Live security audit row for the SOC feed. */
export type OverviewAuditEvent = {
	id: string;
	action: string;
	targetEmail: string;
	details: string;
	createdAt: Date | null;
};

/** Hydrated analytics payload for `/admin/overview`. */
export type OverviewHydrateResult = {
	mauSeries: OverviewChartPoint[];
	mauSource: 'live' | 'mock';
	revenueByTier: OverviewChartPoint[];
	revenueSource: 'live' | 'mock';
	playersBySport: OverviewChartPoint[];
	sportSource: 'live' | 'mock';
	liveFeed: OverviewAuditEvent[];
	feedErr: string;
	executive: { mrr: number, arr: number, mauTotal: number };
};
