<script lang="ts">
	import { page } from '$app/state';
	import { getActiveDb } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		doc,
		getDocs,
		setDoc,
		deleteDoc,
		query,
		where,
		serverTimestamp,
	} from 'firebase/firestore';
	import { getContext, untrack } from 'svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from '../adminClubCtx.js';

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);
	const clubId = $derived(ctx?.clubId ?? '');

	interface TeamItem {
		id: string;
		clubId: string;
		name: string;
		coachEmail?: string;
		ageGroup?: string;
		createdAt?: any;
	}

	let localTeams = $state<TeamItem[]>([]);
	let loading = $state(false);
	let error = $state('');
	let successMsg = $state('');
	let teamSearch = $state('');

	// Add Team Modal
	let showAddModal = $state(false);
	let teamSuffix = $state('');
	let teamName = $state('');
	let teamCoach = $state('');
	let ageGroup = $state('');
	let teamSaving = $state(false);
	let modalErr = $state('');

	const filteredTeams = $derived.by(() => {
		const q = teamSearch.trim().toLowerCase();
		if (!q) return localTeams;
		return localTeams.filter((t) =>
			(t.name || '').toLowerCase().includes(q) ||
			t.id.toLowerCase().includes(q) ||
			(t.coachEmail || '').toLowerCase().includes(q)
		);
	});

	$effect(() => {
		const cid = clubId;
		if (!cid) return;
		let cancelled = false;

		untrack(() => {
			loading = true;
			error = '';
		});

		void (async () => {
			const activeDb = getActiveDb();
			if (!activeDb || authStore.isLoading || !authStore.isAuthenticated) {
				untrack(() => {
					loading = false;
					error = 'Missing permissions';
				});
				return;
			}
			try {
				const q = query(
					collection(activeDb, 'teams'),
					where('clubId', '==', cid)
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				const teamsList = snap.docs.map((d) => ({
					id: d.id,
					clubId: cid,
					name: d.data().name || d.id,
					coachEmail: d.data().coachEmail,
					ageGroup: d.data().ageGroup,
					createdAt: d.data().createdAt,
				} as TeamItem));

				untrack(() => {
					localTeams = teamsList;
					loading = false;
				});
			} catch (e) {
				if (cancelled) return;
				untrack(() => {
					error = e instanceof Error ? e.message : 'Could not load teams.';
					loading = false;
				});
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	async function handleCreateTeam() {
		modalErr = '';
		if (!clubId) {
			modalErr = 'Organization context not loaded.';
			return;
		}
		const suffix = teamSuffix.trim().replace(/[^a-zA-Z0-9_-]/g, '');
		const name = teamName.trim();
		if (!suffix || !name) {
			modalErr = 'Team ID suffix and Team Name are required.';
			return;
		}
		const tid = `${clubId}_${suffix}`;
		const coachEmailClean = teamCoach.trim().toLowerCase();
		const activeDb = getActiveDb();
		if (!activeDb || !authStore.isAuthenticated) {
			modalErr = 'Database not available.';
			return;
		}

		teamSaving = true;
		try {
			const newTeamDoc: Record<string, any> = {
				clubId,
				name,
				coachEmail: coachEmailClean || '',
				createdAt: serverTimestamp(),
			};
			if (ageGroup.trim()) {
				newTeamDoc.ageGroup = ageGroup.trim();
			}

			await setDoc(doc(activeDb, 'teams', tid), newTeamDoc);

			if (coachEmailClean) {
				await setDoc(
					doc(activeDb, 'users', coachEmailClean),
					{ role: 'coach', clubId, teamId: tid, updatedAt: serverTimestamp() },
					{ merge: true }
				);
				await setDoc(
					doc(activeDb, 'coach_lookup', coachEmailClean),
					{ role: 'coach', clubId, teamId: tid },
					{ merge: true }
				);
			}

			await logSecurityEvent('CREATE_TEAM', tid, name);

			// Optimistic local update
			const createdItem: TeamItem = {
				id: tid,
				clubId,
				name,
				coachEmail: coachEmailClean,
				ageGroup: ageGroup.trim() || undefined,
			};
			localTeams = [createdItem, ...localTeams.filter((t) => t.id !== tid)];

			// Invalidate & refresh global store
			teamsStore.invalidate();
			void teamsStore.load('super_admin', { scope: 'admin_full', forceRefresh: true });

			successMsg = `Team "${name}" (${tid}) created successfully.`;
			setTimeout(() => { successMsg = ''; }, 4000);

			showAddModal = false;
			teamSuffix = '';
			teamName = '';
			teamCoach = '';
			ageGroup = '';
		} catch (e) {
			console.error('Create team error', e);
			modalErr = e instanceof Error ? e.message : 'Could not create team.';
		} finally {
			teamSaving = false;
		}
	}

	async function handleDeleteTeam(t: TeamItem) {
		const ok = confirm(`Permanently delete team "${t.name}" (${t.id})?\n\nThis will remove the team and unlink its roster.`);
		if (!ok) return;
		const activeDb = getActiveDb();
		if (!activeDb || !authStore.isAuthenticated) return;

		try {
			await deleteDoc(doc(activeDb, 'teams', t.id));
			await logSecurityEvent('DELETE_TEAM', t.id, t.name);
			localTeams = localTeams.filter((item) => item.id !== t.id);
			teamsStore.invalidate();
			void teamsStore.load('super_admin', { scope: 'admin_full', forceRefresh: true });
			successMsg = `Team "${t.name}" deleted.`;
			setTimeout(() => { successMsg = ''; }, 4000);
		} catch (e) {
			console.error('Delete team failed', e);
			error = 'Failed to delete team.';
		}
	}
</script>

<svelte:head>
	<title>Organization Teams · NEXUS COMMAND</title>
</svelte:head>

<div class="tw-flex tw-flex-col tw-gap-5 tw-w-full">
	<!-- Page Header -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
		<div class="tw-flex tw-flex-col tw-gap-1">
			<h1 class="tw-m-0 tw-text-xl tw-font-extrabold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2.5">
				<Icon name={"user.group" as IconName} class="tw-text-[#14b8a6]" />
				Teams & Rosters
			</h1>
			<p class="tw-m-0 tw-text-xs tw-text-[#94a3b8] tw-font-mono">
				Manage squads, head coaches, and athlete assignments for {ctx?.clubDoc?.name || clubId}
			</p>
		</div>

		<button
			type="button"
			class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
			onclick={() => { showAddModal = true; modalErr = ''; }}
		>
			<Icon name={"action.add" as IconName} size={14} />
			Add Team
		</button>
	</div>

	<!-- Flash Messages -->
	{#if error}
		<div class="tw-p-3.5 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-2" role="alert">
			<Icon name={"status.warning-triangle" as IconName} />
			<span>{error}</span>
		</div>
	{/if}
	{#if successMsg}
		<div class="tw-p-3.5 tw-bg-[#1E293B] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-2" role="status">
			<Icon name={"status.check" as IconName} />
			<span>{successMsg}</span>
		</div>
	{/if}

	<!-- Search Toolbar -->
	<div class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-bg-[#0f172a] tw-p-3 tw-border tw-border-[#334155]">
		<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1 tw-max-w-md">
			<Icon name={"action.search" as IconName} size={14} class="tw-text-[#94a3b8]" />
			<input
				type="search"
				class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 focus:tw-outline-none focus:tw-border-[#14b8a6]"
				bind:value={teamSearch}
				placeholder="Filter squads by name, ID, or coach..."
			/>
		</div>
		<div class="tw-text-xs tw-font-mono tw-text-[#94a3b8]">
			{filteredTeams.length} {filteredTeams.length === 1 ? 'TEAM' : 'TEAMS'}
		</div>
	</div>

	<!-- Teams Table -->
	<div class="tw-w-full tw-overflow-x-auto tw-border tw-border-[#334155] tw-bg-[#0f172a]">
		<table class="tw-w-full tw-font-mono tw-text-sm tw-min-w-[700px] tw-text-left tw-border-collapse">
			<thead class="tw-sticky tw-top-0 tw-z-10 tw-bg-[#020617] tw-border-b tw-border-[#334155]">
				<tr>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Squad Name</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Team ID</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Head Coach</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8] tw-text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="4" class="tw-px-4 tw-py-12 tw-text-center tw-text-xs tw-font-mono tw-text-[#94a3b8]">
							<span class="tw-inline-block tw-animate-spin tw-mr-2">⟳</span> Loading teams...
						</td>
					</tr>
				{:else if filteredTeams.length === 0}
					<tr>
						<td colspan="4" class="tw-px-4 tw-py-12 tw-text-center tw-text-xs tw-font-mono tw-text-[#94a3b8]">
							{localTeams.length === 0 ? 'No teams created for this organization yet. Click "+ Add Team" to create one.' : 'No teams match your search.'}
						</td>
					</tr>
				{:else}
					{#each filteredTeams as t (t.id)}
						<tr class="tw-border-b tw-border-[#334155]/60 hover:tw-bg-[#020617] tw-transition-colors last:tw-border-none">
							<!-- Team Name & Age Group -->
							<td class="tw-px-4 tw-py-3.5">
								<div class="tw-flex tw-items-center tw-gap-2.5">
									<div class="tw-w-7 tw-h-7 tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-flex tw-items-center tw-justify-center tw-text-[#14b8a6]">
										<Icon name={"user.group" as IconName} size={14} />
									</div>
									<div class="tw-flex tw-flex-col">
										<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA]">{t.name}</span>
										{#if t.ageGroup}
											<span class="tw-text-[10px] tw-font-mono tw-text-[#94a3b8]">{t.ageGroup}</span>
										{/if}
									</div>
								</div>
							</td>

							<!-- Team ID -->
							<td class="tw-px-4 tw-py-3.5">
								<code class="tw-px-2 tw-py-0.5 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-xs tw-text-[#14b8a6] tw-font-mono">
									{t.id}
								</code>
							</td>

							<!-- Head Coach -->
							<td class="tw-px-4 tw-py-3.5">
								{#if t.coachEmail}
									<div class="tw-flex tw-items-center tw-gap-2">
										<span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#14b8a6]"></span>
										<span class="tw-text-xs tw-font-mono tw-text-[#FAFAFA]">{t.coachEmail}</span>
									</div>
								{:else}
									<span class="tw-text-xs tw-font-mono tw-text-[#64748b] tw-italic">Unassigned</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="tw-px-4 tw-py-3.5 tw-text-right">
								<div class="tw-flex tw-items-center tw-justify-end tw-gap-2">
									<a
										href="/admin/organizations/{clubId}/teams/{t.id}/roster"
										class="v-toolbar-btn tw-h-7 tw-px-2.5 tw-py-0 tw-text-xs tw-border-[#14b8a6]/40 tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
									>
										Manage Roster &rarr;
									</a>
									<button
										type="button"
										class="v-toolbar-btn tw-h-7 tw-px-2.5 tw-py-0 tw-text-xs tw-border-rose-500/40 tw-text-rose-400 hover:tw-border-rose-500 hover:tw-bg-rose-500/10"
										title="Delete team"
										onclick={() => handleDeleteTeam(t)}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal: Add Team -->
{#if showAddModal}
	<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/80 tw-backdrop-blur-sm tw-p-4" role="dialog" aria-modal="true">
		<div class="tw-w-full tw-max-w-lg tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-4">
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3">
				<h2 class="tw-m-0 tw-text-base tw-font-extrabold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2">
					<Icon name={"action.add" as IconName} size={16} class="tw-text-[#14b8a6]" />
					Create New Team
				</h2>
				<button
					type="button"
					class="tw-text-[#94a3b8] hover:tw-text-[#FAFAFA]"
					onclick={() => (showAddModal = false)}
				>
					<Icon name={"sys.close" as IconName} />
				</button>
			</div>

			{#if modalErr}
				<div class="tw-p-3 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">
					{modalErr}
				</div>
			{/if}

			<div class="tw-flex tw-flex-col tw-gap-3">
				<div>
					<label for="team-suffix-input" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Team ID Suffix <span class="tw-text-[#ef4444]">*</span>
					</label>
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-text-xs tw-font-mono tw-text-[#94a3b8]">{clubId}_</span>
						<input
							id="team-suffix-input"
							type="text"
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
							bind:value={teamSuffix}
							placeholder="e.g. 16g_grey"
							disabled={teamSaving}
						/>
					</div>
				</div>

				<div>
					<label for="team-name-input" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Display Name <span class="tw-text-[#ef4444]">*</span>
					</label>
					<input
						id="team-name-input"
						type="text"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
						bind:value={teamName}
						placeholder="e.g. Aggies FC 2016G Grey"
						disabled={teamSaving}
					/>
				</div>

				<div>
					<label for="team-age-input" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Age Group / Division (Optional)
					</label>
					<input
						id="team-age-input"
						type="text"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
						bind:value={ageGroup}
						placeholder="e.g. U11 / Tier 1"
						disabled={teamSaving}
					/>
				</div>

				<div>
					<label for="team-coach-input" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Head Coach Email
					</label>
					<input
						id="team-coach-input"
						type="email"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
						bind:value={teamCoach}
						placeholder="coach@aggiesfc.com"
						disabled={teamSaving}
					/>
				</div>
			</div>

			<div class="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-pt-3 tw-border-t tw-border-[#334155]">
				<button
					type="button"
					class="v-toolbar-btn"
					onclick={() => (showAddModal = false)}
					disabled={teamSaving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
					onclick={handleCreateTeam}
					disabled={teamSaving}
				>
					{teamSaving ? 'Creating...' : 'Create Team'}
				</button>
			</div>
		</div>
	</div>
{/if}
