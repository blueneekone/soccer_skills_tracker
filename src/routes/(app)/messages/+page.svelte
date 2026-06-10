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

<div class="view-section">
	<h2 class="view-title">Messages</h2>

	{#if role !== 'super_admin' && role !== 'global_admin'}
		<div class="announcements-section">
			<AnnouncementsInbox />
		</div>
	{/if}

	<div class="bento-section">
		<div class="card">
			<div class="card-header bg-green-header">Inbox</div>
			<div class="card-body inbox-body">
				{#if role === 'super_admin' || role === 'global_admin'}
					<p class="muted">
						Use the Coach tools → Messages tab to send mail as a team staff member. Global admins can review
						<code>messaging_audit</code> in the Firebase console.
					</p>
				{:else if loading}
					<p class="muted">Loading…</p>
				{:else if items.length === 0}
					<p class="muted">No messages yet.</p>
				{:else}
					<p class="inbox-hint muted">
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
					<ul class="msg-list">
						{#each items as m}
							<li class="msg-card">
								<div class="msg-meta">
									<span class="msg-date">{formatDate(m.createdAt)}</span>
									{#if m.minorRecipient}
										<span class="badge-minor">Minor · CC policy</span>
									{/if}
								</div>
								<div class="msg-parties">
									<span class="lbl">From</span> {String(m.fromEmail ?? '—')}
									<br />
									<span class="lbl">To</span>
									{String(m.toPlayerName ?? '—')}
									<span class="subtle">({String(m.toPlayerEmail ?? '')})</span>
								</div>
								{#if inboxKind === 'parent_cc' && Array.isArray(m.ccParentEmails)}
									<div class="cc-line">
										<span class="lbl">CC (visibility)</span>
										{m.ccParentEmails.join(', ')}
									</div>
								{/if}
								<p class="msg-text">{String(m.body ?? '')}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>

		{#if showHouseholdThread}
			<HouseholdThreadPanel householdId={householdId} />
		{/if}
	</div>

	{#if role === 'parent'}
		<div class="lounge-section">
			<h3 class="lounge-section-label">Parent Lounge</h3>
			{#if parentLounges.length === 0}
				{#if !loading && !parentLoungeLoading}
					<p class="muted lounge-empty">
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

<style>
	.announcements-section {
		margin-bottom: var(--bento-gap-sm, 16px);
	}

	.inbox-body {
		display: flex;
		flex-direction: column;
		gap: var(--bento-gap-sm);
	}

	.inbox-hint {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.45;
	}

	.muted {
		margin: 0;
		opacity: 0.88;
		line-height: 1.45;
	}

	.msg-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--bento-gap-sm);
	}

	.msg-card {
		padding: var(--bento-pad-sm);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.04);
	}

	:global(html.dark) .msg-card {
		background: rgba(15, 23, 42, 0.35);
	}

	.msg-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.msg-date {
		font-size: 0.8rem;
		font-weight: 700;
		opacity: 0.85;
	}

	.badge-minor {
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 4px 8px;
		border-radius: 999px;
		background: rgba(251, 191, 36, 0.2);
		color: var(--text-primary);
		border: 1px solid rgba(251, 191, 36, 0.35);
	}

	.msg-parties {
		font-size: 0.88rem;
		line-height: 1.5;
		margin-bottom: 8px;
		word-break: break-word;
	}

	.lbl {
		font-weight: 800;
		margin-right: 6px;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.8;
	}

	.subtle {
		opacity: 0.75;
		font-size: 0.8rem;
	}

	.cc-line {
		font-size: 0.82rem;
		margin-bottom: 8px;
		opacity: 0.9;
		word-break: break-word;
	}

	.msg-text {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
		font-size: 0.92rem;
	}

	.lounge-section {
		margin-top: var(--bento-gap-sm, 16px);
		display: flex;
		flex-direction: column;
		gap: var(--bento-gap-sm, 16px);
	}

	.lounge-section-label {
		margin: 0 0 4px;
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.7;
	}

	.lounge-empty {
		font-size: 0.88rem;
		padding: 12px 0;
	}
</style>
