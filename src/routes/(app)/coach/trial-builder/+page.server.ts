import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** SURFACE-MERGE-TRIAL-EVAL — detached Trial Builder merged into Scouting roster eval tab. */
export const load: PageServerLoad = () => {
	redirect(302, '/coach/scouting?tab=roster-eval');
};
