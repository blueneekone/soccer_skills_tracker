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
	revenueByTier: OverviewChartPoint[];
	playersBySport: OverviewChartPoint[];
	liveFeed: OverviewAuditEvent[];
	feedErr: string;
	executive: {
		mrr: number;
		arr: number;
		activeOrgs: number;
		totalPlayers: number;
		wauMau: number;
		arpu: number;
		grossRetention: number;
		ltv: number;
	};
	growth: {
		ltvCac: number;
		churn: number;
		pipelineARR: number;
		paybackMo: number;
	};
	platform: {
		apiLatency: number;
		uptime: number;
		dbReads: number;
		storage: number;
	};
	security: {
		wafBlocks: number;
		failedAuth: number;
		mfaBypasses: number;
		vettingPending: number;
		flaggedOrgs: number;
		apiAbuse: number;
		privEscalation: number;
		suspiciousIps: number;
	};
	socRibbon: {
		mttr: number;
		playbooks: number;
		detections: number;
		ingestLag: number;
	};
};
