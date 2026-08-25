import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const tab = url.searchParams.get('tab');
	if (tab) {
		if (['passports', 'compliance', 'clearance', 'households', 'household', 'coppa', 'retention'].includes(tab)) {
			const sub = tab === 'compliance' ? 'passports' : tab === 'household' ? 'households' : tab === 'retention' ? 'coppa' : tab;
			redirect(302, `/director/compliance-ops?tab=${sub}`);
		}
		if (['registrars', 'brand', 'comms', 'licenses', 'billing', 'sync'].includes(tab)) {
			const sub = tab;
			redirect(302, `/director/club-management?tab=${sub}`);
		}
		if (['mission-control', 'vanguard', 'playbook', 'tournaments', 'events', 'field', 'war-room', 'warRoom', 'teams', 'home'].includes(tab)) {
			const sub = tab === 'vanguard' || tab === 'home' ? 'mission-control' : tab === 'events' ? 'tournaments' : tab === 'warRoom' ? 'war-room' : tab;
			redirect(302, `/director/tactics-and-training?tab=${sub}`);
		}
	}
	redirect(302, '/director/compliance-ops');
};
