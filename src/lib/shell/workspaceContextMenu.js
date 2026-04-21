/**
 * Build workspace / context switcher menu from auth + teams data.
 * @typedef {{ id: string; label: string; href: string }} WorkspaceMenuItem
 * @typedef {{ title: string; items: WorkspaceMenuItem[] }} WorkspaceMenuSection
 */

/**
 * @param {string} email
 * @param {Array<{ id: string; coachEmail?: string; assistants?: string[] }>} teams
 */
export function teamsWhereCoach(email, teams) {
	const em = (email || '').toLowerCase();
	return teams.filter((t) => {
		const head = (t.coachEmail || '').toLowerCase() === em;
		const asst =
			Array.isArray(t.assistants) &&
			t.assistants.some((a) => (a || '').toLowerCase() === em);
		return head || asst;
	});
}

/**
 * @param {object} params
 * @param {string} params.role
 * @param {Record<string, unknown> | null} params.profile
 * @param {string} params.email
 * @param {Array<{ id: string; name?: string }>} params.clubs
 * @param {Array<{ id: string; name?: string; coachEmail?: string; assistants?: string[] }>} params.teams
 * @returns {WorkspaceMenuSection[]}
 */
export function buildWorkspaceMenu({ role, profile, email, clubs, teams }) {
	/** @type {WorkspaceMenuSection[]} */
	const sections = [];

	if (role === 'super_admin') {
		sections.push({
			title: 'Platform',
			items: [{ id: 'ctx-platform-admin', label: 'Super Admin · Platform', href: '/admin' }],
		});
	}

	const clubId = typeof profile?.clubId === 'string' ? profile.clubId.trim() : '';
	if (clubId && (role === 'director' || role === 'super_admin')) {
		const cl = clubs.find((c) => c.id === clubId);
		const name = (cl && typeof cl.name === 'string' && cl.name.trim()) || clubId;
		sections.push({
			title: 'Clubs',
			items: [{ id: `ctx-director-${clubId}`, label: `Director · ${name}`, href: '/director?tab=home' }],
		});
	} else if (role === 'director' && !clubId) {
		sections.push({
			title: 'Clubs',
			items: [{ id: 'ctx-director-fallback', label: 'Director · Console', href: '/director?tab=home' }],
		});
	}

	const coachTeams = teamsWhereCoach(email, teams);
	if (role === 'coach' || role === 'super_admin' || role === 'director') {
		/** @type {WorkspaceMenuItem[]} */
		let coachItems = coachTeams.map((t) => {
			const tn = (typeof t.name === 'string' && t.name.trim()) || t.id;
			return {
				id: `ctx-coach-${t.id}`,
				label: `Coach · ${tn}`,
				href: '/coach?tab=roster',
			};
		});
		if (coachItems.length === 0 && role === 'coach') {
			coachItems = [{ id: 'ctx-coach-default', label: 'Coach · Console', href: '/coach?tab=roster' }];
		}
		if (coachItems.length > 0) {
			sections.push({ title: 'Teams', items: coachItems });
		}
	}

	if (role === 'super_admin') {
		sections.push({
			title: 'Household',
			items: [{ id: 'ctx-athlete-home', label: 'Athlete · Home', href: '/home' }],
		});
	} else if (role === 'parent') {
		sections.push({
			title: 'Household',
			items: [{ id: 'ctx-parent-portal', label: 'Parent · Household', href: '/parent/vpc' }],
		});
	} else if (role === 'player') {
		sections.push({
			title: 'Household',
			items: [{ id: 'ctx-player-home', label: 'Player · Home', href: '/home' }],
		});
	}

	if (role === 'registrar') {
		sections.push({
			title: 'Registrar',
			items: [{ id: 'ctx-registrar', label: 'Registrar · Console', href: '/registrar' }],
		});
	}

	if (role === 'director' || role === 'super_admin') {
		sections.push({
			title: 'Recruiting',
			items: [{ id: 'ctx-recruiter', label: 'Recruiter · Search', href: '/recruiter' }],
		});
	}

	if (sections.length === 0) {
		sections.push({
			title: 'Workspace',
			items: [{ id: 'ctx-fallback-home', label: 'Home', href: '/home' }],
		});
	}

	return sections.filter((s) => s.items.length > 0);
}

/**
 * Closed-state label for the switcher trigger.
 * @param {string} pathname
 * @param {string} role
 * @param {Record<string, unknown> | null} profile
 * @param {Array<{ id: string; name?: string }>} clubs
 * @param {Array<{ id: string; name?: string; coachEmail?: string; assistants?: string[] }>} teams
 * @param {string} email
 */
export function getShellContextLabel(pathname, role, profile, clubs, teams, email) {
	if (pathname.startsWith('/admin')) {
		return { title: 'Super Admin · Platform', sub: 'Workspace' };
	}
	if (pathname.startsWith('/director')) {
		const cid = typeof profile?.clubId === 'string' ? profile.clubId : '';
		const cl = cid ? clubs.find((c) => c.id === cid) : null;
		const name = (cl && typeof cl.name === 'string' && cl.name.trim()) || cid || 'Club';
		return { title: `Director · ${name}`, sub: 'Workspace' };
	}
	if (pathname.startsWith('/coach')) {
		const tid = typeof profile?.teamId === 'string' ? profile.teamId : '';
		if (tid && tid !== 'admin') {
			const tm = teams.find((t) => t.id === tid);
			const tn = (tm && typeof tm.name === 'string' && tm.name.trim()) || tid;
			return { title: `Coach · ${tn}`, sub: 'Workspace' };
		}
		const ct = teamsWhereCoach(email, teams);
		if (ct.length === 1) {
			const tn = (typeof ct[0].name === 'string' && ct[0].name.trim()) || ct[0].id;
			return { title: `Coach · ${tn}`, sub: 'Workspace' };
		}
		return { title: 'Coach', sub: 'Workspace' };
	}
	if (pathname.startsWith('/parent')) {
		return { title: 'Parent · Household', sub: 'Workspace' };
	}
	if (pathname.startsWith('/registrar')) {
		return { title: 'Registrar · Console', sub: 'Workspace' };
	}
	if (pathname.startsWith('/recruiter')) {
		return { title: 'Recruiter', sub: 'Workspace' };
	}

	switch (role) {
		case 'super_admin':
			return { title: 'Super Admin · Platform', sub: 'Workspace' };
		case 'director': {
			const cid = typeof profile?.clubId === 'string' ? profile.clubId : '';
			const cl = cid ? clubs.find((c) => c.id === cid) : null;
			const name = (cl && typeof cl.name === 'string' && cl.name.trim()) || cid || 'Club';
			return { title: `Director · ${name}`, sub: 'Workspace' };
		}
		case 'coach': {
			const tid = typeof profile?.teamId === 'string' ? profile.teamId : '';
			if (tid && tid !== 'admin') {
				const tm = teams.find((t) => t.id === tid);
				const tn = (tm && typeof tm.name === 'string' && tm.name.trim()) || tid;
				return { title: `Coach · ${tn}`, sub: 'Workspace' };
			}
			const ct = teamsWhereCoach(email, teams);
			if (ct.length === 1) {
				const tn = (typeof ct[0].name === 'string' && ct[0].name.trim()) || ct[0].id;
				return { title: `Coach · ${tn}`, sub: 'Workspace' };
			}
			return { title: 'Coach', sub: 'Workspace' };
		}
		case 'parent':
			return { title: 'Parent · Household', sub: 'Workspace' };
		case 'player':
			return { title: 'Player · Home', sub: 'Workspace' };
		case 'registrar':
			return { title: 'Registrar · Console', sub: 'Workspace' };
		default:
			return { title: 'Workspace', sub: 'Console' };
	}
}
