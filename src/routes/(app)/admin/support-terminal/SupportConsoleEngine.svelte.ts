import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export type SupportTab = 'users' | 'teams' | 'claims' | 'system';

export class SupportConsoleEngine {
	activeTab = $state<SupportTab>('users');
	isProcessing = $state(false);
	lastOutput = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// User Ops State
	userEmail = $state('');
	userUid = $state('');
	
	// Team Ops State
	teamClubId = $state('');
	teamName = $state('');
	teamAgeGroup = $state('U12');
	teamGender = $state('Boys');
	teamSport = $state('Soccer');

	// Claims Repair State
	repairEmail = $state('');
	repairRole = $state('user');
	repairClubId = $state('');
	repairTeamId = $state('');

	// Link User to Team State
	linkEmail = $state('');
	linkRole = $state('coach');
	linkClubId = $state('');
	linkTeamId = $state('');

	constructor() {}

	setActiveTab(tab: SupportTab) {
		this.activeTab = tab;
		this.lastOutput = null;
	}

	async executeCommand(commandName: string, payload: any = {}) {
		if (this.isProcessing) return;
		this.isProcessing = true;
		this.lastOutput = null;

		try {
			const callable = httpsCallable(functions, commandName);
			const result = await callable(payload);
			this.lastOutput = {
				type: 'success',
				text: `[${commandName}] Success: \n${JSON.stringify(result.data, null, 2)}`
			};
		} catch (err: any) {
			this.lastOutput = {
				type: 'error',
				text: `[${commandName}] Failed: \n${err.message || 'Unknown error'}`
			};
		} finally {
			this.isProcessing = false;
		}
	}
}
