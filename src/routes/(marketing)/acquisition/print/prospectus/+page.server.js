import { loadAcquisitionPrintMeta } from '$lib/components/marketing/acquisition/acquisitionPrintMeta.server.js';

export const prerender = true;

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return loadAcquisitionPrintMeta();
}
