import { collection, getDocs, type Firestore } from 'firebase/firestore';
import { buildComplianceMap, type VpcRequestRow } from '$lib/admin/organizationsCompliance.js';
import { normalizeClubDocument, sortClubsByName } from '$lib/admin/organizationsNormalize.js';
import type { AdminOrganizationsLoadResult } from '$lib/types/adminOrganizations.js';

function mapVpcRows(
	snap: Awaited<ReturnType<typeof getDocs>>,
): VpcRequestRow[] {
	const rows: VpcRequestRow[] = [];
	snap.forEach((d) => {
		const data = d.data() as Record<string, unknown>;
		rows.push({
			clubId: typeof data.clubId === 'string' ? data.clubId : '',
			status: typeof data.status === 'string' ? data.status : '',
		});
	});
	return rows;
}

/** Loads all clubs + VPC compliance map for the organizations command center. */
export async function loadOrganizationsWithCompliance(
	db: Firestore,
): Promise<AdminOrganizationsLoadResult> {
	const [clubsSnap, vpcSnap] = await Promise.all([
		getDocs(collection(db, 'clubs')),
		getDocs(collection(db, 'vpc_requests')),
	]);

	const loaded = clubsSnap.docs.map((d) =>
		normalizeClubDocument(d.id, (d.data() || {}) as Record<string, unknown>),
	);

	return {
		clubs: sortClubsByName(loaded),
		complianceMap: buildComplianceMap(mapVpcRows(vpcSnap)),
	};
}
