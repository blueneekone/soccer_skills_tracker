<script lang="ts">
	import { auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		loadHouseholdScheduleEvents,
		filterEventsThisWeek,
		type HouseholdScheduleEvent,
	} from '$lib/parent/loadHouseholdScheduleEvents.js';

	let {
		childEmails = [],
		childNames = {},
	}: {
		childEmails?: string[];
		childNames?: Record<string, string>;
	} = $props();

	type RsvpStatus = 'going' | 'not_going' | 'maybe';

	let weekEvents = $state<HouseholdScheduleEvent[]>([]);
	let loading = $state(true);
	let err = $state('');
	let statusByKey = $state<Record<string, RsvpStatus | ''>>({});
	let busyKey = $state('');

	const setEventRsvp = httpsCallable(functions, 'setEventRsvp');
	const primaryChild = $derived(childEmails[0] ?? '');

	const displayEvents = $derived(
		weekEvents.map((ev) => ({
			...ev,
			dayLabel: new Date(ev.startMs).toLocaleDateString(undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
			}),
			timeLabel: new Date(ev.startMs).toLocaleTimeString(undefined, {
				hour: 'numeric',
				minute: '2-digit',
			}),
		})),
	);

	$effect(() => {
		const emails = childEmails.filter(Boolean);
		if (emails.length === 0) {
			weekEvents = [];
			loading = false;
			return;
		}
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const all = await loadHouseholdScheduleEvents(emails, {
					horizonDays: 14,
					maxEvents: 48,
				});
				if (!cancelled) weekEvents = filterEventsThisWeek(all);
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

	async function submitRsvp(eventId: string, status: RsvpStatus) {
		if (!auth.currentUser || !primaryChild) return;
		const key = `${eventId}:${primaryChild}`;
		busyKey = key;
		err = '';
		try {
			await setEventRsvp({ eventId, playerEmail: primaryChild, status });
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

<section class="parent-week" aria-labelledby="parent-week-title">
	<h3 id="parent-week-title" class="parent-week__title">This week</h3>
	<p class="parent-week__sub">
		{#if primaryChild}
			Quick RSVP for {labelFor(primaryChild)} — full household RSVP below.
		{:else}
			Link an athlete to see this week&apos;s schedule.
		{/if}
	</p>

	{#if loading}
		<p class="parent-week__muted">Loading…</p>
	{:else if childEmails.length === 0}
		<p class="parent-week__muted">
			<a href="/parent/household" class="parent-week__link">Household</a> required.
		</p>
	{:else if displayEvents.length === 0}
		<p class="parent-week__muted">No events in the next 7 days.</p>
	{:else}
		<ul class="parent-week__list">
			{#each displayEvents as ev (ev.id)}
				{@const key = `${ev.id}:${primaryChild}`}
				{@const current = statusByKey[key] || ''}
				<li class="parent-week__item">
					<div class="parent-week__when">
						<span class="parent-week__day">{ev.dayLabel}</span>
						<span class="parent-week__time">{ev.timeLabel}</span>
					</div>
					<div class="parent-week__meta">
						<strong>{ev.name}</strong>
						<span class="parent-week__kind">{ev.kind}</span>
					</div>
					<div class="parent-week__actions" role="group" aria-label="RSVP">
						{#each [
							{ id: 'going', label: 'Going' },
							{ id: 'not_going', label: 'Out' },
							{ id: 'maybe', label: 'Maybe' },
						] as opt (opt.id)}
							<button
								type="button"
								class="parent-week__btn"
								class:parent-week__btn--active={current === opt.id}
								disabled={busyKey === key}
								onclick={() => submitRsvp(ev.id, opt.id as RsvpStatus)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
	{#if err}
		<p class="parent-week__err" role="alert">{err}</p>
	{/if}
</section>

<style>
	.parent-week {
		border: 1px solid rgba(51, 65, 85, 0.45);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		background: rgba(15, 23, 42, 0.55);
	}

	.parent-week__title {
		margin: 0 0 0.2rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.parent-week__sub {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: #94a3b8;
	}

	.parent-week__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.parent-week__item {
		display: grid;
		grid-template-columns: minmax(5.5rem, auto) 1fr auto;
		gap: 0.65rem;
		align-items: center;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.12);
	}

	.parent-week__item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.parent-week__when {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.parent-week__day {
		font-size: 0.75rem;
		font-weight: 700;
		color: #e2e8f0;
	}

	.parent-week__time {
		font-size: 0.6875rem;
		color: #64748b;
	}

	.parent-week__meta {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.parent-week__meta strong {
		font-size: 0.8125rem;
		color: #f1f5f9;
	}

	.parent-week__kind {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.parent-week__actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.parent-week__btn {
		padding: 0.28rem 0.45rem;
		border-radius: 6px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: transparent;
		color: #cbd5e1;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		cursor: pointer;
	}

	.parent-week__btn--active {
		border-color: rgba(20, 184, 166, 0.5);
		background: rgba(20, 184, 166, 0.12);
		color: #5eead4;
	}

	.parent-week__btn:disabled {
		opacity: 0.5;
	}

	.parent-week__muted {
		margin: 0;
		font-size: 0.8125rem;
		color: #64748b;
	}

	.parent-week__link {
		color: #2dd4bf;
	}

	.parent-week__err {
		margin: 0.55rem 0 0;
		font-size: 0.8125rem;
		color: #fca5a5;
	}

	@media (max-width: 640px) {
		.parent-week__item {
			grid-template-columns: 1fr;
		}
	}
</style>
