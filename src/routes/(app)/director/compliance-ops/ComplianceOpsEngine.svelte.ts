import { untrack } from 'svelte';
import { page } from '$app/state';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
import { db } from '$lib/firebase.js';
import type { IconName } from '$lib/icons/registry.js';

export const COMPLIANCE_OPS_TABS = [
	{ id: 'passports', label: 'Player Passports', icon: 'status.shield-check' as IconName },
	{ id: 'clearance', label: 'Staff Clearance', icon: 'status.verified' as IconName },
	{ id: 'households', label: 'Households', icon: 'nav.home' as IconName },
	{ id: 'coppa', label: 'COPPA', icon: 'status.shield-check' as IconName },
] as const;

export type ComplianceOpsTabId = typeof COMPLIANCE_OPS_TABS[number]['id'];

export class ComplianceOpsEngine {
	clubId = $state('');
	activeTab = $state<ComplianceOpsTabId>('passports');

	constructor() {
		const t = page.url.searchParams.get('tab') as ComplianceOpsTabId;
		if (t && COMPLIANCE_OPS_TABS.some((tab) => tab.id === t)) {
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
		const t = page.url.searchParams.get('tab') as ComplianceOpsTabId;
		if (!t || !COMPLIANCE_OPS_TABS.some((tab) => tab.id === t)) return;
		untrack(() => {
			if (this.activeTab !== t) this.activeTab = t;
		});
	}

	syncTargetClub() {
		if (!db || !authStore.isAuthenticated) return;
		if (!teamsStore.loaded || teamsStore.clubs.length === 0) return;

		const prof = authStore.userProfile;
		const activeCtx = workspaceContextStore.activeClubId?.trim();
		const rawProfileId = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';

		let targetId = '';
		if (activeCtx && teamsStore.clubs.some((c) => c.id === activeCtx)) {
			targetId = activeCtx;
		} else if (rawProfileId && rawProfileId !== 'admin') {
			targetId = rawProfileId;
		} else {
			targetId = teamsStore.clubs[0].id;
		}

		untrack(() => {
			if (this.clubId !== targetId) this.clubId = targetId;
			if (workspaceContextStore.activeClubId !== targetId) {
				workspaceContextStore.setActiveClubId(targetId);
			}
		});
	}

	setActiveTab(tabId: ComplianceOpsTabId) {
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
