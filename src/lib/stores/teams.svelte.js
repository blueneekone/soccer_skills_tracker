import { db } from '$lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

function createTeamsStore() {
	let clubs = $state([]);
	let teams = $state([]);
	let admins = $state([]);
	let loaded = $state(false);
	/** Avoid stale empty load before clubId is on profile (director/registrar). */
	let lastLoadKey = $state('');

	return {
		get clubs() {
			return clubs;
		},
		get teams() {
			return teams;
		},
		get admins() {
			return admins;
		},
		get loaded() {
			return loaded;
		},

		/**
		 * @param {string} role
		 * @param {{ clubId?: string, coachEmail?: string }} [opts]
		 */
		async load(role, opts = {}) {
			const clubId = opts.clubId || '';
			const coachEmail = opts.coachEmail || '';
			const key = `${role}|${clubId}|${coachEmail.toLowerCase()}`;
			if (loaded && lastLoadKey === key) return;

			try {
				const clubsSnap = await getDocs(collection(db, 'clubs'));
				clubs = [];
				clubsSnap.forEach((d) => clubs.push({ id: d.id, ...d.data() }));

				teams = [];
				if (role === 'super_admin') {
					const teamsSnap = await getDocs(collection(db, 'teams'));
					teamsSnap.forEach((d) => teams.push({ id: d.id, ...d.data() }));
				} else if ((role === 'director' || role === 'registrar') && clubId) {
					const teamsSnap = await getDocs(
						query(collection(db, 'teams'), where('clubId', '==', clubId))
					);
					teamsSnap.forEach((d) => teams.push({ id: d.id, ...d.data() }));
				} else if (role === 'coach' && coachEmail) {
					const em = coachEmail.toLowerCase();
					const [snapHead, snapAsst] = await Promise.all([
						getDocs(query(collection(db, 'teams'), where('coachEmail', '==', em))),
						getDocs(
							query(collection(db, 'teams'), where('assistants', 'array-contains', em))
						)
					]);
					const byId = new Map();
					snapHead.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
					snapAsst.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
					teams = Array.from(byId.values());
				}

				admins = [];
				if (role === 'super_admin') {
					const adminsSnap = await getDocs(
						query(collection(db, 'users'), where('role', '==', 'super_admin'))
					);
					adminsSnap.forEach((d) => admins.push(d.id));
				}

				lastLoadKey = key;
				loaded = true;
			} catch (err) {
				console.error('[teams store] load error:', err);
			}
		},

		/** Filter teams that a coach email manages (head or assistant) */
		getCoachTeams(email) {
			return teams.filter((t) => {
				const isHead = (t.coachEmail || '').toLowerCase() === email.toLowerCase();
				const isAsst = (t.assistants || []).some(
					(a) => (a || '').toLowerCase() === email.toLowerCase()
				);
				return isHead || isAsst;
			});
		}
	};
}

export const teamsStore = createTeamsStore();
