import { describe, it, expect } from 'vitest';
import { pickDirectorClubId } from '../pickDirectorClubId.js';

describe('pickDirectorClubId', () => {
	it('should return activeCtx if present and not admin', () => {
		const teamsStore = { loaded: false, clubs: [] };
		const authStore = { userProfile: { clubId: 'profile-club' } };
		const workspaceContextStore = { activeClubId: ' active-club ' };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('active-club');
	});

	it('should return rawProfileId if activeCtx is missing and profileId is not admin', () => {
		const teamsStore = { loaded: false, clubs: [] };
		const authStore = { userProfile: { clubId: ' profile-club ' } };
		const workspaceContextStore = { activeClubId: null };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('profile-club');
	});

	it('should return rawProfileId if activeCtx is admin', () => {
		const teamsStore = { loaded: false, clubs: [] };
		const authStore = { userProfile: { clubId: 'profile-club' } };
		const workspaceContextStore = { activeClubId: 'admin' };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('profile-club');
	});

	it('should return empty string if no valid context/profile and teamsStore is not loaded', () => {
		const teamsStore = { loaded: false, clubs: [{ id: 'club1' }] };
		const authStore = { userProfile: null };
		const workspaceContextStore = { activeClubId: null };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('');
	});

	it('should return empty string if no valid context/profile and teamsStore has no clubs', () => {
		const teamsStore = { loaded: true, clubs: [] };
		const authStore = { userProfile: null };
		const workspaceContextStore = { activeClubId: null };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('');
	});

	it('should fallback to first club in teamsStore if context/profile are missing/admin', () => {
		const teamsStore = { loaded: true, clubs: [{ id: 'club1' }, { id: 'club2' }] };
		const authStore = { userProfile: { clubId: 'admin' } };
		const workspaceContextStore = { activeClubId: 'admin' };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('club1');
	});

	it('should return admin if activeCtx is admin and a club with id admin exists in teamsStore', () => {
		const teamsStore = { loaded: true, clubs: [{ id: 'admin' }] };
		const authStore = { userProfile: null };
		const workspaceContextStore = { activeClubId: 'admin' };

		const result = pickDirectorClubId(teamsStore, authStore, workspaceContextStore);
		expect(result).toBe('admin');
	});
});
