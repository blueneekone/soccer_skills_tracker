import { db } from '$lib/firebase.js';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

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
	 */
	async function loadTeamsForCoachEmail(em) {
		const head = em.toLowerCase();
		const [snapHead, snapAsst] = await Promise.all([
			getDocs(query(collection(db, 'teams'), where('coachEmail', '==', head))),
			getDocs(query(collection(db, 'teams'), where('assistants', 'array-contains', head))),
		]);
		const byId = new Map();
		snapHead.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
		snapAsst.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
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
			const routePath = (opts.routePath || '').trim();
			/** @type {TeamsLoadScope} */
			let scope = opts.scope || 'none';

			const key = `${role}|${scope}|${clubId}|${coachEmail.toLowerCase()}|${routePath}`;
			if (loaded && lastLoadKey === key) return;

			try {
				teams = [];
				clubs = [];

				if (scope === 'setup') {
					clubs = await loadClubsForScope('setup', [], '');
					teams = [];
					admins = [];
					lastLoadKey = key;
					loaded = true;
					return;
				}

				if (scope === 'admin_full' && (role === 'super_admin' || role === 'global_admin')) {
					const teamsSnap = await getDocs(collection(db, 'teams'));
					teamsSnap.forEach((d) => teams.push({ id: d.id, ...d.data() }));
					clubs = await loadClubsForScope('admin_full', teams, '');
				} else if (
					scope === 'club' &&
					clubId &&
					(role === 'director' ||
						role === 'registrar' ||
						role === 'super_admin' ||
						role === 'global_admin')
				) {
					const teamsSnap = await getDocs(
						query(collection(db, 'teams'), where('clubId', '==', clubId)),
					);
					teamsSnap.forEach((d) => teams.push({ id: d.id, ...d.data() }));
					clubs = await loadClubsForScope('club', teams, clubId);
				} else if (coachEmail && (scope === 'coach' || role === 'coach')) {
					teams = await loadTeamsForCoachEmail(coachEmail);
					clubs = await loadClubsForScope('coach', teams, clubId);
				}

				admins = [];
				if (scope === 'admin_full' && (role === 'super_admin' || role === 'global_admin')) {
					const adminsSnap = await getDocs(
						query(collection(db, 'users'), where('role', 'in', ['super_admin', 'global_admin'])),
					);
					adminsSnap.forEach((d) => admins.push(d.id));
				}

				lastLoadKey = key;
				loaded = true;
			} catch (err) {
				console.error('[teams store] load error:', err);
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
	if (pathname.startsWith('/coach')) return 'coach';
	if (pathname.startsWith('/recruiter')) return 'none';
	if (role === 'director' || role === 'registrar') return 'club';
	if (role === 'coach') return 'coach';
	if (role === 'super_admin' || role === 'global_admin') {
		return pathname.startsWith('/admin') ? 'admin_full' : 'coach';
	}
	return 'none';
}
