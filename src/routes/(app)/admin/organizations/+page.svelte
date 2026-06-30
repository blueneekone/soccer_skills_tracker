<script lang="ts">
	import { auth, db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
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
	import { loadOrganizationsWithCompliance } from '$lib/admin/organizationsLoad.js';
	import {
		EMPTY_ADD_CLUB_FORM,
		executeAddClub,
		executeDeleteClub,
		executeLoginAsDirector,
	} from '$lib/admin/organizationsActions.js';
	import EditOrganizationModal from '$lib/components/admin/EditOrganizationModal.svelte';
	import OrganizationsAddForm from '$lib/components/admin/OrganizationsAddForm.svelte';
	import OrganizationsAlerts from '$lib/components/admin/OrganizationsAlerts.svelte';
	import OrganizationsDataTable from '$lib/components/admin/OrganizationsDataTable.svelte';
	import OrganizationsPagination from '$lib/components/admin/OrganizationsPagination.svelte';
	import OrganizationsSportTabs from '$lib/components/admin/OrganizationsSportTabs.svelte';
	import OrganizationsToastStack from '$lib/components/admin/OrganizationsToastStack.svelte';
	import type { OrgToast } from '$lib/components/admin/OrganizationsToastStack.svelte';
	import OrganizationsToolbar from '$lib/components/admin/OrganizationsToolbar.svelte';
	import '$lib/styles/enterprise-console.css';
	import '$lib/styles/admin-organizations.css';
	import type {
		AdminClub,
		AdminClubTierKey,
		AdminComplianceHealth,
		AdminSportTabKey,
	} from '$lib/types/adminOrganizations.js';

	const createSportModuleFn = httpsCallable(functions, 'createSportModule');
	const impersonateUserFn = httpsCallable(functions, 'impersonateUserFn');
	const PAGE_SIZE = ADMIN_ORG_PAGE_SIZE;

	let clubs = $state<AdminClub[]>([]);
	let clubsLoading = $state(false);
	let clubsErr = $state('');
	let complianceMap = $state<Map<string, AdminComplianceHealth>>(new Map());

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;

		let cancelled = false;
		clubsLoading = true;
		clubsErr = '';

		loadOrganizationsWithCompliance(db)
			.then((result) => {
				if (cancelled) return;
				clubs = result.clubs;
				complianceMap = result.complianceMap;
			})
			.catch((e) => {
				if (cancelled) return;
				clubsErr = e instanceof Error ? e.message : 'Could not load organizations.';
			})
			.finally(() => {
				if (!cancelled) clubsLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	let orgSearch = $state('');
	let orgPage = $state(0);
	let activeSportTab = $state<AdminSportTabKey>('all');

	let filterOpen = $state(false);
	let filterVerification = $state<'all' | 'verified' | 'pending'>('all');
	let filterStates = $state<string[]>([]);
	let filterTiers = $state<AdminClubTierKey[]>([]);
	let filterRootEl = $state<HTMLElement | null>(null);
	let filterRegionQuery = $state('');

	const filterActiveCount = $derived.by(() =>
		countActiveFilters({
			verification: filterVerification,
			states: filterStates,
			tiers: filterTiers,
		}),
	);

	function toggleFilter() {
		filterOpen = !filterOpen;
	}
	function closeFilter() {
		filterOpen = false;
	}
	function resetFilters() {
		filterVerification = 'all';
		filterStates = [];
		filterTiers = [];
		filterRegionQuery = '';
	}

	$effect(() => {
		if (!filterOpen) return;
		const onDocClick = (ev: MouseEvent) => {
			const tgt = ev.target as Node | null;
			if (!filterRootEl || !tgt) return;
			if (!filterRootEl.contains(tgt)) closeFilter();
		};
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') closeFilter();
		};
		document.addEventListener('mousedown', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	$effect(() => {
		void orgSearch;
		void activeSportTab;
		orgPage = 0;
	});

	const sportCounts = $derived.by(() => countClubsBySport(clubs));

	const filteredClubs = $derived.by(() =>
		filterOrganizations(clubs, {
			search: orgSearch,
			sportTab: activeSportTab,
			verification: filterVerification,
			states: filterStates,
			tiers: filterTiers,
		}),
	);

	const orgTotalPages = $derived(totalPages(filteredClubs.length, PAGE_SIZE));
	const pagedClubs = $derived.by(() => paginateClubs(filteredClubs, orgPage, PAGE_SIZE));

	$effect(() => {
		if (orgPage > orgTotalPages - 1) orgPage = Math.max(0, orgTotalPages - 1);
	});

	function getCompliance(clubId: string) {
		return complianceMap.get(clubId) ?? null;
	}

	function getTeamCount(clubId: string) {
		return teamsStore.teams.filter((t) => t.clubId === clubId).length;
	}

	let toasts = $state<OrgToast[]>([]);
	let toastSeq = 0;

	function pushToast(text: string, tone: OrgToast['tone'] = 'info') {
		const id = ++toastSeq;
		toasts = [...toasts, { id, text, tone }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 4500);
	}

	function importViaStackSports() {
		pushToast('Stack Sports OAuth Integration arriving in Sprint 2.9', 'info');
		void logSecurityEvent(
			'CLUB_IMPORT_STACK_SPORTS_INTENT',
			'admin.organizations',
			`Global Admin ${authStore.user?.email || 'unknown'} clicked Stack Sports import.`,
		);
	}

	let showAddForm = $state(false);
	let addClubForm = $state({ ...EMPTY_ADD_CLUB_FORM });
	let clubSaving = $state(false);
	let clubAddErr = $state('');

	const newSportMode = $derived(addClubForm.sport === '__new__');

	$effect(() => {
		if (addClubForm.sport !== '__new__' && (addClubForm.newSportName || addClubForm.newSportIcon !== 'ph-soccer-ball')) {
			addClubForm = {
				...addClubForm,
				newSportName: '',
				newSportIcon: 'ph-soccer-ball',
			};
		}
	});

	async function addClub() {
		clubAddErr = '';
		clubSaving = true;
		try {
			const result = await executeAddClub({
				db,
				form: { ...addClubForm, newSportMode },
				createSportModuleFn,
			});
			clubs = result.clubs;
			complianceMap = result.complianceMap;
			addClubForm = { ...EMPTY_ADD_CLUB_FORM };
			showAddForm = false;
		} catch (e) {
			clubAddErr = e instanceof Error ? e.message : 'Could not create club.';
		} finally {
			clubSaving = false;
		}
	}

	let openRowMenuId = $state<string | null>(null);
	let editingClub = $state<AdminClub | null>(null);
	let showEditModal = $state(false);

	function toggleRowMenu(id: string) {
		openRowMenuId = openRowMenuId === id ? null : id;
	}
	function closeRowMenu() {
		openRowMenuId = null;
	}

	$effect(() => {
		if (!openRowMenuId) return;
		const onDocClick = (ev: MouseEvent) => {
			const tgt = ev.target as Element | null;
			if (!tgt) return;
			if (!tgt.closest?.('.orgs3-row-menu') && !tgt.closest?.('.orgs3-row-actions-btn')) {
				closeRowMenu();
			}
		};
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') closeRowMenu();
		};
		document.addEventListener('mousedown', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	function openEdit(cl: AdminClub) {
		editingClub = cl;
		showEditModal = true;
		closeRowMenu();
	}

	function closeEdit() {
		showEditModal = false;
		editingClub = null;
	}

	async function deleteClub(id: string, name: string) {
		try {
			const deleted = await executeDeleteClub({ db, id, name });
			if (deleted) clubs = removeClubLocally(clubs, id);
		} catch (e) {
			clubsErr = e instanceof Error ? e.message : 'Could not delete organization.';
		}
	}

	let loginAsDirectorBusyFor = $state<string | null>(null);
	let loginAsDirectorErr = $state('');

	async function loginAsDirector(cl: AdminClub) {
		closeRowMenu();
		loginAsDirectorErr = '';
		loginAsDirectorBusyFor = cl.id;
		try {
			await executeLoginAsDirector({
				auth,
				club: cl,
				actorEmail: authStore.user?.email || 'unknown',
				impersonateUserFn,
				onScope: (clubId) => {
					workspaceContextStore.resetScope();
					workspaceContextStore.setActiveClubId(clubId);
					workspaceContextStore.setActiveContext('director');
				},
				touchImpersonation: () => impersonationStore.touch(),
			});
		} catch (e) {
			console.error('[admin-organizations] director impersonation failed', e);
			loginAsDirectorErr = e instanceof Error ? e.message : 'Login As Director failed.';
		} finally {
			loginAsDirectorBusyFor = null;
		}
	}
</script>

<div class="tw-w-full">
	<section class="tw-w-full orgs-panel orgs3-page">
		<OrganizationsToolbar
			{clubs}
			bind:orgSearch
			{clubsLoading}
			filteredCount={filteredClubs.length}
			totalCount={clubs.length}
			filterOpen={filterOpen}
			{filterActiveCount}
			bind:filterVerification
			bind:filterStates
			bind:filterTiers
			bind:filterRegionQuery
			bind:filterRootEl
			{showAddForm}
			onToggleFilter={toggleFilter}
			onCloseFilter={closeFilter}
			onResetFilters={resetFilters}
			onToggleAddForm={() => (showAddForm = !showAddForm)}
			onImportStackSports={importViaStackSports}
			onFilterVerificationChange={(v) => (filterVerification = v)}
			onFilterTiersChange={(tiers) => (filterTiers = tiers)}
			onFilterStatesChange={(states) => (filterStates = states)}
			onFilterRegionQueryChange={(q) => (filterRegionQuery = q)}
		/>

		<OrganizationsToastStack {toasts} />

		<OrganizationsSportTabs
			{activeSportTab}
			{sportCounts}
			onTabChange={(tab) => (activeSportTab = tab)}
		/>

		{#if showAddForm}
			<OrganizationsAddForm
				bind:form={addClubForm}
				{newSportMode}
				saving={clubSaving}
				err={clubAddErr}
				onSubmit={() => void addClub()}
			/>
		{/if}

		<OrganizationsAlerts {clubsErr} {loginAsDirectorErr} />

		<OrganizationsDataTable
			{pagedClubs}
			totalClubs={clubs.length}
			{clubsLoading}
			{openRowMenuId}
			{loginAsDirectorBusyFor}
			{getCompliance}
			{getTeamCount}
			onToggleRowMenu={toggleRowMenu}
			onEdit={openEdit}
			onCloseRowMenu={closeRowMenu}
			onLoginAsDirector={(cl) => void loginAsDirector(cl)}
			onDelete={(id, name) => void deleteClub(id, name)}
		/>

		<OrganizationsPagination
			{orgPage}
			{orgTotalPages}
			filteredCount={filteredClubs.length}
			onPrev={() => (orgPage = Math.max(0, orgPage - 1))}
			onNext={() => (orgPage = Math.min(orgTotalPages - 1, orgPage + 1))}
		/>
	</section>
</div>

<EditOrganizationModal
	bind:open={showEditModal}
	club={editingClub}
	onClose={closeEdit}
	onSaved={(updated) => {
		clubs = patchClubLocally(clubs, updated);
	}}
/>
