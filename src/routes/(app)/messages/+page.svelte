<script lang="ts">
	import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import HouseholdThreadPanel from '$lib/components/comms/HouseholdThreadPanel.svelte';
	import AnnouncementsInbox from '$lib/components/comms/AnnouncementsInbox.svelte';
	import ParentLoungePanel from '$lib/components/comms/ParentLoungePanel.svelte';
	import ReportMessageIncident from '$lib/components/comms/ReportMessageIncident.svelte';

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const clubId = $derived(profile?.clubId ? String(profile.clubId) : '');
	const teamId = $derived(profile?.teamId ? String(profile.teamId) : '');
	const householdId = $derived(profile?.householdId ? String(profile.householdId) : '');
	const showHouseholdThread = $derived(
		(role === 'parent' || role === 'player') && Boolean(householdId),
	);

	let items = $state(/** @type {Array<Record<string, unknown> & { id: string }>} */ ([]));
	let loading = $state(true);
	let inboxKind = $derived(
		role === 'parent'
			? 'parent_cc'
			: role === 'player'
				? 'player'
				: role === 'director'
					? 'director'
					: 'staff'
	);

	// Primary source: distinct (clubId, teamId) pairs from the parent's children's user docs.
	// Resolved once per session via household → child emails → user docs.
	let parentLoungeTeams = $state<Array<{ clubId: string; teamId: string }>>([]);
	let parentLoungeLoading = $state(false);

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
				// Step 1: resolve child emails from the authoritative household doc.
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

				// Step 2: read each child's user doc (fall back to player_lookup) for teamId + clubId.
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
							// per-child errors are non-fatal — skip silently
						}
					})
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

	// Merge primary (child team docs) and fallback (CC'd in_app_messages headers) sources.
	// Primary ensures lounges appear as soon as the channel is provisioned, before any messages.
	const parentLounges = $derived(
		(() => {
			if (role !== 'parent') return [] as Array<{ clubId: string; teamId: string }>;
			const seen: Record<string, true> = {};
			const result: Array<{ clubId: string; teamId: string }> = [];
			for (const t of parentLoungeTeams) {
				const key = `${t.clubId}:${t.teamId}`;
				if (!seen[key]) {
					seen[key] = true;
					result.push({ clubId: t.clubId, teamId: t.teamId });
				}
			}
			// CC-message fallback: picks up teamClubId/teamId from items when child doc lookup missed it
			for (const m of items) {
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
		})()
	);

	function formatDate(ts) {
		if (ts && typeof ts.toDate === 'function') {
			return ts.toDate().toLocaleString();
		}
		return '—';
	}

	$effect(() => {
		if (!myEmail) {
			items = [];
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;

		(async () => {
			try {
				if (role === 'player') {
					const q = query(
						collection(db, 'in_app_messages'),
						where('toPlayerEmail', '==', myEmail),
						orderBy('createdAt', 'desc'),
						limit(40)
					);
					const snap = await getDocs(q);
					const rows = [];
					snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
					if (!cancelled) items = rows;
					return;
				}

				if (role === 'parent') {
					const q = query(
						collection(db, 'in_app_messages'),
						where('ccParentEmails', 'array-contains', myEmail),
						orderBy('createdAt', 'desc'),
						limit(40)
					);
					const snap = await getDocs(q);
					const rows = [];
					snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
					if (!cancelled) items = rows;
					return;
				}

				if (role === 'director' && clubId) {
					const q = query(
						collection(db, 'in_app_messages'),
						where('teamClubId', '==', clubId),
						orderBy('createdAt', 'desc'),
						limit(60)
					);
					const snap = await getDocs(q);
					const rows = [];
					snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
					if (!cancelled) items = rows;
					return;
				}

				if (role === 'coach') {
					const tid = profile?.teamId ? String(profile.teamId) : '';
					if (!tid || tid === 'admin') {
						if (!cancelled) items = [];
						return;
					}
				const qFrom = query(
					collection(db, 'in_app_messages'),
					where('fromEmail', '==', myEmail),
					where('teamId', '==', tid),
					orderBy('createdAt', 'desc'),
					limit(40)
				);
				const snap = await getDocs(qFrom);
				const rows = [];
				snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
				if (!cancelled) items = rows;
					return;
				}

				if (role === 'super_admin' || role === 'global_admin') {
					if (!cancelled) items = [];
					return;
				}

				if (!cancelled) items = [];
			} catch (e) {
				console.error(e);
				if (!cancelled) items = [];
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="comms-hub-stack">
	{#if role !== 'super_admin' && role !== 'global_admin'}
		<div class="comms-hub-section">
			<AnnouncementsInbox />
		</div>
	{/if}

	<div class="comms-hub-stack">
		<section class="comms-hub-z3-inbox" aria-labelledby="comms-inbox-heading">
			<header class="comms-hub-z3-inbox__head">
				<h2 id="comms-inbox-heading" class="comms-hub-z3-inbox__title">Inbox</h2>
			</header>
			<div class="comms-hub-z3-inbox__body">
				{#if role === 'super_admin' || role === 'global_admin'}
					<p class="comms-hub-muted">
						Use the Coach tools → Messages tab to send mail as a team staff member. Global admins can review
						<code>messaging_audit</code> in the Firebase console.
					</p>
				{:else if loading}
					<p class="comms-hub-muted">Loading…</p>
				{:else if items.length === 0}
					<p class="comms-hub-muted">No messages yet.</p>
				{:else}
					<p class="comms-hub-hint">
						{#if inboxKind === 'parent_cc'}
							You are viewing staff messages where your account is copied because the athlete is under 13.
						{:else if inboxKind === 'player'}
							Messages from your coaching staff appear here.
						{:else if inboxKind === 'director'}
							Club-wide staff → athlete messages (read-only oversight).
						{:else}
							Messages you sent from the Coach → Messages tab.
						{/if}
					</p>
					<ul class="comms-hub-z2-msg-list">
						{#each items as m}
							<li class="comms-hub-z2-msg-card">
								<div class="comms-hub-msg-meta">
									<span class="comms-hub-msg-date">{formatDate(m.createdAt)}</span>
									{#if m.minorRecipient}
										<span class="comms-hub-badge-minor">Minor · CC policy</span>
									{/if}
								</div>
								<div class="comms-hub-msg-parties">
									<span class="comms-hub-lbl">From</span> {String(m.fromEmail ?? '—')}
									<br />
									<span class="comms-hub-lbl">To</span>
									{String(m.toPlayerName ?? '—')}
									<span class="comms-hub-subtle">({String(m.toPlayerEmail ?? '')})</span>
								</div>
								{#if inboxKind === 'parent_cc' && Array.isArray(m.ccParentEmails)}
									<div class="comms-hub-cc-line">
										<span class="comms-hub-lbl">CC (visibility)</span>
										{m.ccParentEmails.join(', ')}
									</div>
								{/if}
								<p class="comms-hub-msg-text">{String(m.body ?? '')}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		{#if showHouseholdThread}
			<HouseholdThreadPanel householdId={householdId} />
		{/if}
	</div>

	{#if role === 'parent'}
		<div class="comms-hub-stack">
			<h3 class="comms-hub-lounge-section-label">Parent Lounge</h3>
			{#if parentLounges.length === 0}
				{#if !loading && !parentLoungeLoading}
					<p class="comms-hub-muted">
						No team lounges yet — your coach will provision one once your child's team is active.
					</p>
				{/if}
			{:else}
				{#each parentLounges as lounge (`${lounge.clubId}:${lounge.teamId}`)}
					<ParentLoungePanel clubId={lounge.clubId} teamId={lounge.teamId} />
				{/each}
			{/if}
		</div>
	{/if}

	{#if (clubId || parentLoungeTeams[0]?.clubId) && role !== 'super_admin' && role !== 'global_admin'}
		<ReportMessageIncident
			clubId={clubId || parentLoungeTeams[0]?.clubId || ''}
			teamId={teamId || parentLoungeTeams[0]?.teamId || ''}
			messageKind="other"
		/>
	{/if}
</div>
