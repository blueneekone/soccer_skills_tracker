import { untrack } from 'svelte';
import { page } from '$app/state';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
import { db } from '$lib/firebase.js';
import type { IconName } from '$lib/icons/registry.js';

export const TACTICS_TRAINING_TABS = [
	{ id: 'mission-control', label: 'Mission Control', icon: 'data.activity' as IconName },
	{ id: 'playbook', label: 'Playbook', icon: 'data.target' as IconName },
	{ id: 'tournaments', label: 'Tournaments', icon: 'sys.calendar' as IconName },
	{ id: 'field', label: 'Field Ops', icon: 'sys.map-pin' as IconName },
	{ id: 'war-room', label: 'War Room', icon: 'action.edit' as IconName },
] as const;

export type TacticsTrainingTabId = typeof TACTICS_TRAINING_TABS[number]['id'];

export class TacticsTrainingEngine {
	clubId = $state('');
	activeTab = $state<TacticsTrainingTabId>('mission-control');

	constructor() {
		const t = page.url.searchParams.get('tab') as TacticsTrainingTabId;
		if (t && TACTICS_TRAINING_TABS.some((tab) => tab.id === t)) {
			this.activeTab = t;
		}

		$effect(() => {
			this.syncActiveTab();
		});

		$effect(() => {
			this.syncTargetClub();
		});
	}

	syncActiveTab() {
		if (!db || !authStore.isAuthenticated) return;
		const t = page.url.searchParams.get('tab') as TacticsTrainingTabId;
		if (!t || !TACTICS_TRAINING_TABS.some((tab) => tab.id === t)) return;
		untrack(() => {
			if (this.activeTab !== t) this.activeTab = t;
		});
	}

	syncTargetClub() {
		if (!db || !authStore.isAuthenticated) return;

		const prof = authStore.userProfile;
		const activeCtx = workspaceContextStore.activeClubId?.trim();
		const rawProfileId = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';

		let targetId = '';
		if (activeCtx && teamsStore.clubs.some((c) => c.id === activeCtx)) {
			targetId = activeCtx;
		} else if (rawProfileId && rawProfileId !== 'admin') {
			targetId = rawProfileId;
		} else if (teamsStore.clubs.length > 0) {
			targetId = teamsStore.clubs[0].id;
		} else {
			return;
		}

		untrack(() => {
			if (this.clubId !== targetId) this.clubId = targetId;
			if (workspaceContextStore.activeClubId !== targetId) {
				workspaceContextStore.setActiveClubId(targetId);
			}
		});
	}

	setActiveTab(tabId: TacticsTrainingTabId) {
		this.activeTab = tabId;
		if (browser) {
			untrack(() => {
				const url = new URL(window.location.href);
				url.searchParams.set('tab', tabId);
				void goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
			});
		}
	}

	get clubTeams() {
		return teamsStore.teams
			.filter((t) => t.clubId === this.clubId)
			.map((t) => ({ id: t.id, name: t.name }));
	}

	get clubLabel() {
		return teamsStore.clubs.find((c) => c.id === this.clubId)?.name || this.clubId || 'UNRESOLVED';
	}
}
