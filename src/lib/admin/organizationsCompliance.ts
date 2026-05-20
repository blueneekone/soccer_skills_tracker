import type { AdminComplianceHealth } from '$lib/types/adminOrganizations.js';

export type VpcRequestRow = {
	clubId: string;
	status: string;
};

/** Aggregates VPC request rows into per-club compliance health. */
export function buildComplianceMap(rows: VpcRequestRow[]): Map<string, AdminComplianceHealth> {
	const raw = new Map<string, { total: number; verified: number }>();

	for (const row of rows) {
		if (!row.clubId) continue;
		const existing = raw.get(row.clubId) ?? { total: 0, verified: 0 };
		existing.total += 1;
		if (row.status === 'approved') existing.verified += 1;
		raw.set(row.clubId, existing);
	}

	const cm = new Map<string, AdminComplianceHealth>();
	raw.forEach((v, clubId) => {
		const pct = v.total > 0 ? v.verified / v.total : 0;
		let status: AdminComplianceHealth['status'];
		if (pct >= 1) status = 'clean';
		else if (pct >= 0.5) status = 'watch';
		else status = 'risk';
		cm.set(clubId, { status, total: v.total, verified: v.verified });
	});

	return cm;
}
