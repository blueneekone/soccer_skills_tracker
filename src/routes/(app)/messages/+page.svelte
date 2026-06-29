<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import CommsHubShell from '$lib/components/comms/CommsHubShell.svelte';

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const clubId = $derived(profile?.clubId ? String(profile.clubId) : '');
	const householdId = $derived(profile?.householdId ? String(profile.householdId) : '');

	let dmItems = $state(/** @type {Array<Record<string, unknown> & { id: string }>} */ ([]));
	let dmLoading = $state(true);
	let inboxKind = $derived(
		role === 'parent'
			? 'parent_cc'
			: role === 'player'
				? 'player'
				: role === 'director'
					? 'director'
					: 'staff',
	);

	let parentLoungeTeams = $state<Array<{ clubId: string; teamId: string }>>([]);
	let parentLoungeLoading = $state(false);

	$effect(() => {
		if (!browser || role !== 'coach') return;
		const params = untrack(() => page.url.searchParams);
		const qs = new URLSearchParams();
		qs.set('tab', 'comms');
		for (const key of ['channel', 'teamId', 'sub', 'section'] as const) {
			const value = params.get(key);
			if (value) qs.set(key, value);
		}
		if (params.get('channel') === 'parent_coach_dm' && !params.get('section')) {
			qs.set('section', 'parents');
		}
		untrack(() => void goto(`/coach/logistics?${qs.toString()}`, { replaceState: true }));
	});

	$effect(() => {
		if (role !== 'parent' || !householdId) {
			parentLoungeTeams = [];
			parentLoungeLoading = false;
			return;
		}

		let cancelled = false;
		parentLoungeLoading = true;

		(async () => {
			try {
				const hSnap = await getDoc(doc(db, 'households', householdId));
				if (cancelled) return;
				if (!hSnap.exists()) {
					parentLoungeLoading = false;
					return;
				}
				const rawEmails: unknown[] = hSnap.data().playerEmails ?? [];
				const childEmails = rawEmails
					.map((e) => String(e ?? '').trim().toLowerCase())
					.filter(Boolean);

				if (!childEmails.length) {
					parentLoungeLoading = false;
					return;
				}

				const seen: Record<string, true> = {};
				const teams: Array<{ clubId: string; teamId: string }> = [];

				await Promise.all(
					childEmails.map(async (email) => {
						try {
							const uSnap = await getDoc(doc(db, 'users', email));
							let data = uSnap.exists()
								? (uSnap.data() as Record<string, unknown>)
								: null;
							if (!data?.clubId || !data?.teamId) {
								const lSnap = await getDoc(doc(db, 'player_lookup', email));
								if (lSnap.exists()) data = lSnap.data() as Record<string, unknown>;
							}
							const cId = String(data?.clubId ?? '');
							const tId = String(data?.teamId ?? '');
							if (cId && tId) {
								const key = `${cId}:${tId}`;
								if (!seen[key]) {
									seen[key] = true;
									teams.push({ clubId: cId, teamId: tId });
								}
							}
						} catch {
							/* non-fatal */
						}
					}),
				);

				if (!cancelled) {
					parentLoungeTeams = teams;
					parentLoungeLoading = false;
				}
			} catch (e) {
				console.error('[messages] parent lounge teams load', e);
				if (!cancelled) parentLoungeLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const parentLounges = $derived(
		(() => {
			if (role !== 'parent') return [] as Array<{ clubId: string; teamId: string }>;
			const seen: Record<string, true> = {};
			const result: Array<{ clubId: string; teamId: string }> = [];
			for (const t of parentLoungeTeams) {
				const key = `${t.clubId}:${t.teamId}`;
				if (!seen[key]) {
					seen[key] = true;
					result.push(t);
				}
			}
			for (const m of dmItems) {
				const cId = String(m['teamClubId'] ?? clubId ?? '');
				const tId = String(m['teamId'] ?? '');
				if (!cId || !tId) continue;
				const key = `${cId}:${tId}`;
				if (!seen[key]) {
					seen[key] = true;
					result.push({ clubId: cId, teamId: tId });
				}
			}
			return result;
		})(),
	);

	$effect(() => {
		if (!myEmail || role === 'parent') {
			dmItems = [];
			dmLoading = false;
			return;
		}

		let cancelled = false;
		dmLoading = true;

		(async () => {
			try {
				if (role === 'player') {
					const q = query(
						collection(db, 'in_app_messages'),
						where('toPlayerEmail', '==', myEmail),
						orderBy('createdAt', 'desc'),
						limit(40),
					);
					const snap = await getDocs(q);
					const rows: Array<Record<string, unknown> & { id: string }> = [];
					snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
					if (!cancelled) dmItems = rows;
					return;
				}

				if (role === 'director' && clubId) {
					const q = query(
						collection(db, 'in_app_messages'),
						where('teamClubId', '==', clubId),
						orderBy('createdAt', 'desc'),
						limit(60),
					);
					const snap = await getDocs(q);
					const rows: Array<Record<string, unknown> & { id: string }> = [];
					snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
					if (!cancelled) dmItems = rows;
					return;
				}

				if (role === 'coach') {
					const tid = profile?.teamId ? String(profile.teamId) : '';
					if (!tid || tid === 'admin') {
						if (!cancelled) dmItems = [];
						return;
					}
					const qFrom = query(
						collection(db, 'in_app_messages'),
						where('fromEmail', '==', myEmail),
						where('teamId', '==', tid),
						orderBy('createdAt', 'desc'),
						limit(40),
					);
					const snap = await getDocs(qFrom);
					const rows: Array<Record<string, unknown> & { id: string }> = [];
					snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
					if (!cancelled) dmItems = rows;
					return;
				}

				if (!cancelled) dmItems = [];
			} catch (e) {
				console.error(e);
				if (!cancelled) dmItems = [];
			} finally {
				if (!cancelled) dmLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

{#if role === 'coach'}
	<p class="comms-hub-muted">Opening Team Ops comms…</p>
{:else if role === 'super_admin' || role === 'global_admin'}
	<p class="comms-hub-muted">
		Use the Coach tools → Messages tab to send mail as a team staff member. Global admins can review
		<code>messaging_audit</code> in the Firebase console.
	</p>
{:else}
	<CommsHubShell
		{parentLounges}
		{parentLoungeLoading}
		dmItems={dmItems}
		dmLoading={dmLoading}
		dmKind={inboxKind}
	/>
{/if}
