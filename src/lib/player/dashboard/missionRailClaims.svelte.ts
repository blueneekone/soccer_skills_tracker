import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';
import {
	pickMissionRailTeamId,
	readTokenClubId,
	readTokenTeamId,
	refreshClaimsIfProfileTeamStale,
	refreshProfileIfClaimsTeamAhead,
	refreshProfileIfClaimsTeamMismatch,
} from '$lib/player/dashboard/missionRailAuth.js';

/** Watches profile vs JWT team scope; bumps nonce when claims or profile are refreshed (QA-142). */
export class MissionRailClaimsSync {
	claimsSyncNonce = $state(0);
	tokenTeamId = $state('');
	tokenClubId = $state('');

	resolveTeamId(profileTeamId: string, workspaceTeamId = ''): string {
		return pickMissionRailTeamId(profileTeamId, workspaceTeamId, this.tokenTeamId);
	}

	watch(profileTeamId: string, profileClubId = '') {
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		let cancelled = false;
		void Promise.all([readTokenTeamId(), readTokenClubId()]).then(([tid, cid]) => {
			if (!cancelled) {
				this.tokenTeamId = tid;
				this.tokenClubId = cid;
			}
		});
		void refreshClaimsIfProfileTeamStale(profileTeamId, profileClubId).then((refreshed) => {
			if (refreshed && !cancelled) this.claimsSyncNonce += 1;
		});
		return () => {
			cancelled = true;
		};
	}

	/** When JWT has teamId but profile doc is stale, reload profile so mission rail can subscribe. */
	watchClaimsAheadOfProfile(profileTeamId: string) {
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		let cancelled = false;
		const run = async () => {
			const ahead = await refreshProfileIfClaimsTeamAhead(profileTeamId);
			if (ahead && !cancelled) {
				this.claimsSyncNonce += 1;
				return;
			}
			const mismatch = await refreshProfileIfClaimsTeamMismatch(profileTeamId);
			if (mismatch && !cancelled) this.claimsSyncNonce += 1;
		};
		void run();
		return () => {
			cancelled = true;
		};
	}
}
