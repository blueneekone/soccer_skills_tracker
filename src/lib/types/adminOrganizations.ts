import type { IconName } from '$lib/icons/registry.js';

/** Organization (club) row on the admin organizations command center. */
export type AdminClub = {
	id: string;
	name?: string;
	sport?: string;
	directorEmail?: string;
	isInfinite?: boolean;
	logoUrl?: string;
	createdAt?: unknown;
	verifiedAddress?: string;
	phoneNumber?: string;
	primaryFacility?: string;
	tier?: string;
	subscriptionTier?: string;
};

/** VPC compliance rollup for a club. */
export type AdminComplianceHealth = {
	status: 'clean' | 'watch' | 'risk' | 'na';
	total: number;
	verified: number;
};

export type AdminClubTierKey = 'enterprise' | 'club' | 'pro' | 'starter' | 'unassigned';

export type AdminVerificationStatus = 'verified' | 'pending';

export type AdminSportTabKey =
	| 'all'
	| 'soccer'
	| 'basketball'
	| 'baseball'
	| 'football'
	| 'volleyball'
	| 'hockey'
	| 'lacrosse'
	| 'generic';

export type AdminTierOption = {
	key: AdminClubTierKey;
	label: string;
	accent: string;
	icon: IconName;
};

export type AdminSportTab = {
	key: AdminSportTabKey;
	label: string;
	icon: IconName;
};

export type AdminClubLicenseMeta = {
	label: string;
	accent: string;
	icon: IconName;
};

/** Payload for provisioning a new organization. */
export type AdminAddClubInput = {
	clubId: string;
	clubName: string;
	sport: string;
	newSportMode: boolean;
	newSportName: string;
	newSportIcon: string;
	directorEmail: string;
	verifiedAddress: string;
	phoneNumber: string;
	primaryFacility: string;
};

export type AdminOrganizationsLoadResult = {
	clubs: AdminClub[];
	complianceMap: Map<string, AdminComplianceHealth>;
};

export type AdminOrganizationsFilterState = {
	search: string;
	sportTab: AdminSportTabKey;
	verification: 'all' | AdminVerificationStatus;
	states: string[];
	tiers: AdminClubTierKey[];
};
