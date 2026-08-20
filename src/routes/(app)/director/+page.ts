import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const tab = url.searchParams.get('tab');
	if (tab) {
		redirect(302, `/director/dashboard?tab=${tab}`);
	}
	redirect(302, '/director/dashboard');
};
