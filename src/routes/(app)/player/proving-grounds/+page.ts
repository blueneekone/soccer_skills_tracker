import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** SURFACE-MERGE-BENCHMARKS — detached Proving Grounds merged into Train benchmark mode. */
export const load: PageServerLoad = () => {
	redirect(302, '/player/workout?mode=benchmark');
};
