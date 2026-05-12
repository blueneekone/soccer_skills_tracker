<script>
	import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const clubId = $derived(profile?.clubId ? String(profile.clubId) : '');

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
						orderBy('createdAt', 'desc'),
						limit(40)
					);
					const snap = await getDocs(qFrom);
					const rows = [];
					snap.forEach((d) => {
						const x = d.data();
						if (x.teamId === tid) rows.push({ id: d.id, ...x });
					});
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
	</div>
</div>

<style>
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
</style>
