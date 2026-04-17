import { db } from '$lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

function createTeamsStore() {
	let clubs = $state([]);
	let teams = $state([]);
	let admins = $state([]);
	let loaded = $state(false);

	return {
		get clubs() { return clubs; },
		get teams() { return teams; },
		get admins() { return admins; },
		get loaded() { return loaded; },

		async load(role) {
			try {
				const clubsSnap = await getDocs(collection(db, 'clubs'));
				clubs = [];
				clubsSnap.forEach((d) => clubs.push({ id: d.id, ...d.data() }));

				const teamsSnap = await getDocs(collection(db, 'teams'));
				teams = [];
				teamsSnap.forEach((d) => teams.push({ id: d.id, ...d.data() }));

				admins = [];
				if (role === 'super_admin') {
					const adminsSnap = await getDocs(
						query(collection(db, 'users'), where('role', '==', 'super_admin'))
					);
					adminsSnap.forEach((d) => admins.push(d.id));
				}

				loaded = true;
			} catch (err) {
				console.error('[teams store] load error:', err);
			}
		},

		/** Filter teams that a coach email manages (head or assistant) */
		getCoachTeams(email) {
			return teams.filter((t) => {
				const isHead = (t.coachEmail || '').toLowerCase() === email.toLowerCase();
				const isAsst = (t.assistants || []).some((a) => (a || '').toLowerCase() === email.toLowerCase());
				return isHead || isAsst;
			});
		}
	};
}

export const teamsStore = createTeamsStore();
