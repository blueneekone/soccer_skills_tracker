<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { collection, doc, query, where, getDoc, getDocs, getCountFromServer } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** @type {{ clubId?: string, teamId?: string }} */
	let { clubId = '', teamId = '' } = $props();

	const role = $derived(authStore.role);
	const uid = $derived(authStore.user?.uid || '');

	/** @type {Array<{ id: string, label: string, meta?: string, href: string }>} */
	let items = $state([]);
	let loading = $state(true);

	/** Coach dashboard mocks when inbox is empty (Liquid Glass bento). */
	const MOCK_COACH_ACTIONS = [
		{
			id: 'mock-trial',
			label: "Review Jimmy's Video Trial",
			meta: 'Trials · Verification',
			href: '/coach',
			dot: 'cyan',
		},
		{
			id: 'mock-roster',
			label: 'Approve Roster for Saturday',
			meta: 'Match day · Roster',
			href: '/coach',
			dot: 'amber',
		},
		{
			id: 'mock-waiver',
			label: 'Message Parent: Missing Waiver',
			meta: 'Compliance · Waivers',
			href: '/messages',
			dot: 'cyan',
		},
	];

	/**
	 * Rows shown in the UI: live Firestore-driven items, or coach mocks when empty.
	 * @type {Array<{ id: string, label: string, meta?: string, href: string, dot: 'cyan' | 'amber' }>}
	 */
	const displayRows = $derived.by(() => {
		if (loading) return [];
		if (items.length > 0) {
			return items.map((row, i) => ({
				...row,
				dot: i % 2 === 0 ? 'cyan' : 'amber',
			}));
		}
		if (role === 'coach') return MOCK_COACH_ACTIONS;
		return [];
	});

	$effect(() => {
		// Wait for Firebase Auth to fully initialize before firing any Firestore reads.
		// Firing before auth settles produces empty reads or permission-denied errors.
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;
		loading = true;
		let cancelled = false;
		(async () => {
			const next = [];
			try {
				if (role === 'coach' && teamId) {
					const q = query(
						collection(db, 'trial_scores'),
						where('teamId', '==', teamId),
						where('status', '==', 'pending_verification'),
					);
					let n = 0;
					try {
						const snap = await getCountFromServer(q);
						n = snap.data().count;
					} catch {
						const snap = await getDocs(q);
						n = snap.size;
					}
					if (!cancelled && n > 0) {
						next.push({
							id: 'trials',
							label: `Review ${n} pending video trial${n === 1 ? '' : 's'}`,
							meta: 'Videos · Verification',
							href: '/coach',
						});
					}
					if (!cancelled) {
						next.push({
							id: 'messages-hub',
							label: 'Open messages hub',
							meta: 'Comms · team inbox',
							href: '/messages',
						});
					}
				} else if (role === 'player' && uid) {
					const q = query(
						collection(db, 'assignments'),
						where('playerId', '==', uid),
						where('status', '==', 'pending'),
					);
					let n = 0;
					try {
						const snap = await getCountFromServer(q);
						n = snap.data().count;
					} catch {
						const snap = await getDocs(q);
						n = snap.size;
					}
					if (!cancelled && n > 0) {
						next.push({
							id: 'drills',
							label: `Complete ${n} assigned drill${n === 1 ? '' : 's'}`,
							meta: 'Training',
							href: '/tracker',
						});
					}
				} else if (role === 'director' && clubId) {
					const q = query(
						collection(db, 'coach_invites'),
						where('clubId', '==', clubId),
						where('status', '==', 'pending'),
					);
					let n = 0;
					try {
						const snap = await getCountFromServer(q);
						n = snap.data().count;
					} catch {
						const snap = await getDocs(q);
						n = snap.size;
					}
					if (!cancelled && n > 0) {
						next.push({
							id: 'invites',
							label: `${n} pending coach invite${n === 1 ? '' : 's'}`,
							meta: 'Roster & teams',
							href: '/director?tab=teams',
						});
					}

					const vpcQ = query(
						collection(db, 'vpc_requests'),
						where('clubId', '==', clubId),
						where('status', '==', 'parent_consented'),
					);
					let vpcN = 0;
					try {
						const vSnap = await getCountFromServer(vpcQ);
						vpcN = vSnap.data().count;
					} catch {
						const vSnap = await getDocs(vpcQ);
						vpcN = vSnap.size;
					}
					if (!cancelled && vpcN > 0) {
						next.push({
							id: 'vpc-approvals',
							label: `${vpcN} VPC approval${vpcN === 1 ? '' : 's'} awaiting director sign-off`,
							meta: 'Privacy · Consent',
							href: '/director?tab=household',
						});
					}
				} else if (role === 'registrar' && clubId) {
					const tSnap = await getDocs(
						query(collection(db, 'teams'), where('clubId', '==', clubId)),
					);
					const emails = new Set();
					for (const td of tSnap.docs) {
						const lq = query(collection(db, 'player_lookup'), where('teamId', '==', td.id));
						const ls = await getDocs(lq);
						ls.forEach((d) => {
							if (d.id) emails.add(d.id);
						});
					}
					let passportPending = 0;
					let waiverMissing = 0;
					for (const em of emails) {
						const ps = await getDoc(doc(db, 'passports', em));
						const data = ps.exists() ? ps.data() : null;
						const cs = data?.clearanceStatus;
						if (cs === 'PENDING_SAFESPORT') passportPending++;
						if (!data || data.hasSignedWaiver !== true) waiverMissing++;
					}
					if (!cancelled && passportPending > 0) {
						next.push({
							id: 'passport-pending',
							label: `${passportPending} passport${passportPending === 1 ? '' : 's'} pending verification`,
							meta: 'Compliance · Passports',
							href: '/director?tab=registrars',
						});
					}
					if (!cancelled && waiverMissing > 0) {
						next.push({
							id: 'waiver-missing',
							label: `${waiverMissing} player${waiverMissing === 1 ? '' : 's'} missing waiver${waiverMissing === 1 ? '' : 's'}`,
							meta: 'Compliance · Waivers',
							href: '/director?tab=registrars',
						});
					}
				} else if (role === 'parent' && authStore.userProfile?.playerName) {
					const pn = authStore.userProfile.playerName;
					const q = query(collection(db, 'assignments'), where('player', '==', pn));
					const snap = await getDocs(q);
					let n = 0;
					snap.forEach((d) => {
						const st = d.data().status;
						if (st === 'active' || st === 'pending') n++;
					});
					if (!cancelled && n > 0) {
						next.push({
							id: 'hw',
							label: `${n} household assignment${n === 1 ? '' : 's'} to complete`,
							meta: 'Household',
							href: '/parent/vpc',
						});
					}
				}
			} catch (e) {
				console.error('[ActionInbox]', e);
			}
			if (!cancelled) {
				items = next;
				loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function navigateTo(href) {
		if (!href) return;
		await goto(resolve(href));
	}
</script>

<div
	class="ai-root vanguard-card"
	aria-label="Priority actions inbox"
>
	<h2 class="ai-heading">Priority actions</h2>

	{#if loading}
		<p class="ai-status">Loading…</p>
	{:else if displayRows.length === 0}
		<p class="ai-status">No urgent items. You're caught up.</p>
	{:else}
		<ul class="ai-list">
			{#each displayRows as row (row.id)}
				<li>
					<a
						href={resolve(row.href)}
						class="ai-row"
						onclick={(event) => {
							event.preventDefault();
							void navigateTo(row.href);
						}}
					>
						<span
							class="ai-dot {row.dot === 'cyan'
								? 'ai-dot--cyan'
								: 'ai-dot--amber'}"
							aria-hidden="true"
						></span>
						<span class="ai-text">
							<span class="ai-label">{row.label}</span>
							{#if row.meta}
								<span class="ai-meta">{row.meta}</span>
							{/if}
						</span>
						<Icon name="nav.chevron-right" size={14} class="ai-caret" />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.ai-root {
		padding: 1.5rem;
		border-radius: 1rem;
	}

	.ai-heading {
		margin: 0 0 1rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #9ca3af;
	}

	.ai-status {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.ai-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ai-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		text-decoration: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.ai-row:hover {
		border-color: var(--vanguard-border);
		background: rgba(0, 240, 255, 0.04);
	}

	.ai-dot {
		width: 0.5rem;
		height: 0.5rem;
		flex-shrink: 0;
		border-radius: 50%;
	}

	.ai-dot--cyan {
		background: var(--vanguard-cyan);
		box-shadow: 0 0 10px var(--vanguard-cyan);
	}

	.ai-dot--amber {
		background: #fbbf24;
		box-shadow: 0 0 10px rgba(251, 191, 36, 0.7);
	}

	.ai-text {
		flex: 1;
		min-width: 0;
	}

	.ai-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #f3f4f6;
	}

	.ai-meta {
		display: block;
		margin-top: 0.125rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.ai-caret {
		flex-shrink: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}
</style>