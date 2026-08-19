<script lang="ts">
	import { getContext, untrack } from 'svelte';
	import { getActiveDb } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		doc,
		getDocs,
		setDoc,
		updateDoc,
		query,
		where,
		limit,
		serverTimestamp,
	} from 'firebase/firestore';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from '../adminClubCtx.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { logSecurityEvent } from '$lib/utils/security.js';

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);
	const clubId = $derived(ctx?.clubId ?? '');

	interface OrgUserRow {
		id: string;
		email?: string;
		name?: string;
		displayName?: string;
		role?: string;
		status?: string;
		createdAt?: any;
	}

	let users = $state<OrgUserRow[]>([]);
	let loading = $state(false);
	let error = $state('');
	let successMsg = $state('');
	let userSearch = $state('');
	let roleFilter = $state('all');

	// Modal State: Add / Assign User
	let showAddModal = $state(false);
	let newEmail = $state('');
	let newName = $state('');
	let newRole = $state('coach');
	let addSaving = $state(false);
	let addErr = $state('');

	const filteredUsers = $derived.by(() => {
		const q = userSearch.trim().toLowerCase();
		return users.filter((u) => {
			const matchesSearch =
				!q ||
				(u.name || u.displayName || '').toLowerCase().includes(q) ||
				(u.email || '').toLowerCase().includes(q) ||
				u.id.toLowerCase().includes(q);
			const matchesRole = roleFilter === 'all' || (u.role || '') === roleFilter;
			return matchesSearch && matchesRole;
		});
	});

	function getInitials(name?: string, email?: string): string {
		if (name && name.trim()) {
			const parts = name.trim().split(/\s+/);
			return parts.length > 1
				? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
				: (parts[0]?.slice(0, 2) || '').toUpperCase();
		}
		if (email) return email.slice(0, 2).toUpperCase();
		return 'US';
	}

	function getRoleBadgeClass(role?: string): string {
		switch ((role || '').toLowerCase()) {
			case 'director':
				return 'tw-bg-[#daff0a]/10 tw-text-[#daff0a] tw-border-[#daff0a]/30';
			case 'coach':
				return 'tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-border-[#14b8a6]/30';
			case 'player':
				return 'tw-bg-[#3b82f6]/10 tw-text-[#3b82f6] tw-border-[#3b82f6]/30';
			case 'guardian':
			case 'parent':
				return 'tw-bg-[#a855f7]/10 tw-text-[#a855f7] tw-border-[#a855f7]/30';
			default:
				return 'tw-bg-[#334155]/20 tw-text-[#94a3b8] tw-border-[#334155]';
		}
	}

	$effect(() => {
		const id = clubId;
		if (!id) return;
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
					error = 'Missing or insufficient permissions';
				});
				return;
			}
			try {
				const q = query(
					collection(activeDb, 'users'),
					where('clubId', '==', id),
					limit(100),
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				const raw = snap.docs
					.map((d) => ({ id: d.id, ...d.data() } as OrgUserRow))
					.filter((u) => u.role !== 'global_admin' && u.role !== 'super_admin');
				untrack(() => {
					users = raw;
					loading = false;
				});
			} catch (e) {
				if (cancelled) return;
				untrack(() => {
					error = e instanceof Error ? e.message : 'Could not load users.';
					loading = false;
				});
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	async function updateRole(userId: string, newRole: string) {
		const activeDb = getActiveDb();
		if (!activeDb || !authStore.isAuthenticated) return;
		const idx = users.findIndex((u) => u.id === userId);
		if (idx === -1) return;

		const oldRole = users[idx]!.role;
		users[idx]!.role = newRole;

		try {
			await updateDoc(doc(activeDb, 'users', userId), { role: newRole });
			await logSecurityEvent('UPDATE_USER_ROLE', userId, `Role changed to ${newRole}`);
			successMsg = `Role updated to ${newRole} for ${users[idx]!.email || userId}`;
			setTimeout(() => { successMsg = ''; }, 4000);
		} catch (e) {
			users[idx]!.role = oldRole;
			error = 'Failed to update user role.';
			setTimeout(() => { error = ''; }, 4000);
		}
	}

	async function handleRemoveFromOrg(user: OrgUserRow) {
		const ok = confirm(`Remove "${user.name || user.email || user.id}" from this organization?`);
		if (!ok) return;
		const activeDb = getActiveDb();
		if (!activeDb || !authStore.isAuthenticated) return;

		try {
			await updateDoc(doc(activeDb, 'users', user.id), { clubId: '' });
			if (user.email) {
				await updateDoc(doc(activeDb, 'coach_lookup', user.email), { clubId: '' }).catch(() => null);
			}
			await logSecurityEvent('REMOVE_USER_FROM_CLUB', user.id, `Removed from ${clubId}`);
			users = users.filter((u) => u.id !== user.id);
			successMsg = `User removed from organization.`;
			setTimeout(() => { successMsg = ''; }, 4000);
		} catch (e) {
			console.error('Remove user failed', e);
			error = 'Failed to remove user from organization.';
		}
	}

	async function handleAddUser() {
		addErr = '';
		const email = newEmail.trim().toLowerCase();
		const name = newName.trim();
		if (!email || !name) {
			addErr = 'Full Name and Email are required.';
			return;
		}
		if (!clubId) {
			addErr = 'Organization context is missing.';
			return;
		}

		const activeDb = getActiveDb();
		if (!activeDb || !authStore.isAuthenticated) {
			addErr = 'Database not available.';
			return;
		}

		addSaving = true;
		try {
			const userPayload: Record<string, any> = {
				email,
				displayName: name,
				role: newRole,
				clubId,
				updatedAt: serverTimestamp(),
			};

			await setDoc(doc(activeDb, 'users', email), userPayload, { merge: true });

			if (newRole === 'coach') {
				await setDoc(
					doc(activeDb, 'coach_lookup', email),
					{ email, displayName: name, role: 'coach', clubId },
					{ merge: true }
				);
			}

			await logSecurityEvent('ASSIGN_USER_TO_CLUB', email, `Role: ${newRole}, Club: ${clubId}`);

			users = [
				{
					id: email,
					email,
					name,
					displayName: name,
					role: newRole,
					status: 'active',
				},
				...users.filter((u) => u.id !== email && u.email !== email),
			];

			successMsg = `User "${name}" (${email}) added as ${newRole}.`;
			setTimeout(() => { successMsg = ''; }, 4000);

			showAddModal = false;
			newEmail = '';
			newName = '';
			newRole = 'coach';
		} catch (e) {
			console.error('Add user error', e);
			addErr = e instanceof Error ? e.message : 'Could not add user.';
		} finally {
			addSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Organization Users · NEXUS COMMAND</title>
</svelte:head>

<div class="tw-flex tw-flex-col tw-gap-5 tw-w-full">
	<!-- Header & Actions -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
		<div class="tw-flex tw-flex-col tw-gap-1">
			<h1 class="tw-m-0 tw-text-xl tw-font-extrabold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2.5">
				<Icon name={"user.group" as IconName} class="tw-text-[#14b8a6]" />
				Organization Staff & Members
			</h1>
			<p class="tw-m-0 tw-text-xs tw-text-[#94a3b8] tw-font-mono">
				Manage assigned coaches, directors, and rostered members for {ctx?.clubDoc?.name || clubId}
			</p>
		</div>

		<button
			type="button"
			class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
			onclick={() => { showAddModal = true; addErr = ''; }}
		>
			<Icon name={"action.add" as IconName} size={14} />
			Add / Assign User
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

	<!-- Search & Filters Toolbar -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-bg-[#0f172a] tw-p-3 tw-border tw-border-[#334155]">
		<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1 tw-min-w-[240px]">
			<Icon name={"action.search" as IconName} size={14} class="tw-text-[#94a3b8]" />
			<input
				type="search"
				class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 focus:tw-outline-none focus:tw-border-[#14b8a6]"
				bind:value={userSearch}
				placeholder="Filter by name, email, or user ID..."
			/>
		</div>

		<div class="tw-flex tw-items-center tw-gap-2">
			<label for="org-role-filter" class="tw-text-xs tw-font-mono tw-text-[#94a3b8] tw-uppercase">Role:</label>
			<select
				id="org-role-filter"
				class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 focus:tw-outline-none focus:tw-border-[#14b8a6]"
				bind:value={roleFilter}
			>
				<option value="all">All Roles ({users.length})</option>
				<option value="director">Directors</option>
				<option value="coach">Coaches</option>
				<option value="player">Players</option>
				<option value="guardian">Guardians</option>
			</select>
		</div>
	</div>

	<!-- Data Table -->
	<div class="tw-w-full tw-overflow-x-auto tw-border tw-border-[#334155] tw-bg-[#0f172a]">
		<table class="tw-w-full tw-font-mono tw-text-sm tw-min-w-[700px] tw-text-left tw-border-collapse">
			<thead class="tw-sticky tw-top-0 tw-z-10 tw-bg-[#020617] tw-border-b tw-border-[#334155]">
				<tr>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Member</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Email / ID</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Role</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Status</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8] tw-text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="5" class="tw-px-4 tw-py-12 tw-text-center tw-text-xs tw-font-mono tw-text-[#94a3b8]">
							<span class="tw-inline-block tw-animate-spin tw-mr-2">⟳</span> Loading organization roster...
						</td>
					</tr>
				{:else if filteredUsers.length === 0}
					<tr>
						<td colspan="5" class="tw-px-4 tw-py-12 tw-text-center tw-text-xs tw-font-mono tw-text-[#94a3b8]">
							{users.length === 0 ? 'No members assigned to this organization yet.' : 'No users match your filter.'}
						</td>
					</tr>
				{:else}
					{#each filteredUsers as user (user.id)}
						<tr class="tw-border-b tw-border-[#334155]/60 hover:tw-bg-[#020617] tw-transition-colors last:tw-border-none">
							<!-- Member avatar + Name -->
							<td class="tw-px-4 tw-py-3.5">
								<div class="tw-flex tw-items-center tw-gap-3">
									<div class="tw-w-8 tw-h-8 tw-rounded-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-font-bold tw-text-xs tw-text-[#14b8a6]">
										{getInitials(user.name || user.displayName, user.email)}
									</div>
									<div class="tw-flex tw-flex-col">
										<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA]">
											{user.name || user.displayName || 'Unnamed Member'}
										</span>
										{#if user.displayName && user.name && user.displayName !== user.name}
											<span class="tw-text-[10px] tw-text-[#94a3b8]">{user.displayName}</span>
										{/if}
									</div>
								</div>
							</td>

							<!-- Email & UID -->
							<td class="tw-px-4 tw-py-3.5">
								<div class="tw-flex tw-flex-col">
									<span class="tw-text-xs tw-text-[#FAFAFA] tw-font-mono">{user.email || '—'}</span>
									{#if user.id && user.id !== user.email}
										<span class="tw-text-[10px] tw-text-[#64748b] tw-font-mono tw-truncate tw-max-w-[180px]" title={user.id}>
											ID: {user.id}
										</span>
									{/if}
								</div>
							</td>

							<!-- Role Switcher -->
							<td class="tw-px-4 tw-py-3.5">
								<div class="tw-flex tw-items-center tw-gap-2">
									<span class="tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-border {getRoleBadgeClass(user.role)}">
										{user.role || 'GUEST'}
									</span>
									<select
										aria-label="Change role for {user.name || user.email || user.id}"
										class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-text-[11px] tw-font-mono tw-px-1.5 tw-py-1 focus:tw-outline-none focus:tw-border-[#14b8a6]"
										value={user.role || ''}
										onchange={(e) => updateRole(user.id, (e.target as HTMLSelectElement).value)}
									>
										<option value="coach">Coach</option>
										<option value="director">Director</option>
										<option value="player">Player</option>
										<option value="guardian">Guardian</option>
									</select>
								</div>
							</td>

							<!-- Status -->
							<td class="tw-px-4 tw-py-3.5">
								{#if (user.status || '').toLowerCase() === 'suspended'}
									<span class="tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-bg-[#ef4444]/10 tw-text-[#ef4444] tw-border tw-border-[#ef4444]/30">
										Suspended
									</span>
								{:else}
									<span class="tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/30">
										Active
									</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="tw-px-4 tw-py-3.5 tw-text-right">
								<button
									type="button"
									class="v-toolbar-btn tw-h-7 tw-px-2.5 tw-py-0 tw-text-xs tw-border-rose-500/40 tw-text-rose-400 hover:tw-border-rose-500 hover:tw-bg-rose-500/10"
									title="Remove from this organization"
									onclick={() => handleRemoveFromOrg(user)}
								>
									Remove
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal: Add / Assign User -->
{#if showAddModal}
	<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/80 tw-backdrop-blur-sm tw-p-4" role="dialog" aria-modal="true">
		<div class="tw-w-full tw-max-w-md tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-4">
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3">
				<h2 class="tw-m-0 tw-text-base tw-font-extrabold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2">
					<Icon name={"action.add" as IconName} size={16} class="tw-text-[#14b8a6]" />
					Add / Assign Member
				</h2>
				<button
					type="button"
					class="tw-text-[#94a3b8] hover:tw-text-[#FAFAFA]"
					onclick={() => (showAddModal = false)}
				>
					<Icon name={"sys.close" as IconName} />
				</button>
			</div>

			{#if addErr}
				<div class="tw-p-3 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">
					{addErr}
				</div>
			{/if}

			<div class="tw-flex tw-flex-col tw-gap-3">
				<div>
					<label for="new-user-name" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Full Name <span class="tw-text-[#ef4444]">*</span>
					</label>
					<input
						id="new-user-name"
						type="text"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
						bind:value={newName}
						placeholder="e.g. Coach Alex Johnson"
						disabled={addSaving}
					/>
				</div>

				<div>
					<label for="new-user-email" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Email Address <span class="tw-text-[#ef4444]">*</span>
					</label>
					<input
						id="new-user-email"
						type="email"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
						bind:value={newEmail}
						placeholder="alex.johnson@example.com"
						disabled={addSaving}
					/>
				</div>

				<div>
					<label for="new-user-role" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-mb-1">
						Role <span class="tw-text-[#ef4444]">*</span>
					</label>
					<select
						id="new-user-role"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
						bind:value={newRole}
						disabled={addSaving}
					>
						<option value="coach">Coach</option>
						<option value="director">Director</option>
						<option value="guardian">Guardian / Parent</option>
						<option value="player">Player / Athlete</option>
					</select>
				</div>
			</div>

			<div class="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-pt-3 tw-border-t tw-border-[#334155]">
				<button
					type="button"
					class="v-toolbar-btn"
					onclick={() => (showAddModal = false)}
					disabled={addSaving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
					onclick={handleAddUser}
					disabled={addSaving}
				>
					{addSaving ? 'Saving...' : 'Save & Assign'}
				</button>
			</div>
		</div>
	</div>
{/if}
