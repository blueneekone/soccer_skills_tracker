import { db } from '$lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

function createWorkoutsStore() {
	let workouts = $state([]);

	return {
		get workouts() { return workouts; },
		get byType() {
			return (type) => workouts.filter((w) => w.type === type);
		},

		async loadForTeam(teamId) {
			if (!teamId) { workouts = []; return; }
			try {
				const q = query(collection(db, 'team_workouts'), where('teamId', '==', teamId));
				const snap = await getDocs(q);
				workouts = [];
				snap.forEach((d) => workouts.push({ id: d.id, ...d.data() }));
			} catch (err) {
				console.error('[workouts store] load error:', err);
				workouts = [];
			}
		}
	};
}

export const workoutsStore = createWorkoutsStore();
