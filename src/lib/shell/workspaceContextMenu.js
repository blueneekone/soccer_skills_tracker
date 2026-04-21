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
		sections.push({
			title: 'QA · God mode',
			items: [
				{ id: 'ctx-qa-director', label: 'QA: Director View', href: '/director' },
				{ id: 'ctx-qa-coach', label: 'QA: Coach View', href: '/coach' },
				{ id: 'ctx-qa-registrar', label: 'QA: Registrar View', href: '/registrar' },
			],
		});
	}

	const clubId = typeof profile?.clubId === 'string' ? profile.clubId.trim() : '';
	// Director workspace: directors only (not super_admin — use Context Switcher + Admin for platform).
	if (clubId && role === 'director') {
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
	// Coach workspace: only when assigned to at least one team (head or assistant). No empty coach stubs.
	if (coachTeams.length > 0) {
		const coachItems = coachTeams.map((t) => {
			const tn = (typeof t.name === 'string' && t.name.trim()) || t.id;
			return {
				id: `ctx-coach-${t.id}`,
				label: `Coach · ${tn}`,
				href: '/coach?tab=roster',
			};
		});
		sections.push({ title: 'Teams', items: coachItems });
	}

	if (role === 'super_admin') {
		sections.push({
			title: 'Household',
			items: [{ id: 'ctx-athlete-stats', label: 'Athlete · Stats', href: '/stats' }],
		});
	} else if (role === 'parent') {
		sections.push({
			title: 'Household',
			items: [{ id: 'ctx-parent-portal', label: 'Parent · Household', href: '/parent/vpc' }],
		});
	} else if (role === 'player') {
		sections.push({
			title: 'Household',
			items: [{ id: 'ctx-player-stats', label: 'Player · Stats', href: '/stats' }],
		});
	}

	if (role === 'registrar') {
		sections.push({
			title: 'Registrar',
			items: [{ id: 'ctx-registrar', label: 'Registrar Workspace', href: '/registrar' }],
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
			items: [{ id: 'ctx-fallback-settings', label: 'Settings', href: '/settings' }],
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
 * @param {{ activeClubId?: string; activeTeamId?: string }} [scopeHint]
 */
export function getShellContextLabel(pathname, role, profile, clubs, teams, email, scopeHint) {
	const activeClub = (scopeHint?.activeClubId || '').trim();
	const activeTeam = (scopeHint?.activeTeamId || '').trim();

	if (pathname.startsWith('/admin')) {
		return { title: 'Super Admin · Platform', sub: 'Workspace' };
	}
	if (pathname.startsWith('/director')) {
		let cid = typeof profile?.clubId === 'string' ? profile.clubId.trim() : '';
		if (role === 'super_admin') {
			if (activeClub) cid = activeClub;
			else if (!cid || cid === 'admin') cid = clubs[0]?.id || '';
		}
		const cl = cid ? clubs.find((c) => c.id === cid) : null;
		const name = (cl && typeof cl.name === 'string' && cl.name.trim()) || cid || 'Club';
		return { title: `Director · ${name}`, sub: 'Workspace' };
	}
	if (pathname.startsWith('/coach')) {
		if (role === 'super_admin') {
			if (activeTeam) {
				const tm = teams.find((t) => t.id === activeTeam);
				const tn =
					(tm && typeof tm.name === 'string' && tm.name.trim()) || activeTeam || 'Team';
				return { title: `Coach · ${tn}`, sub: 'Workspace' };
			}
			if (teams.length === 1) {
				const tn = (typeof teams[0].name === 'string' && teams[0].name.trim()) || teams[0].id;
				return { title: `Coach · ${tn}`, sub: 'Workspace' };
			}
			if (teams.length > 1) {
				return { title: 'Coach · QA', sub: 'Workspace' };
			}
		}
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
		if (role === 'super_admin' && clubs.length > 0) {
			const cid = activeClub || clubs[0].id;
			const cl = clubs.find((c) => c.id === cid);
			const name = (cl && typeof cl.name === 'string' && cl.name.trim()) || cid || 'Club';
			return { title: `Registrar · ${name}`, sub: 'QA' };
		}
		return { title: 'Registrar Workspace', sub: 'Compliance' };
	}
	if (pathname.startsWith('/recruiter')) {
		return { title: 'Recruiter', sub: 'Workspace' };
	}
	if (pathname.startsWith('/stats')) {
		return { title: 'Player · Stats', sub: 'Workspace' };
	}
	if (pathname.startsWith('/settings')) {
		return { title: 'Settings', sub: 'Workspace' };
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
			return { title: 'Player · Stats', sub: 'Workspace' };
		case 'registrar':
			return { title: 'Registrar Workspace', sub: 'Compliance' };
		default:
			return { title: 'Workspace', sub: 'Console' };
	}
}
