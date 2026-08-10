import { getActiveDb } from '$lib/firebase.js';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';

/**
 * Tenancy: teams are scoped by Firestore queries — never load the full `teams` collection
 * except `admin_full` (Super Admin on /admin). Coach assignment uses `coachEmail` + `assistants[]`
 * (canonical in this codebase; add `coachUid` queries when the schema adds them).
 *
 * @typedef {'admin_full' | 'club' | 'coach' | 'setup' | 'none'} TeamsLoadScope
 */

function createTeamsStore() {
	let clubs = $state([]);
	let teams = $state([]);
	let admins = $state([]);
	let loaded = $state(false);
	/** Avoid stale empty load before clubId is on profile (director/registrar). */
	let lastLoadKey = $state('');

	/**
	 * @param {string} em
	 * @param {string} clubId
	 */
	async function loadTeamsForCoachEmail(em, clubId) {
		const head = em.toLowerCase();
		const db = getActiveDb();
		if (!db) return [];
		
		const queries = [];
		// Fetch all teams for the coach by email or assistants array.
		// We do NOT include clubId in the query to avoid requiring a composite index.
		queries.push(getDocs(query(collection(db, 'teams'), where('coachEmail', '==', head))).catch(e => { console.error('Error fetching teams by coachEmail', e); return []; }));
		queries.push(getDocs(query(collection(db, 'teams'), where('assistants', 'array-contains', head))).catch(e => { console.error('Error fetching teams by assistants', e); return []; }));
		
		// Fallback: check user's profile for explicit teamId assignment (handles alias mismatches)
		queries.push(
			getDocs(query(collection(db, 'users'), where('emailLower', '==', head))).then(async (userSnap) => {
				if (!userSnap.empty) {
					const data = userSnap.docs[0].data();
					if (data.teamId) {
						const tSnap = await getDoc(doc(db, 'teams', data.teamId));
						if (tSnap.exists()) {
							return [{ id: tSnap.id, data: () => tSnap.data() }];
						}
					}
				}
				return [];
			}).catch(() => [])
		);
		
		const snaps = await Promise.all(queries);
		const byId = new Map();
		for (const snap of snaps) {
			snap.forEach((d) => {
				const data = typeof d.data === 'function' ? d.data() : d;
				if (clubId && data.clubId !== clubId) return;
				byId.set(d.id, { id: d.id, ...data });
			});
		}
		return Array.from(byId.values());
	}

	/**
	 * Clubs the user may label in UI — only clubs attached to loaded teams (coach scope),
	 * or the single club for director/registrar, or full list for admin.
	 * @param {TeamsLoadScope} scope
	 * @param {Array<{ id: string, clubId?: string }>} teamRows
	 * @param {string} clubId
	 */
	async function loadClubsForScope(scope, teamRows, clubId) {
		const db = getActiveDb();
		if (!db) return [];
		
		if (scope === 'admin_full') {
			const clubsSnap = await getDocs(collection(db, 'clubs'));
			const out = [];
			clubsSnap.forEach((d) => out.push({ id: d.id, ...d.data() }));
			return out;
		}
		if (scope === 'club' && clubId) {
			const c = await getDoc(doc(db, 'clubs', clubId));
			return c.exists() ? [{ id: c.id, ...c.data() }] : [];
		}
		if (scope === 'coach' || scope === 'none') {
			const ids = [...new Set(teamRows.map((t) => t.clubId).filter(Boolean))];
			const out = [];
			for (const id of ids) {
				const c = await getDoc(doc(db, 'clubs', id));
				if (c.exists()) out.push({ id: c.id, ...c.data() });
			}
			return out;
		}
		if (scope === 'setup') {
			// Deprecated: parent /setup uses listJoinableClubs callable (tenant rules block client reads).
			return [];
		}
		return [];
	}

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
		 * @param {{ clubId?: string, coachEmail?: string, scope?: TeamsLoadScope, routePath?: string }} [opts]
		 */
		async load(role, opts = {}) {
			const clubId = (opts.clubId || '').trim();
			const coachEmail = opts.coachEmail || '';
			/** @type {TeamsLoadScope} */
			let scope = opts.scope || 'none';

			// Exclude routePath from key so navigating within the same scope (e.g. /coach/dashboard -> /coach/logistics)
			// uses the already loaded teams array, preventing duplicate Firestore fetches and race conditions.
			const key = `${role}|${scope}|${clubId}|${coachEmail.toLowerCase()}`;
			if (loaded && lastLoadKey === key) return;
			if (!isFirestoreReady()) return;

			try {
				let nextTeams = [];
				let nextClubs = [];
				let nextAdmins = [];

				if (scope === 'setup') {
					nextClubs = await loadClubsForScope('setup', [], '');
					clubs = nextClubs;
					teams = [];
					admins = [];
					lastLoadKey = key;
					loaded = true;
					return;
				}

				if (scope === 'admin_full' && (role === 'super_admin' || role === 'global_admin')) {
					const db = getActiveDb();
					if (!db) return;
					const teamsSnap = await getDocs(collection(db, 'teams'));
					teamsSnap.forEach((d) => nextTeams.push({ id: d.id, ...d.data() }));
					nextClubs = await loadClubsForScope('admin_full', nextTeams, '');
				} else if (
					scope === 'club' &&
					clubId &&
					(role === 'director' ||
						role === 'registrar' ||
						role === 'super_admin' ||
						role === 'global_admin')
				) {
					const db = getActiveDb();
					if (!db) return;
					const teamsSnap = await getDocs(
						query(collection(db, 'teams'), where('clubId', '==', clubId)),
					);
					teamsSnap.forEach((d) => nextTeams.push({ id: d.id, ...d.data() }));
					nextClubs = await loadClubsForScope('club', nextTeams, clubId);
				} else if (coachEmail && (scope === 'coach' || role === 'coach')) {
					nextTeams = await loadTeamsForCoachEmail(coachEmail, clubId);
					nextClubs = await loadClubsForScope('coach', nextTeams, clubId);
				}

				if (scope === 'admin_full' && (role === 'super_admin' || role === 'global_admin')) {
					const db = getActiveDb();
					if (!db) return;
					const adminsSnap = await getDocs(
						query(collection(db, 'users'), where('role', 'in', ['super_admin', 'global_admin'])),
					);
					adminsSnap.forEach((d) => nextAdmins.push(d.id));
				}

				teams = nextTeams;
				clubs = nextClubs;
				admins = nextAdmins;
				
				lastLoadKey = key;
				loaded = true;
			} catch (err) {
				console.error('[teams store] load error:', err);
				loaded = true;
			}
		},

		/** Force next load() to run (e.g. after admin edits org structure). */
		invalidate() {
			lastLoadKey = '';
		},

		/** After sign-out: drop cached org data so the next login cannot see prior tenant rows. */
		clearSession() {
			teams = [];
			clubs = [];
			admins = [];
			loaded = false;
			lastLoadKey = '';
		},

		/** Filter teams that a coach email manages (head or assistant) */
		getCoachTeams(email) {
			return teams.filter((t) => {
				const isHead = (t.coachEmail || '').toLowerCase() === email.toLowerCase();
				const isAsst = (t.assistants || []).some(
					(a) => (a || '').toLowerCase() === email.toLowerCase(),
				);
				return isHead || isAsst;
			});
		},
	};
}

export const teamsStore = createTeamsStore();

/**
 * Route-driven scope so Coach never sees full `teams` unless Super Admin is on /admin.
 * @param {string} pathname
 * @param {string} role
 * @returns {TeamsLoadScope}
 */
export function resolveTeamsLoadScope(pathname, role) {
	if (pathname.startsWith('/admin')) return 'admin_full';
	if (pathname.startsWith('/setup')) return 'setup';
	/** Global Admin QA: load full org catalog on staff dashboards (no club/team on profile). */
	if (
		(role === 'super_admin' || role === 'global_admin') &&
		(pathname.startsWith('/director') || pathname.startsWith('/coach'))
	) {
		return 'admin_full';
	}
	if (pathname.startsWith('/director')) return 'club';
	if (pathname.startsWith('/coach')) {
		if (role === 'director' || role === 'registrar') return 'club';
		return 'coach';
	}
	if (pathname.startsWith('/recruiter')) return 'none';
	if (role === 'director' || role === 'registrar') return 'club';
	if (role === 'coach') return 'coach';
	if (role === 'super_admin' || role === 'global_admin') {
		return pathname.startsWith('/admin') ? 'admin_full' : 'coach';
	}
	return 'none';
}
