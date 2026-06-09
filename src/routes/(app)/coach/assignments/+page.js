import { redirect } from '@sveltejs/kit';

/** Legacy route — Intent Engine lives at /coach/forge */
export function load() {
	redirect(308, '/coach/forge');
}
