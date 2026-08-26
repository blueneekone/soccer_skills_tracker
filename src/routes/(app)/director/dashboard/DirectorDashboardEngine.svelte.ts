import { untrack } from 'svelte';
import { page } from '$app/state';
import { authStore } from '$lib/stores/auth.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

export const VALID_DIR_TABS = new Set([
	'home', 'teams', 'field', 'comms', 'registrars', 'brand', 'playbook', 'licenses', 'compliance', 'household',
	'vanguard',   // EPIC 4 — Director Mission Control
	'retention',  // EPIC 6 — PII Burn Protocol compliance dashboard
	'sync',       // Data Sync & Importer
]);

export class DirectorDashboardEngine {
	clubId = $state('');
	activeTab = $state('home');

	constructor() {
		// Initialize activeTab from URL search params
		const t = page.url.searchParams.get('tab') || 'home';
		if (VALID_DIR_TABS.has(t)) {
			this.activeTab = t;
		}

		$effect(() => {
			this.syncActiveTab();
		});

		$effect(() => {
			this.syncTargetClub();
		});

		$effect(() => {
			this.loadTeamsForClub();
		});
	}

	syncActiveTab() {
		const t = page.url.searchParams.get('tab') || 'home';
		if (!VALID_DIR_TABS.has(t)) return;
		untrack(() => {
			if (this.activeTab !== t) this.activeTab = t;
		});
	}

	syncTargetClub() {
		const prof = authStore.userProfile;
		const activeCtx = workspaceContextStore.activeClubId?.trim();
		const rawProfileId = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';

		let targetId = '';

		// Priority 1: Did the user click a club in the Context Switcher?
		if (activeCtx && teamsStore.clubs.some((c) => c.id === activeCtx)) {
			targetId = activeCtx;
		} 
		// Priority 2: Are they hard-assigned to a club in their user profile?
		else if (rawProfileId && rawProfileId !== 'admin') {
			targetId = rawProfileId;
		} 
		// Priority 3: Fallback to the first available club
		else if (teamsStore.clubs.length > 0) {
			targetId = teamsStore.clubs[0].id;
		} else {
			return;
		}

		untrack(() => {
			// Sync local state for the UI
			if (this.clubId !== targetId) this.clubId = targetId;
			
			// Force sync to global store so the Context Switcher highlights the correct club
			if (workspaceContextStore.activeClubId !== targetId) {
				workspaceContextStore.setActiveClubId(targetId);
			}
		});
	}

	loadTeamsForClub() {
		if (!this.clubId) return;
		const role = authStore.role;
		if (role !== 'director' && role !== 'registrar') return;
		untrack(() => {
			void teamsStore.load(role, {
				clubId: this.clubId,
				scope: 'club',
				routePath: page.url.pathname,
			});
		});
	}

	clubTeams = $derived.by(() => {
		if (!authStore.isAuthenticated || !authStore.userProfile || !this.clubId) return [];
		return teamsStore.teams
			.filter((t) => t.clubId === this.clubId)
			.map((t) => ({ id: t.id, name: t.name }));
	});

	get clubLabel() {
		return teamsStore.clubs.find((c) => c.id === this.clubId)?.name || this.clubId;
	}
}
