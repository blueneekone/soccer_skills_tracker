import { auth, db, functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';
import { authStore } from '$lib/stores/auth.svelte.js';
import { logSecurityEvent } from '$lib/utils/security.js';
import { ADMIN_ORG_PAGE_SIZE } from '$lib/admin/organizationsConstants.js';
import {
	countActiveFilters,
	countClubsBySport,
	filterOrganizations,
	paginateClubs,
	patchClubLocally,
	removeClubLocally,
	totalPages,
} from '$lib/admin/organizationsFilters.js';
import { collection, getDocs, query } from 'firebase/firestore';
import { buildComplianceMap } from '$lib/admin/organizationsCompliance.js';
import { normalizeClubDocument, sortClubsByName } from '$lib/admin/organizationsNormalize.js';
import {
	EMPTY_ADD_CLUB_FORM,
	executeAddClub,
} from '$lib/admin/organizationsActions.js';
import type { OrgToast } from '$lib/components/admin/OrganizationsToastStack.svelte';
import type {
	AdminClub,
	AdminClubTierKey,
	AdminComplianceHealth,
	AdminSportTabKey,
} from '$lib/types/adminOrganizations.js';

export class AdminOrgsEngine {
	createSportModuleFn = httpsCallable(functions, 'createSportModule');
	PAGE_SIZE = ADMIN_ORG_PAGE_SIZE;

	clubs = $state<AdminClub[]>([]);
	clubsLoading = $state(false);
	clubsErr = $state('');
	complianceMap = $state<Map<string, AdminComplianceHealth>>(new Map());

	orgSearch = $state('');
	orgPage = $state(0);
	activeSportTab = $state<AdminSportTabKey>('all');

	filterOpen = $state(false);
	filterVerification = $state<'all' | 'verified' | 'pending'>('all');
	filterStates = $state<string[]>([]);
	filterTiers = $state<AdminClubTierKey[]>([]);
	filterRootEl = $state<HTMLElement | null>(null);
	filterRegionQuery = $state('');

	get filterActiveCount() {
		return countActiveFilters({
			verification: this.filterVerification,
			states: this.filterStates,
			tiers: this.filterTiers,
		});
	}

	toggleFilter = () => {
		this.filterOpen = !this.filterOpen;
	}
	closeFilter = () => {
		this.filterOpen = false;
	}
	resetFilters = () => {
		this.filterVerification = 'all';
		this.filterStates = [];
		this.filterTiers = [];
		this.filterRegionQuery = '';
	}

	get sportCounts() {
		return countClubsBySport(this.clubs);
	}

	get filteredClubs() {
		return filterOrganizations(this.clubs, {
			search: this.orgSearch,
			sportTab: this.activeSportTab,
			verification: this.filterVerification,
			states: this.filterStates,
			tiers: this.filterTiers,
		});
	}

	get orgTotalPages() {
		return totalPages(this.filteredClubs.length, this.PAGE_SIZE);
	}

	get pagedClubs() {
		return paginateClubs(this.filteredClubs, this.orgPage, this.PAGE_SIZE);
	}

	getCompliance = (clubId: string) => {
		return this.complianceMap.get(clubId) ?? null;
	}

	toasts = $state<OrgToast[]>([]);
	toastSeq = 0;

	pushToast = (text: string, tone: OrgToast['tone'] = 'info') => {
		const id = ++this.toastSeq;
		this.toasts = [...this.toasts, { id, text, tone }];
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, 4500);
	}

	importViaStackSports = () => {
		// Pass a temporary 'pending_import' or the admin's tenant ID
		const clubId = 'pending_import'; 
		
		void logSecurityEvent(
			'CLUB_IMPORT_STACK_SPORTS_INTENT',
			'admin.organizations',
			`Global Admin ${authStore.user?.email || 'unknown'} initiated Stack Sports OAuth for tenant: ${clubId}.`,
		);

		// Redirect to Cloud Function endpoint to initiate OAuth Handshake
		const functionsEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === 'true' || import.meta.env.DEV;
		const baseUrl = functionsEmulator 
			? 'http://127.0.0.1:5001/soccer-skills-tracker-dev/us-central1'
			: 'https://us-central1-soccer-skills-tracker-prod.cloudfunctions.net';
			
		window.location.href = `${baseUrl}/stackSportsAuthInit?clubId=${clubId}`;
	}

	isAddModalOpen = $state(false);
	addClubForm = $state({ ...EMPTY_ADD_CLUB_FORM });
	clubSaving = $state(false);
	clubAddErr = $state('');

	get newSportMode() {
		return this.addClubForm.sport === '__new__';
	}

	addClub = async () => {
		this.clubAddErr = '';
		this.clubSaving = true;
		try {
			const result = await executeAddClub({
				db,
				form: { ...this.addClubForm, newSportMode: this.newSportMode },
				createSportModuleFn: this.createSportModuleFn,
			});
			this.clubs = result.clubs;
			this.complianceMap = result.complianceMap;
			this.addClubForm = { ...EMPTY_ADD_CLUB_FORM };
			this.isAddModalOpen = false;
		} catch (e) {
			this.clubAddErr = e instanceof Error ? e.message : 'Could not create club.';
		} finally {
			this.clubSaving = false;
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (authStore.isLoading || !authStore.isAuthenticated) return;

				let cancelled = false;
				this.clubsLoading = true;
				this.clubsErr = '';

				Promise.all([
					getDocs(collection(db, 'clubs')),
					getDocs(query(collection(db, 'vpc_requests')))
				])
				.then(([clubsSnap, vpcSnap]) => {
					if (cancelled) return;
					
					const loaded = clubsSnap.docs.map((d) =>
						normalizeClubDocument(d.id, (d.data() || {}) as Record<string, unknown>),
					);
					this.clubs = sortClubsByName(loaded);

					const rows: any[] = [];
					vpcSnap.forEach((d) => {
						const data = d.data() as Record<string, unknown>;
						rows.push({
							clubId: typeof data.clubId === 'string' ? data.clubId : '',
							status: typeof data.status === 'string' ? data.status : '',
						});
					});
					this.complianceMap = buildComplianceMap(rows);
				})
					.catch((e) => {
						if (cancelled) return;
						this.clubsErr = e instanceof Error ? e.message : 'Could not load organizations.';
					})
					.finally(() => {
						if (!cancelled) this.clubsLoading = false;
					});

				return () => {
					cancelled = true;
				};
			});

			$effect(() => {
				if (!this.filterOpen) return;
				const onDocClick = (ev: MouseEvent) => {
					const tgt = ev.target as Node | null;
					if (!this.filterRootEl || !tgt) return;
					if (!this.filterRootEl.contains(tgt)) this.closeFilter();
				};
				const onKey = (ev: KeyboardEvent) => {
					if (ev.key === 'Escape') this.closeFilter();
				};
				document.addEventListener('mousedown', onDocClick);
				document.addEventListener('keydown', onKey);
				return () => {
					document.removeEventListener('mousedown', onDocClick);
					document.removeEventListener('keydown', onKey);
				};
			});

			$effect(() => {
				void this.orgSearch;
				void this.activeSportTab;
				this.orgPage = 0;
			});

			$effect(() => {
				if (this.orgPage > this.orgTotalPages - 1) this.orgPage = Math.max(0, this.orgTotalPages - 1);
			});

			$effect(() => {
				if (this.addClubForm.sport !== '__new__' && (this.addClubForm.newSportName || this.addClubForm.newSportIcon !== 'ph-soccer-ball')) {
					this.addClubForm = {
						...this.addClubForm,
						newSportName: '',
						newSportIcon: 'ph-soccer-ball',
					};
				}
			});



			return () => {};
		});
	}
}
