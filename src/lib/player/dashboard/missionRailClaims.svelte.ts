import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';
import {
	pickMissionRailTeamId,
	readTokenTeamId,
	refreshClaimsIfProfileTeamStale,
	refreshProfileIfClaimsTeamAhead,
} from '$lib/player/dashboard/missionRailAuth.js';

/** Watches profile vs JWT team scope; bumps nonce when claims or profile are refreshed (QA-142). */
export class MissionRailClaimsSync {
	claimsSyncNonce = $state(0);
	tokenTeamId = $state('');

	resolveTeamId(profileTeamId: string, workspaceTeamId = ''): string {
		return pickMissionRailTeamId(profileTeamId, workspaceTeamId, this.tokenTeamId);
	}

	watch(profileTeamId: string, profileClubId = '') {
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		let cancelled = false;
		if (!profileTeamId.trim()) {
			void readTokenTeamId().then((tid) => {
				if (!cancelled) this.tokenTeamId = tid;
			});
		} else {
			this.tokenTeamId = '';
		}
		if (!profileTeamId.trim() && !profileClubId.trim()) {
			return () => {
				cancelled = true;
			};
		}
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
		if (profileTeamId.trim()) return;
		let cancelled = false;
		void refreshProfileIfClaimsTeamAhead(profileTeamId).then((refreshed) => {
			if (refreshed && !cancelled) this.claimsSyncNonce += 1;
		});
		return () => {
			cancelled = true;
		};
	}
}
