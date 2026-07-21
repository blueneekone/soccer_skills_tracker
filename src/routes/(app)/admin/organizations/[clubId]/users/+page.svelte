<script lang="ts">
	import { getContext, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { db, auth, functions } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDocs,
		updateDoc,
		query,
		where,
		limit
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { signInWithCustomToken } from 'firebase/auth';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from '../adminClubCtx.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);
	const clubId = $derived(ctx?.clubId ?? '');

	interface UserRow {
		id: string;
		email?: string;
		name?: string;
		role?: string;
		createdAt?: any;
	}

	let users = $state<UserRow[]>([]);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		const id = clubId;
		if (!id) return;
		let cancelled = false;

		untrack(() => {
			loading = true;
			error = '';
		});

		void (async () => {
			try {
				if (!db || !authStore.isAuthenticated) return;
				const q = query(
					collection(db, 'users'),
					where('clubId', '==', id),
					limit(100)
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRow)).filter(u => u.role !== 'global_admin');
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

	// ── Role Mutation ──────────────────────────────────────────────────────────
	async function updateRole(userId: string, newRole: string) {
		const idx = users.findIndex(u => u.id === userId);
		if (idx === -1) return;
		
		const oldRole = users[idx].role;
		users[idx].role = newRole; // Optimistic UI update

		try {
			await updateDoc(doc(db, 'users', userId), { role: newRole });
		} catch (e) {
			console.error('Role update failed', e);
			users[idx].role = oldRole; // Rollback
			error = 'Failed to update role. See console.';
		}
	}

	// ── Impersonation ──────────────────────────────────────────────────────────
	const impersonateUserFn = httpsCallable(functions, 'impersonateUser');
	let impersonatingId = $state('');

	async function doImpersonate(user: UserRow) {
		const ok = confirm(`Begin impersonation session as ${user.name || user.email || user.id}?`);
		if (!ok) return;

		impersonatingId = user.id;
		try {
			const res = await impersonateUserFn({ targetUid: user.id, targetEmail: user.email || user.name });
			const payload = (res.data || {}) as { customToken?: string };
			if (!payload.customToken) throw new Error('Token missing from backend.');
			await signInWithCustomToken(auth, payload.customToken);
			await impersonationStore.touch();
			goto('/dashboard', { replaceState: true });
		} catch (e) {
			console.error('Impersonation failed', e);
			error = 'Impersonation failed: ' + (e instanceof Error ? e.message : String(e));
		} finally {
			impersonatingId = '';
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-p-6">
	<div class="tw-flex tw-items-center tw-justify-between">
		<h1 class="tw-m-0 tw-text-lg tw-font-bold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2">
			<Icon name={"user.group" as IconName} /> Tenant Roster
		</h1>
		<div class="tw-text-xs tw-font-bold tw-text-[#A1A1AA] tw-font-mono">
			{users.length} {users.length === 100 ? '(LIMIT 100)' : 'USERS LOADED'}
		</div>
	</div>

	{#if error}
		<p class="tw-p-4 tw-m-0 tw-rounded-none tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-bold tw-text-sm" role="alert">
			{error}
		</p>
	{/if}

	<div class="tw-w-full tw-overflow-x-auto tw-border tw-border-[#334155] tw-rounded-none tw-bg-[#020617]">
		<table class="tw-w-full tw-min-w-[800px] tw-text-left tw-border-collapse">
			<thead class="tw-sticky tw-top-0 tw-z-10 tw-bg-[#020617] tw-border-b tw-border-[#334155]">
				<tr>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">User ID</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Name / Email</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Role</th>
					<th class="tw-px-4 tw-py-3 tw-text-xs tw-font-extrabold tw-tracking-wider tw-uppercase tw-text-[#D4D4D8]">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="4" class="tw-px-4 tw-py-8 tw-text-center tw-text-sm tw-font-bold tw-text-[#A1A1AA]">
							Loading tenant users...
						</td>
					</tr>
				{:else if users.length === 0}
					<tr>
						<td colspan="4" class="tw-px-4 tw-py-8 tw-text-center tw-text-sm tw-font-bold tw-text-[#A1A1AA]">
							No users found for this organization.
						</td>
					</tr>
				{:else}
					{#each users as user (user.id)}
						<tr class="tw-border-b tw-border-[#334155] hover:tw-bg-[#0B0F19] tw-transition-colors last:tw-border-none">
							<td class="tw-px-4 tw-py-3">
								<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#FAFAFA] tw-tabular-nums">{user.id}</span>
							</td>
							<td class="tw-px-4 tw-py-3">
								<div class="tw-flex tw-flex-col">
									<span class="tw-text-sm tw-font-bold tw-text-[#FAFAFA]">{user.name || '—'}</span>
									<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA]">{user.email || '—'}</span>
								</div>
							</td>
							<td class="tw-px-4 tw-py-3">
								<select
									class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-text-xs tw-font-bold tw-px-2 tw-py-1 tw-rounded focus:tw-outline-none focus:tw-border-[#14b8a6]"
									value={user.role || ''}
									onchange={(e) => updateRole(user.id, (e.target as HTMLSelectElement).value)}
								>
									<option value="">(No role)</option>
									<option value="player">Player</option>
									<option value="guardian">Guardian</option>
									<option value="coach">Coach</option>
									<option value="director">Director</option>
								</select>
							</td>
							<td class="tw-px-4 tw-py-3">
								<button 
									type="button"
									class="tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-font-sans tw-rounded tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/20 tw-transition-colors disabled:tw-opacity-50"
									disabled={impersonatingId === user.id}
									onclick={() => doImpersonate(user)}
								>
									{impersonatingId === user.id ? 'LOGIN...' : 'LOGIN AS'}
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
