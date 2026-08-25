import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** SURFACE-MERGE-BENCHMARKS — detached Proving Grounds merged into Train benchmark mode. */
export const GET: RequestHandler = () => {
	redirect(302, '/player/workout?mode=benchmark');
};
