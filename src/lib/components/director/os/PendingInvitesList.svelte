<script>
	import { db } from '$lib/firebase.js';
	import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let { clubId = '' } = $props();

	const INVITE_MS = 168 * 60 * 60 * 1000;

	let invites = $state(/** @type {Array<{ id: string; coachEmail: string; teamId: string; createdAt: import('firebase/firestore').Timestamp | null }>} */ ([]));
	let err = $state(/** @type {string | null} */ (null));

	function teamLabel(teamId) {
		const t = teamsStore.teams.find((x) => x.id === teamId);
		return t?.name || teamId;
	}

	function daysRemaining(createdAt) {
		if (!createdAt || typeof createdAt.toMillis !== 'function') return '—';
		const deadline = createdAt.toMillis() + INVITE_MS;
		const msLeft = deadline - Date.now();
		if (msLeft <= 0) return '0';
		return String(Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))));
	}

	$effect(() => {
		if (!clubId) {
			invites = [];
			return;
		}
		err = null;
		const q = query(
			collection(db, 'coach_invites'),
			where('clubId', '==', clubId),
			where('status', '==', 'pending'),
			orderBy('createdAt', 'desc')
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				invites = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						coachEmail: typeof x.coachEmail === 'string' ? x.coachEmail : '',
						teamId: typeof x.teamId === 'string' ? x.teamId : '',
						createdAt: x.createdAt ?? null
					};
				});
			},
			(e) => {
				console.error('[PendingInvitesList]', e);
				err = e instanceof Error ? e.message : 'Could not load invites.';
			}
		);
		return () => unsub();
	});
</script>

<div class="tw-flex tw-flex-col tw-gap-2 tw-min-h-0">
	<h4 class="tw-m-0 tw-text-sm tw-font-extrabold tw-tracking-tight" style="color: var(--text-primary);">
		Pending invites
	</h4>
	{#if err}
		<p class="tw-m-0 tw-text-xs" style="color: var(--danger-red);" role="alert">{err}</p>
	{:else if invites.length === 0}
		<p class="tw-m-0 tw-text-xs" style="color: var(--muted-slate);">No pending coach invites.</p>
	{:else}
		<ul class="tw-m-0 tw-p-0 tw-list-none tw-flex tw-flex-col tw-gap-2 tw-max-h-48 tw-overflow-y-auto director-os-shell">
			{#each invites as inv (inv.id)}
				<li
					class="tw-rounded-xl tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-border"
					style="border-color: rgba(15,23,42,0.1); background: rgba(15,23,42,0.04); color: var(--text-primary);"
				>
					<div class="tw-flex tw-flex-wrap tw-justify-between tw-gap-2">
						<span class="tw-font-bold tw-break-all">{inv.coachEmail}</span>
						<span class="tw-tabular-nums tw-text-[11px] tw-font-bold" style="color: var(--muted-slate);">
							{daysRemaining(inv.createdAt)}d left
						</span>
					</div>
					<div class="tw-mt-1 tw-text-[11px]" style="color: var(--text-secondary);">
						{teamLabel(inv.teamId)}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
