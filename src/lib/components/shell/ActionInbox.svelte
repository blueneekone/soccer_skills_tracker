<script>
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import { collection, doc, query, where, getDoc, getDocs, getCountFromServer } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** @type {{ clubId?: string, teamId?: string }} */
	let { clubId = '', teamId = '' } = $props();

	const drawer = getContext('enterpriseDrawer');

	const role = $derived(authStore.role);
	const uid = $derived(authStore.user?.uid || '');

	/** @type {Array<{ id: string, label: string, meta?: string, href: string }>} */
	let items = $state([]);
	let loading = $state(true);

	$effect(() => {
		if (!browser) return;
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
							href: '/coach?tab=videos',
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
							href: '/registrar',
						});
					}
					if (!cancelled && waiverMissing > 0) {
						next.push({
							id: 'waiver-missing',
							label: `${waiverMissing} player${waiverMissing === 1 ? '' : 's'} missing waiver${waiverMissing === 1 ? '' : 's'}`,
							meta: 'Compliance · Waivers',
							href: '/registrar',
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
							href: '/home',
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

	/**
	 * @param {typeof items[number]} row
	 */
	function activate(row) {
		drawer?.open?.({
			title: row.label,
			body: 'Use Continue for in-app navigation (no full page reload).',
			meta: row.meta ?? '',
			href: row.href,
		});
	}
</script>

<div class="ec-action-inbox" aria-label="Action inbox">
	<div class="ec-action-inbox__head">
		<i class="ph ph-tray" aria-hidden="true"></i>
		<span>Action inbox</span>
	</div>
	{#if loading}
		<p class="ec-action-inbox__muted">Loading…</p>
	{:else if items.length === 0}
		<p class="ec-action-inbox__muted">No urgent items. You’re caught up.</p>
	{:else}
		<ul class="ec-action-inbox__list">
			{#each items as row (row.id)}
				<li>
					<button
						type="button"
						class="ec-action-inbox__row"
						onclick={() => activate(row)}
					>
						<span class="ec-action-inbox__label">{row.label}</span>
						{#if row.meta}
							<span class="ec-action-inbox__meta">{row.meta}</span>
						{/if}
						<i class="ph ph-caret-right ec-action-inbox__chev" aria-hidden="true"></i>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.ec-action-inbox {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #fafafa;
		padding: 10px 12px;
		margin-bottom: 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .ec-action-inbox {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}

	.ec-action-inbox__head {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
		margin-bottom: 8px;
	}

	.ec-action-inbox__muted {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.ec-action-inbox__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ec-action-inbox__row {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 8px;
		text-align: left;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: #ffffff;
		cursor: pointer;
		font: inherit;
		color: var(--text-primary);
		transition: background 0.12s ease;
	}

	:global(html.dark) .ec-action-inbox__row {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ec-action-inbox__row:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.ec-action-inbox__label {
		font-size: 13px;
		font-weight: 600;
	}

	.ec-action-inbox__meta {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.ec-action-inbox__chev {
		color: var(--text-secondary);
		font-size: 1rem;
	}
</style>
