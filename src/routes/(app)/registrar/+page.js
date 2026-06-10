import { redirect } from '@sveltejs/kit';

/** Epic 5.2 — legacy `/registrar` URL → Director compliance matrix. */
export function load() {
	throw redirect(302, '/director?tab=compliance');
}
