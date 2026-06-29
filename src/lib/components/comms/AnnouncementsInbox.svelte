<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		doc,
		getDoc,
		limit,
		onSnapshot,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';

	let {
		teamId: teamIdOverride = '',
		readOnlyStrip = false,
	}: {
		teamId?: string;
		readOnlyStrip?: boolean;
	} = $props();

	type Announcement = {
		id: string;
		teamId: string;
		fromEmail: string;
		fromRole: string;
		subject: string | null;
		body: string;
		bodyPreview: string;
		recipientCount?: number;
		hasMinors?: boolean;
		requiresAck?: boolean;
		ackDeadline?: { toDate?: () => Date };
		createdAt?: { toDate?: () => Date };
	};

	const engine = new CommsEngine();

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const myUid = $derived(authStore.user?.uid ?? '');

	let items = $state<Announcement[]>([]);
	let loading = $state(true);
	let error = $state('');
	/** @type {Record<string, boolean>} */
	let ackedById = $state({});
	let ackSubmitting = $state('');
	let ackError = $state('');

	function mapAnnouncement(id: string, x: Record<string, unknown>): Announcement {
		return {
			id,
			teamId: String(x.teamId || ''),
			fromEmail: String(x.fromEmail || ''),
			fromRole: String(x.fromRole || ''),
			subject: x.subject ? String(x.subject) : null,
			body: String(x.body || ''),
			bodyPreview: String(x.bodyPreview || ''),
			recipientCount: typeof x.recipientCount === 'number' ? x.recipientCount : undefined,
			hasMinors: x.hasMinors === true,
			requiresAck: x.requiresAck === true,
			ackDeadline: x.ackDeadline as Announcement['ackDeadline'],
			createdAt: x.createdAt as Announcement['createdAt'],
		};
	}

	async function refreshParentAcks(announcements: Announcement[]) {
		if (!myUid || role !== 'parent') return;
		const next: Record<string, boolean> = { ...ackedById };
		const pending = announcements.filter(
			(ann) => ann.requiresAck && !(ann.id in ackedById),
		);
		if (pending.length === 0) return;
		for (const ann of pending) {
			try {
				const snap = await getDoc(doc(db, 'broadcast_acknowledgements', `${ann.id}_${myUid}`));
				next[ann.id] = snap.exists();
			} catch {
				next[ann.id] = false;
			}
		}
		ackedById = next;
	}

	let ackRefreshTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleAckRefresh(announcements: Announcement[]) {
		if (role !== 'parent') return;
		if (ackRefreshTimer) clearTimeout(ackRefreshTimer);
		ackRefreshTimer = setTimeout(() => {
			ackRefreshTimer = null;
			void refreshParentAcks(announcements);
		}, 300);
	}

	async function acknowledge(ann: Announcement) {
		if (!ann.requiresAck || ackedById[ann.id] || ackSubmitting) return;
		ackError = '';
		ackSubmitting = ann.id;
		try {
			await engine.acknowledgeBroadcast({ messageId: ann.id, teamId: ann.teamId });
			ackedById = { ...ackedById, [ann.id]: true };
		} catch (e) {
			ackError = e instanceof Error ? e.message : 'Could not record acknowledgment.';
		} finally {
			ackSubmitting = '';
		}
	}

	function fmtDeadline(ts?: { toDate?: () => Date }) {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			return ts.toDate().toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			});
		} catch {
			return '';
		}
	}

	$effect(() => {
		if (!browser || !myEmail || !role) {
			items = [];
			loading = false;
			return;
		}

		const teamId = teamIdOverride?.trim() || (profile?.teamId ? String(profile.teamId) : '');
		const isStaff = role === 'coach' || role === 'director';

		// Roles without an announcements surface
		if (role === 'super_admin' || role === 'global_admin') {
			items = [];
			loading = false;
			return;
		}

		// Staff and player need a teamId to scope the query
		if ((isStaff || role === 'player') && !teamId) {
			items = [];
			loading = false;
			return;
		}

		loading = true;
		error = '';

		let q;
		if (role === 'player') {
			q = query(
				collection(db, 'team_broadcasts'),
				where('teamId', '==', teamId),
				orderBy('createdAt', 'desc'),
				limit(20),
			);
		} else if (role === 'parent') {
			const seen = new Set<string>();
			const rows: Announcement[] = [];
			let legacyUnsub: (() => void) | null = null;
			let legacyAttached = false;

			const publish = () => {
				rows.sort((a, b) => {
					const at = a.createdAt?.toDate?.()?.getTime() ?? 0;
					const bt = b.createdAt?.toDate?.()?.getTime() ?? 0;
					return bt - at;
				});
				items = rows.slice(0, 20);
				loading = false;
			};

			const mergeRows = (
				snap: { forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) => void },
			) => {
				snap.forEach((d) => {
					if (seen.has(d.id)) return;
					seen.add(d.id);
					const x = d.data();
					rows.push(mapAnnouncement(d.id, x));
				});
				publish();
				scheduleAckRefresh(rows.slice(0, 20));
			};

			const attachLegacyListener = () => {
				if (legacyAttached) return;
				legacyAttached = true;
				const qLegacy = query(
					collection(db, 'team_broadcasts'),
					where('ccParentEmails', 'array-contains', myEmail),
					orderBy('createdAt', 'desc'),
					limit(20),
				);
				legacyUnsub = onSnapshot(
					qLegacy,
					mergeRows,
					(e) => {
						error = e instanceof Error ? e.message : 'Could not load announcements.';
						loading = false;
					},
				);
			};

			const qPrimary = query(
				collection(db, 'team_broadcasts'),
				where('parentRecipientEmails', 'array-contains', myEmail),
				orderBy('createdAt', 'desc'),
				limit(20),
			);

			const unsubPrimary = onSnapshot(
				qPrimary,
				(snap) => {
					if (snap.size < 20) {
						attachLegacyListener();
					}
					mergeRows(snap);
				},
				() => {
					attachLegacyListener();
				},
			);

			return () => {
				unsubPrimary();
				legacyUnsub?.();
				if (ackRefreshTimer) {
					clearTimeout(ackRefreshTimer);
					ackRefreshTimer = null;
				}
			};
		} else {
			// coach / director — see what they sent for their own team
			q = query(
				collection(db, 'team_broadcasts'),
				where('teamId', '==', teamId),
				orderBy('createdAt', 'desc'),
				limit(20),
			);
		}

		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: Announcement[] = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push(mapAnnouncement(d.id, x));
				});
				items = rows;
				loading = false;
				scheduleAckRefresh(rows);
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load announcements.';
				loading = false;
			},
		);

		return () => unsub();
	});

	function fmtDate(ts?: { toDate?: () => Date }) {
		if (!ts || typeof ts.toDate !== 'function') return '—';
		try {
			return ts.toDate().toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			});
		} catch {
			return '—';
		}
	}
</script>

<section class="ann-root" class:ann-root--strip={readOnlyStrip} aria-labelledby="ann-heading">
	<header class="ann-head">
		<h3 id="ann-heading" class="ann-title">
			<span class="ann-icon" aria-hidden="true">📣</span> Team Announcements
		</h3>
		<p class="ann-sub">
			{#if role === 'parent'}
				Official staff announcements delivered to your guardian account.
			{:else if role === 'player'}
				Official announcements from your coaching staff.
			{:else if readOnlyStrip}
				Read-only record of announcements sent to this team.
			{:else}
				Announcements sent to your team — read-only record.
			{/if}
		</p>
	</header>

	{#if loading}
		<p class="ann-hint">Loading announcements…</p>
	{:else if error}
		<p class="ann-err" role="alert">{error}</p>
	{:else if ackError}
		<p class="ann-err" role="alert">{ackError}</p>
	{:else if items.length === 0}
		<p class="ann-hint">No team announcements yet.</p>
	{:else}
		<ul class="ann-list">
			{#each items as ann (ann.id)}
				<li class="ann-card">
					<div class="ann-meta">
						<time class="ann-date">{fmtDate(ann.createdAt)}</time>
						{#if ann.hasMinors}
							<span class="ann-badge ann-badge--minor">Minor · CC policy</span>
						{/if}
						{#if ann.requiresAck}
							<span class="ann-badge ann-badge--ack">Ack required</span>
						{/if}
						{#if ann.recipientCount !== undefined}
							<span class="ann-badge ann-badge--count">{ann.recipientCount} recipients</span>
						{/if}
					</div>
					{#if ann.subject}
						<p class="ann-subject">{ann.subject}</p>
					{/if}
					<p class="ann-body">{ann.body}</p>
					<p class="ann-from">
						<span class="lbl">From</span>
						{ann.fromEmail}
						<span class="ann-role-tag">{ann.fromRole}</span>
					</p>
					{#if role === 'parent' && ann.requiresAck}
						{#if ann.ackDeadline}
							<p class="ann-ack-deadline">Please acknowledge by {fmtDeadline(ann.ackDeadline)}</p>
						{/if}
						{#if ackedById[ann.id]}
							<p class="ann-ack-done" role="status">Acknowledged — thank you.</p>
						{:else}
							<button
								type="button"
								class="ann-ack-btn"
								disabled={ackSubmitting === ann.id}
								onclick={() => void acknowledge(ann)}
							>
								{ackSubmitting === ann.id ? 'Recording…' : 'I have read this'}
							</button>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
