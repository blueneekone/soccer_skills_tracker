import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { untrack } from 'svelte';
import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export type TacticsTrainingTab = 'forge' | 'war-room' | 'matchday';
export type ForgeSubTab = 'intent' | 'designer' | 'library';

export class TacticsTrainingEngine {
	activeTab = $state<TacticsTrainingTab>('forge');
	forgeSubTab = $state<ForgeSubTab>('intent');
	showHelpModal = $state(false);
	teamScope = new CoachTeamScope();

	constructor() {
		if (browser) {
			this.syncFromUrl();
		}
	}

	syncFromUrl = (): void => {
		if (!browser) return;
		const url = new URL(window.location.href);
		const tab = url.searchParams.get('tab');
		if (tab === 'forge' || tab === 'war-room' || tab === 'matchday') {
			this.activeTab = tab;
		}
		const view = url.searchParams.get('view') || url.searchParams.get('sub');
		if (view === 'intent' || view === 'designer' || view === 'library') {
			this.forgeSubTab = view;
		}
		const help = url.searchParams.get('help');
		if (help === '1' || help === 'true') {
			this.showHelpModal = true;
		}
	};

	setTab = (tab: TacticsTrainingTab): void => {
		this.activeTab = tab;
		if (browser) {
			untrack(() => {
				const url = new URL(window.location.href);
				url.searchParams.set('tab', tab);
				try {
					void goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
				} catch {
					window.history.replaceState({}, '', url.toString());
				}
			});
		}
	};

	setForgeSubTab = (subTab: ForgeSubTab): void => {
		this.forgeSubTab = subTab;
		if (browser) {
			untrack(() => {
				const url = new URL(window.location.href);
				url.searchParams.set('tab', 'forge');
				url.searchParams.set('view', subTab);
				try {
					void goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
				} catch {
					window.history.replaceState({}, '', url.toString());
				}
			});
		}
	};

	toggleHelpModal = (): void => {
		this.showHelpModal = !this.showHelpModal;
	};

	get effectiveTeamId(): string {
		return (
			this.teamScope.selectedTeamId ||
			authStore.teamId ||
			authStore.userProfile?.teamId ||
			authStore.user?.teamId ||
			''
		);
	}
}
