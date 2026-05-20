/** Base operative row from household Firestore document arrays. */
export type HouseholdOperativeBase = {
	email: string;
	name: string;
	callsign: string;
};

/** Enriched operative row shown on the household clearance page. */
export type HouseholdOperativeRow = HouseholdOperativeBase & {
	loginCallsign: string;
	dispatchCode: string;
	pendingGamertag: string | null;
	gamertagChangesLeft: number;
	hudErr: string;
};
