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
	const activeCtx = workspaceContextStore.activeClubId?.trim();
	const rawProfileId =
		typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '';

	// Keep a stable tenant id while club catalog hydrates or briefly clears during reload.
	if (activeCtx && activeCtx !== 'admin') return activeCtx;
	if (rawProfileId && rawProfileId !== 'admin') return rawProfileId;

	if (!teamsStore.loaded || teamsStore.clubs.length === 0) return '';

	if (activeCtx && teamsStore.clubs.some((c) => c.id === activeCtx)) return activeCtx;
	if (rawProfileId && rawProfileId !== 'admin') return rawProfileId;
	return teamsStore.clubs[0]?.id ?? '';
}
