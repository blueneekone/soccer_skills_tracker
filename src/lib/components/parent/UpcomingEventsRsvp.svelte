<script lang="ts">
	import { db, functions, auth } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		query,
		where,
		limit,
	} from 'firebase/firestore';

	let {
		childEmails = [],
		childNames = {},
	}: {
		childEmails?: string[];
		childNames?: Record<string, string>;
	} = $props();

	type RsvpStatus = 'going' | 'not_going' | 'maybe';

	/** @type {Array<{ id: string; name: string; kind: string; startLabel: string; teamId: string }>} */
	let events = $state([]);
	let loading = $state(true);
	let err = $state('');
	/** @type {Record<string, RsvpStatus | ''>} */
	let statusByKey = $state({});
	let busyKey = $state('');

	const setEventRsvp = httpsCallable(functions, 'setEventRsvp');

	$effect(() => {
		const emails = childEmails.filter(Boolean);
		if (emails.length === 0) {
			events = [];
			loading = false;
			return;
		}
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				/** @type {typeof events} */
				const found = [];
				const teamIds = new Set<string>();
				for (const em of emails) {
					const u = await getDoc(doc(db, 'users', em));
					const tid =
						u.exists() && typeof u.data()?.teamId === 'string' ? u.data()!.teamId!.trim() : '';
					if (tid) teamIds.add(tid);
					const pl = await getDoc(doc(db, 'player_lookup', em));
					const plTeam =
						pl.exists() && typeof pl.data()?.teamId === 'string'
							? pl.data()!.teamId!.trim()
							: '';
					if (plTeam) teamIds.add(plTeam);
				}
				for (const teamId of teamIds) {
					const q = query(
						collection(db, 'team_workouts'),
						where('teamId', '==', teamId),
						limit(24),
					);
					const snap = await getDocs(q);
					for (const d of snap.docs) {
						const data = d.data();
						if (data.recordType !== 'scheduled_event' && data.type !== 'scheduled') continue;
						const startTs = Number(data.startTimestamp) || 0;
						if (startTs > 0 && startTs < Date.now() - 86_400_000) continue;
						found.push({
							id: d.id,
							name: String(data.name || data.title || 'Team event'),
							kind: String(data.eventKind || 'practice'),
							startLabel: startTs > 0 ? new Date(startTs).toLocaleString() : '—',
							teamId,
						});
					}
				}
				found.sort((a, b) => a.startLabel.localeCompare(b.startLabel));
				if (!cancelled) events = found.slice(0, 6);
			} catch (e) {
				if (!cancelled) err = e instanceof Error ? e.message : 'Could not load schedule.';
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function submitRsvp(eventId: string, playerEmail: string, status: RsvpStatus) {
		if (!auth.currentUser) return;
		const key = `${eventId}:${playerEmail}`;
		busyKey = key;
		err = '';
		try {
			await setEventRsvp({ eventId, playerEmail, status });
			statusByKey = { ...statusByKey, [key]: status };
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save RSVP.';
		} finally {
			busyKey = '';
		}
	}

	function labelFor(email: string) {
		return childNames[email] || email.split('@')[0];
	}
</script>

<section class="parent-rsvp" aria-labelledby="parent-rsvp-title">
	<h3 id="parent-rsvp-title" class="parent-rsvp__title">Upcoming — availability</h3>
	<p class="parent-rsvp__sub">Confirm whether your athlete can attend practices and games.</p>

	{#if loading}
		<p class="parent-rsvp__muted">Loading schedule…</p>
	{:else if childEmails.length === 0}
		<p class="parent-rsvp__muted">
			Link an athlete on <a href="/parent/household" class="parent-rsvp__link">Household</a> to RSVP.
		</p>
	{:else if events.length === 0}
		<p class="parent-rsvp__muted">No upcoming team events yet.</p>
	{:else}
		<ul class="parent-rsvp__list">
			{#each events as ev (ev.id)}
				{#each childEmails as childEmail (ev.id + childEmail)}
					{@const key = `${ev.id}:${childEmail}`}
					{@const current = statusByKey[key] || ''}
					<li class="parent-rsvp__item">
						<div class="parent-rsvp__meta">
							<strong>{ev.name}</strong>
							<span class="parent-rsvp__when">{ev.startLabel} · {ev.kind}</span>
							<span class="parent-rsvp__who">{labelFor(childEmail)}</span>
						</div>
						<div class="parent-rsvp__actions" role="group" aria-label="RSVP for {labelFor(childEmail)}">
							{#each [
								{ id: 'going', label: 'Going' },
								{ id: 'not_going', label: 'Out' },
								{ id: 'maybe', label: 'Maybe' },
							] as opt (opt.id)}
								<button
									type="button"
									class="parent-rsvp__btn"
									class:parent-rsvp__btn--active={current === opt.id}
									disabled={busyKey === key}
									onclick={() => submitRsvp(ev.id, childEmail, opt.id as RsvpStatus)}
								>
									{opt.label}
								</button>
							{/each}
						</div>
					</li>
				{/each}
			{/each}
		</ul>
	{/if}
	{#if err}
		<p class="parent-rsvp__err" role="alert">{err}</p>
	{/if}
</section>

<style>
	.parent-rsvp {
		border: 1px solid rgba(51, 65, 85, 0.45);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		background: rgba(15, 23, 42, 0.4);
	}

	.parent-rsvp__title {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.parent-rsvp__sub {
		margin: 0 0 0.85rem;
		font-size: 0.8125rem;
		color: #94a3b8;
	}

	.parent-rsvp__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.parent-rsvp__item {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.65rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.15);
	}

	.parent-rsvp__item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.parent-rsvp__meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.parent-rsvp__when,
	.parent-rsvp__who {
		font-size: 0.75rem;
		color: #64748b;
	}

	.parent-rsvp__actions {
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.parent-rsvp__btn {
		padding: 0.35rem 0.55rem;
		border-radius: 6px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: transparent;
		color: #cbd5e1;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
	}

	.parent-rsvp__btn--active {
		border-color: rgba(20, 184, 166, 0.5);
		background: rgba(20, 184, 166, 0.12);
		color: #5eead4;
	}

	.parent-rsvp__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.parent-rsvp__muted {
		margin: 0;
		font-size: 0.8125rem;
		color: #64748b;
	}

	.parent-rsvp__link {
		color: #2dd4bf;
	}

	.parent-rsvp__err {
		margin: 0.65rem 0 0;
		color: #fca5a5;
		font-size: 0.8125rem;
	}
</style>
