<script lang="ts">
	import { saveTeamScheduledEvent, REMINDER_OPTIONS, workoutsStore } from '$lib/stores/workouts.svelte.js';
	import FacilityScheduler from '$lib/components/coach/FacilityScheduler.svelte';

	let { teamId = '' } = $props();

	let eventKind = $state<'game' | 'practice'>('practice');
	let title = $state('');
	let startLocal = $state('');
	let notify1h = $state(false);
	let notify30m = $state(true);
	let notifyMorning = $state(false);
	let announceToTeam = $state(false);
	let saving = $state(false);
	let err = $state('');
	let ok = $state('');

	const rows = $derived(workoutsStore.scheduledEvents);

	$effect(() => {
		if (teamId) void workoutsStore.loadForTeam(teamId);
	});

	async function submit() {
		if (!teamId || !startLocal) {
			err = 'Choose a start date and time.';
			return;
		}
		const start = new Date(startLocal);
		if (Number.isNaN(start.getTime())) {
			err = 'Invalid start time.';
			return;
		}
		const keys: string[] = [];
		if (notify1h) keys.push('h1');
		if (notify30m) keys.push('m30');
		if (notifyMorning) keys.push('morning');

		saving = true;
		err = '';
		ok = '';
		try {
			await saveTeamScheduledEvent({
				teamId,
				eventKind: eventKind,
				title,
				startAt: start,
				reminderKeys: keys,
				source: 'coach_form',
				announceToTeam,
			});
			ok = 'Event saved.';
			await workoutsStore.loadForTeam(teamId);
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save event.';
		} finally {
			saving = false;
		}
	}

	function formatStart(ev: Record<string, unknown>) {
		const ts = ev.startTimestamp;
		if (typeof ts === 'number' && ts > 0) return new Date(ts).toLocaleString();
		return '—';
	}
</script>

<div class="ops-panel">
	<h2 class="ops-panel__title">Schedule</h2>
	<p class="ops-panel__sub">Practice and game events with optional reminders and team announcements.</p>

	<div class="ops-panel__grid">
		<form class="ops-form" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
			<label class="ops-field">
				<span class="ops-label">Event type</span>
				<select class="ops-input" bind:value={eventKind}>
					<option value="practice">Practice</option>
					<option value="game">Game</option>
				</select>
			</label>
			<label class="ops-field">
				<span class="ops-label">Title (optional)</span>
				<input class="ops-input" type="text" bind:value={title} maxlength="200" placeholder="Scrimmage vs North" />
			</label>
			<label class="ops-field">
				<span class="ops-label">Start</span>
				<input class="ops-input" type="datetime-local" bind:value={startLocal} required />
			</label>
			<fieldset class="ops-fieldset">
				<legend class="ops-label">Reminders</legend>
				{#each REMINDER_OPTIONS as opt (opt.key)}
					<label class="ops-check">
						<input
							type="checkbox"
							checked={opt.key === 'h1' ? notify1h : opt.key === 'm30' ? notify30m : notifyMorning}
							onchange={(e) => {
								const on = e.currentTarget.checked;
								if (opt.key === 'h1') notify1h = on;
								else if (opt.key === 'm30') notify30m = on;
								else notifyMorning = on;
							}}
						/>
						{opt.label}
					</label>
				{/each}
				<label class="ops-check ops-check--announce">
					<input type="checkbox" bind:checked={announceToTeam} />
					Announce to team (SafeSport broadcast)
				</label>
			</fieldset>
			{#if err}<p class="ops-err" role="alert">{err}</p>{/if}
			{#if ok}<p class="ops-ok" role="status">{ok}</p>{/if}
			<button type="submit" class="ops-btn" disabled={!teamId || !startLocal || saving}>
				{saving ? 'Saving…' : 'Save event'}
			</button>
		</form>

		<div class="ops-list-wrap">
			<h3 class="ops-list__title">Upcoming events</h3>
			{#if rows.length === 0}
				<p class="ops-muted">No scheduled events for this team yet.</p>
			{:else}
				<ul class="ops-list">
					{#each rows as ev (ev.id)}
						<li class="ops-list__item">
							<strong>{ev.name || ev.eventKind || 'Event'}</strong>
							<span class="ops-muted">{formatStart(ev)}</span>
							{#if ev.reminderOffsets?.length}
								<span class="ops-tag">Reminders: {JSON.stringify(ev.reminderOffsets)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	{#if teamId}
		<section class="ops-facility" aria-labelledby="ops-facility-h">
			<h2 id="ops-facility-h" class="ops-panel__title">Pitch booking</h2>
			<p class="ops-panel__sub">
				Check availability and book practice or fixture blocks without double-booking the pitch.
			</p>
			<FacilityScheduler {teamId} />
		</section>
	{/if}
</div>

<style>
	.ops-panel { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
	.ops-panel__title { margin: 0; font-size: 15px; font-weight: 800; color: var(--text-primary, #0f172a); }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #64748b; max-width: 40rem; }
	.ops-panel__grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
	@media (min-width: 900px) { .ops-panel__grid { grid-template-columns: 1fr 1fr; } }
	.ops-form { display: flex; flex-direction: column; gap: 10px; }
	.ops-field { display: flex; flex-direction: column; gap: 4px; }
	.ops-fieldset { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; margin: 0; }
	.ops-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
	.ops-input { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; font-size: 13px; background: #fff; }
	.ops-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; margin-top: 6px; }
	.ops-check--announce { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
	.ops-btn { align-self: flex-start; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; font-size: 13px; background: #0f172a; color: #fff; cursor: pointer; }
	.ops-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.ops-err { margin: 0; font-size: 12px; color: #b91c1c; }
	.ops-ok { margin: 0; font-size: 12px; color: #15803d; }
	.ops-list-wrap { min-width: 0; }
	.ops-list__title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #334155; }
	.ops-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	.ops-list__item { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; background: #f8fafc; }
	.ops-muted { font-size: 12px; color: #64748b; margin: 0; }
	.ops-tag { font-size: 11px; color: #475569; font-family: ui-monospace, monospace; }
	.ops-facility { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
</style>
