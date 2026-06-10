/**
 * Resolve effective clubId for Director OS surfaces.
 * Priority: context switcher → profile clubId → first loaded club.
 *
 * @param {{ loaded: boolean, clubs: Array<{ id: string }> }} teamsStore
 * @param {{ userProfile?: { clubId?: string } | null }} authStore
 * @param {{ activeClubId?: string | null }} workspaceContextStore
 * @returns {string}
 */
export function pickDirectorClubId(teamsStore, authStore, workspaceContextStore) {
	if (!teamsStore.loaded || teamsStore.clubs.length === 0) return '';

	const activeCtx = workspaceContextStore.activeClubId?.trim();
	const rawProfileId =
		typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '';

	if (activeCtx && teamsStore.clubs.some((c) => c.id === activeCtx)) return activeCtx;
	if (rawProfileId && rawProfileId !== 'admin') return rawProfileId;
	return teamsStore.clubs[0]?.id ?? '';
}
