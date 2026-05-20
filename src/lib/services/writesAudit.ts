/**
 * Architect review registry — read-modify-write patterns in writes.svelte.ts.
 * Do NOT auto-refactor flagged entries without explicit approval.
 */
export type WritesRmwFlag = {
	id: string;
	location: string;
	pattern: 'read-modify-write' | 'conditional-write';
	description: string;
	status: 'flagged-for-review' | 'accepted-with-server-backstop' | 'resolved';
	recommendation: string;
};

export const WRITES_RMW_FLAGS: readonly WritesRmwFlag[] = [
	{
		id: 'grit-daily-cap',
		location: 'commitGritAward',
		pattern: 'read-modify-write',
		description:
			'Former client getDocs + writeBatch daily-cap check migrated to triggerGritAwardUpdate ' +
			'(Firestore transaction on users.daily_grit_count).',
		status: 'resolved',
		recommendation:
			'No further action — daily cap is enforced server-side via triggerGritAwardUpdate.',
	},
] as const;
