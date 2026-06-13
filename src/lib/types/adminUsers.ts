/** RBAC segment tabs on the global users command center. */
export type GlobalUsersTab = 'admins' | 'directors' | 'coaches' | 'parents_players';

/** Row in the global users DataTable. */
export type GlobalUserRow = {
	id: string;
	email: string;
	displayName: string;
	playerName: string;
	role: string;
	clubId: string;
	teamId: string;
	lastActiveAt: number;
	lastActiveSource: string;
	photoURL: string;
	status?: string;
	uid?: string;
	roles?: string[];
	/** users.householdId when set */
	householdId?: string;
	/** users.vpcStatus for minors */
	vpcStatus?: string | null;
	/** Enriched one-line parent↔athlete graph (admin users page). */
	householdGraphLabel?: string;
};

export type GlobalUsersRoleFilter =
	| { kind: 'eq'; value: string }
	| { kind: 'in'; values: string[] };

export type GlobalUsersPageResult = {
	rows: GlobalUserRow[];
	hasNextPage: boolean;
};
