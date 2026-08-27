<script lang="ts">
	import { browser } from '$app/environment';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, query, where, onSnapshot, doc, getDoc, type Unsubscribe } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	interface Props {
		teamId: string;
		clubId?: string;
	}

	interface HouseholdRow {
		id: string;
		parentEmails: string[];
		playerNames: string[];
		phone?: string;
		assignedRole: string;
		isUpdating?: boolean;
	}

	let { teamId, clubId = '' }: Props = $props();

	let households = $state<HouseholdRow[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');
	let successMsg = $state('');

	const callableUpdateStaffRole = httpsCallable(functions, 'callableUpdateStaffRole');

	$effect(() => {
		if (!browser || !teamId || !db || !authStore.isAuthenticated) {
			loading = false;
			return;
		}

		loading = true;
		errorMsg = '';

		// 1. Fetch team expandedStaff
		let staffSet = new Set<string>();
		getDoc(doc(db, 'teams', teamId))
			.then((snap) => {
				if (snap.exists()) {
					const data = snap.data() || {};
					const staff = Array.isArray(data.expandedStaff) ? data.expandedStaff : [];
					staff.forEach((em: string) => staffSet.add(em.toLowerCase().trim()));
				}
			})
			.catch((e) => console.warn('[RosterHouseholdsTab] team load warning:', e));

		// 2. Query households and player_lookup for team
		const qLookup = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsub: Unsubscribe = onSnapshot(
			qLookup,
			async (lookupSnap) => {
				const hhMap = new Map<string, HouseholdRow>();

				for (const docSnap of lookupSnap.docs) {
					const d = docSnap.data() || {};
					const pEmails = Array.isArray(d.parentEmails) ? d.parentEmails : d.parentEmail ? [d.parentEmail] : [];
					const playerName = d.playerName || d.displayName || 'Athlete';
					const phone = d.parentPhone || '';
					const hid = d.householdId || (pEmails[0] ? `hh_${pEmails[0]}` : docSnap.id);

					const existing = hhMap.get(hid);
					if (existing) {
						if (!existing.playerNames.includes(playerName)) existing.playerNames.push(playerName);
						pEmails.forEach((em: string) => {
							if (!existing.parentEmails.includes(em.toLowerCase())) existing.parentEmails.push(em.toLowerCase());
						});
						if (!existing.phone && phone) existing.phone = phone;
					} else {
						const primaryEmail = pEmails[0] ? pEmails[0].toLowerCase().trim() : '';
						const isStaff = primaryEmail && staffSet.has(primaryEmail);
						hhMap.set(hid, {
							id: hid,
							parentEmails: pEmails.map((e: string) => e.toLowerCase().trim()),
							playerNames: [playerName],
							phone,
							assignedRole: isStaff ? 'assistant_coach' : 'parent',
						});
					}
				}

				households = Array.from(hhMap.values());
				loading = false;
			},
			(err) => {
				console.error('[RosterHouseholdsTab] lookup fetch error:', err);
				errorMsg = 'Could not load household records.';
				loading = false;
			}
		);

		return () => unsub();
	});

	async function handleAssignRole(household: HouseholdRow, targetEmail: string, newRole: string) {
		if (!targetEmail || !teamId) return;
		household.isUpdating = true;
		errorMsg = '';
		successMsg = '';

		try {
			const effectiveClubId = clubId || authStore.clubId || authStore.userProfile?.clubId || 'default';
			await callableUpdateStaffRole({
				clubId: effectiveClubId,
				teamId,
				targetUserId: targetEmail,
				role: newRole,
			});
			household.assignedRole = newRole;
			successMsg = `Updated ${targetEmail} to ${newRole === 'assistant_coach' ? 'Assistant Coach (Coach OS access granted)' : newRole}.`;
			setTimeout(() => { successMsg = ''; }, 4000);
		} catch (err: any) {
			console.error('[RosterHouseholdsTab] update role error:', err);
			errorMsg = err?.message || 'Failed to update parent role.';
		} finally {
			household.isUpdating = false;
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-3 tw-mt-2">
	{#if successMsg}
		<div class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-rounded">
			✓ {successMsg}
		</div>
	{/if}
	{#if errorMsg}
		<div class="tw-bg-red-950/40 tw-border tw-border-red-500 tw-text-red-300 tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-rounded">
			⚠ {errorMsg}
		</div>
	{/if}

	{#if loading}
		<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-animate-pulse">Scanning team households…</p>
	{:else if households.length === 0}
		<div class="tw-border tw-border-dashed tw-border-slate-800 tw-p-6 tw-text-center tw-bg-[#020617] tw-rounded">
			<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">
				No households discovered. Ingest players with guardian emails or share your team dispatch code.
			</p>
		</div>
	{:else}
		<div class="tw-overflow-x-auto tw-border tw-border-slate-800 tw-rounded">
			<table class="tw-w-full tw-text-left tw-border-collapse tw-font-mono tw-text-xs">
				<thead>
					<tr class="tw-bg-[#020617] tw-border-b tw-border-slate-800 tw-text-[#14b8a6]">
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">GUARDIAN EMAIL</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">PHONE</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">ATHLETES</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">CURRENT ROLE</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider tw-text-right">ASSIGN ROLE</th>
					</tr>
				</thead>
				<tbody class="tw-divide-y tw-divide-slate-800/80 tw-bg-[#0f172a]/60">
					{#each households as hh (hh.id)}
						{@const primaryEmail = hh.parentEmails[0] || '—'}
						<tr class="hover:tw-bg-[#0f172a] tw-transition-colors">
							<td class="tw-p-3 tw-text-white tw-font-bold">
								{primaryEmail}
								{#if hh.parentEmails.length > 1}
									<span class="tw-text-slate-500 tw-text-[10px] tw-block">+{hh.parentEmails.length - 1} more</span>
								{/if}
							</td>
							<td class="tw-p-3 tw-text-slate-300">
								{hh.phone || '—'}
							</td>
							<td class="tw-p-3">
								<div class="tw-flex tw-flex-wrap tw-gap-1.5">
									{#each hh.playerNames as pName}
										<span class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-px-2 tw-py-0.5 tw-rounded tw-text-slate-200 tw-text-[11px]">
											{pName}
										</span>
									{/each}
								</div>
							</td>
							<td class="tw-p-3">
								{#if hh.assignedRole === 'assistant_coach'}
									<span class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										⚡ ASSISTANT COACH
									</span>
								{:else if hh.assignedRole === 'team_manager'}
									<span class="tw-bg-amber-500/20 tw-border tw-border-amber-500 tw-text-amber-300 tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										📋 TEAM MANAGER
									</span>
								{:else}
									<span class="tw-text-slate-400 tw-text-[11px]">
										Guardian / Parent
									</span>
								{/if}
							</td>
							<td class="tw-p-3 tw-text-right">
								<div class="tw-flex tw-items-center tw-justify-end tw-gap-1.5">
									<select
										class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-slate-200 tw-px-2 tw-py-1 tw-rounded tw-text-[11px] focus:tw-border-[#14b8a6] focus:tw-outline-none"
										value={hh.assignedRole}
										disabled={hh.isUpdating || !primaryEmail || primaryEmail === '—'}
										onchange={(e) => handleAssignRole(hh, primaryEmail, (e.target as HTMLSelectElement).value)}
									>
										<option value="parent">Parent / Guardian</option>
										<option value="assistant_coach">Assistant Coach</option>
										<option value="team_manager">Team Manager</option>
									</select>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
