import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';
import { refreshClaimsIfProfileTeamStale } from '$lib/player/dashboard/missionRailAuth.js';

/** Watches profile vs JWT team scope; bumps nonce when claims are refreshed (QA-142). */
export class MissionRailClaimsSync {
	claimsSyncNonce = $state(0);

	watch(profileTeamId: string) {
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		if (!profileTeamId) return;
		let cancelled = false;
		void refreshClaimsIfProfileTeamStale(profileTeamId).then((refreshed) => {
			if (refreshed && !cancelled) this.claimsSyncNonce += 1;
		});
		return () => {
			cancelled = true;
		};
	}
}
