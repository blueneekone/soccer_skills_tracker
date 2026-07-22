import { authStore } from '$lib/stores/auth.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
import { deriveCoachClearanceStep } from '$lib/compliance/checkrCoachClearance.js';

export class DashboardEngine {
	get role() {
		return authStore.role;
	}

	get clearanceRequired() {
		return this.role === 'coach' || this.role === 'recruiter';
	}

	get isCleared() {
		return authStore.isCleared;
	}

	get userEmail() {
		return (authStore.user?.email || '').trim();
	}

	get clearanceStep() {
		return deriveCoachClearanceStep(
			/** @type {import('$lib/types/backgroundCheck.js').ClearanceDoc|undefined} */ (
				authStore.userProfile?.clearance
			)
		);
	}

	get clearanceContext() {
		return {
			uid: authStore.user?.uid || '',
			email: this.userEmail,
			getSessionTokenHeaders: async () => {
				const token = await authStore.user?.getIdToken();
				return { Authorization: `Bearer ${token}` };
			}
		};
	}

	get myTeams() {
		if (!teamsStore.loaded) return [];
		if (this.role === 'super_admin' || this.role === 'global_admin') return teamsStore.teams.slice();
		if (!this.userEmail) return [];
		return teamsStore.getCoachTeams(this.userEmail);
	}

	get effectiveTeamId() {
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && this.myTeams.some((t) => t.id === pivot)) return pivot;
		return this.myTeams[0]?.id ?? '';
	}

	get activeTeamRow() {
		return this.myTeams.find((t) => t.id === this.effectiveTeamId) ?? null;
	}

	get activeClubId() {
		return typeof this.activeTeamRow?.clubId === 'string' ? this.activeTeamRow.clubId : '';
	}

	get clubNameDisplay() {
		if (!this.activeClubId) return 'YOUR CLUB';
		const n = teamsStore.clubs.find((c) => c.id === this.activeClubId)?.name;
		return typeof n === 'string' && n.trim() ? n.trim().toUpperCase() : 'YOUR CLUB';
	}

	get teamNameDisplay() {
		return typeof this.activeTeamRow?.name === 'string' && this.activeTeamRow.name.trim()
			? this.activeTeamRow.name.trim().toUpperCase()
			: 'SELECT TEAM';
	}

	get nexusBadgeLetter() {
		return (this.clubNameDisplay.slice(0, 1) || 'A').toUpperCase();
	}

	get fieldLat() {
		return this.activeTeamRow?.fieldLat ?? 41.633;
	}

	get fieldLng() {
		return this.activeTeamRow?.fieldLng ?? -111.851;
	}

	get weatherCoords() {
		return `LAT ${Math.abs(this.fieldLat).toFixed(3)}° ${this.fieldLat >= 0 ? 'N' : 'S'}  ·  LON ${Math.abs(this.fieldLng).toFixed(3)}° ${this.fieldLng >= 0 ? 'E' : 'W'}`;
	}
}
