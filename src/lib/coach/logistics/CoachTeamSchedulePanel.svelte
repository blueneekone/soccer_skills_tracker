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
	let liveStreamUrl = $state('');
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
		let keys: string[] = [];
		if (notify1h) keys = [...keys, 'h1'];
		if (notify30m) keys = [...keys, 'm30'];
		if (notifyMorning) keys = [...keys, 'morning'];

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
				liveStreamUrl,
			});
			ok = 'Event scheduled successfully.';
			liveStreamUrl = '';
			title = '';
			await workoutsStore.loadForTeam(teamId);
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save event.';
		} finally {
			saving = false;
		}
	}

	function formatStart(ev: Record<string, unknown>) {
		const ts = ev.startTimestamp;
		if (typeof ts === 'number' && ts > 0) {
			const d = new Date(ts);
			return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' @ ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return '—';
	}
</script>

<div class="ops-panel tw-w-full tw-font-mono">
	<!-- Top Bar -->
	<div class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-mb-2 tw-flex-wrap">
		<div>
			<h2 class="ops-panel__title tw-flex tw-items-center tw-gap-2">
				<span class="tw-text-[#14b8a6]">TACTICAL</span> SCHEDULE & PITCH OPS
			</h2>
			<p class="ops-panel__sub">
				Deploy practice & match events, dispatch SafeSport team broadcasts, and prevent facility collisions.
			</p>
		</div>
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-[11px] tw-font-bold tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-1 tw-rounded tw-text-[#94a3b8]">
				TOTAL EVENTS: <strong class="tw-text-white">{rows.length}</strong>
			</span>
		</div>
	</div>

	<!-- 2-Column Responsive Bento Grid -->
	<div class="ops-grid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-5 tw-items-start">
		<!-- Left: Event Dispatch Form (5 cols) -->
		<div class="lg:tw-col-span-5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-lg tw-p-5 tw-shadow-lg">
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-3">
				<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-tracking-widest tw-uppercase">
					[ DISPATCH NEW EVENT ]
				</span>
			</div>

			<form class="ops-form" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
				<!-- Event Kind Toggle -->
				<div class="ops-field">
					<span class="ops-label">EVENT TYPE</span>
					<div class="tw-grid tw-grid-cols-2 tw-gap-2">
						<button
							type="button"
							class="tw-py-2 tw-px-3 tw-rounded-md tw-text-xs tw-font-bold tw-border tw-transition-all"
							style={eventKind === 'practice'
								? 'background: rgba(20, 184, 166, 0.2); border-color: #14b8a6; color: #2dd4bf;'
								: 'background: #020617; border-color: #334155; color: #94a3b8;'}
							onclick={() => (eventKind = 'practice')}
						>
							⚡ PRACTICE
						</button>
						<button
							type="button"
							class="tw-py-2 tw-px-3 tw-rounded-md tw-text-xs tw-font-bold tw-border tw-transition-all"
							style={eventKind === 'game'
								? 'background: rgba(218, 255, 10, 0.15); border-color: #daff0a; color: #daff0a;'
								: 'background: #020617; border-color: #334155; color: #94a3b8;'}
							onclick={() => (eventKind = 'game')}
						>
							🏆 MATCH / FIXTURE
						</button>
					</div>
				</div>

				<!-- Title -->
				<label class="ops-field">
					<span class="ops-label">EVENT TITLE (OPTIONAL)</span>
					<input
						class="ops-input"
						type="text"
						bind:value={title}
						maxlength="200"
						placeholder={eventKind === 'game' ? 'e.g. League Match vs Sparta FC' : 'e.g. Tactical Finishing & Set Pieces'}
					/>
				</label>

				<!-- Start Datetime -->
				<label class="ops-field">
					<span class="ops-label">DATE & KICKOFF TIME</span>
					<input class="ops-input tw-font-mono" type="datetime-local" bind:value={startLocal} required />
				</label>

				<!-- Live Stream -->
				<label class="ops-field">
					<span class="ops-label">LIVE STREAM UPLINK (OPTIONAL)</span>
					<input
						class="ops-input"
						type="url"
						bind:value={liveStreamUrl}
						maxlength="512"
						placeholder="https://youtube.com/live/… or Vimeo / Veo"
					/>
				</label>

				<!-- Reminders Box -->
				<fieldset class="ops-fieldset">
					<legend class="ops-label">DISPATCH REMINDERS</legend>
					<div class="tw-grid tw-grid-cols-2 tw-gap-2">
						{#each REMINDER_OPTIONS as opt (opt.key)}
							<label class="ops-check">
								<input
									type="checkbox"
									class="tw-accent-[#14b8a6]"
									checked={opt.key === 'h1' ? notify1h : opt.key === 'm30' ? notify30m : notifyMorning}
									onchange={(e) => {
										const on = e.currentTarget.checked;
										if (opt.key === 'h1') notify1h = on;
										else if (opt.key === 'm30') notify30m = on;
										else notifyMorning = on;
									}}
								/>
								<span>{opt.label}</span>
							</label>
						{/each}
					</div>

					<label class="ops-check ops-check--announce">
						<input type="checkbox" class="tw-accent-[#14b8a6]" bind:checked={announceToTeam} />
						<span class="tw-font-bold tw-text-[#fafafa]">SafeSport Team Broadcast (Instant Alert)</span>
					</label>
				</fieldset>

				{#if err}<p class="ops-err" role="alert">[ ERR ] {err}</p>{/if}
				{#if ok}<p class="ops-ok" role="status">[ ✓ ] {ok}</p>{/if}

				<button type="submit" class="ops-btn" disabled={!teamId || !startLocal || saving}>
					{saving ? 'TRANSMITTING EVENT…' : 'SCHEDULE & TRANSMIT EVENT'}
				</button>
			</form>
		</div>

		<!-- Right: Upcoming Events Timeline (7 cols) -->
		<div class="lg:tw-col-span-7 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-lg tw-p-5 tw-shadow-lg">
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-3">
				<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-tracking-widest tw-uppercase">
					[ UPCOMING TEAM EVENTS ]
				</span>
				<span class="tw-text-[11px] tw-text-[#94a3b8]">
					{rows.length} Scheduled
				</span>
			</div>

			{#if rows.length === 0}
				<div class="tw-p-8 tw-bg-[#020617] tw-border tw-border-dashed tw-border-[#334155] tw-rounded-lg tw-text-center">
					<p class="tw-text-xs tw-text-[#94a3b8] tw-m-0">No upcoming events scheduled for this team yet.</p>
					<p class="tw-text-[11px] tw-text-[#64748b] tw-mt-1">Fill out the dispatch terminal on the left to schedule practices or matches.</p>
				</div>
			{:else}
				<ul class="ops-list">
					{#each rows as ev (ev.id)}
						<li class="ops-list__item" class:ops-list__item--game={ev.eventKind === 'game'}>
							<div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
								<div class="tw-flex tw-items-center tw-gap-2">
									{#if ev.eventKind === 'game'}
										<span class="event-badge event-badge--game">MATCH</span>
									{:else}
										<span class="event-badge event-badge--practice">PRACTICE</span>
									{/if}
									<strong class="tw-text-sm tw-text-[#fafafa]">{ev.name || ev.title || ev.eventKind || 'Scheduled Event'}</strong>
								</div>
								<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6]">{formatStart(ev)}</span>
							</div>

							<div class="tw-flex tw-items-center tw-gap-4 tw-mt-2 tw-text-xs tw-flex-wrap">
								<span class="ops-rsvp">
									RSVP — Going: <strong class="tw-text-[#34d399]">{Number(ev.rsvpGoing ?? 0)}</strong> · 
									Out: <strong class="tw-text-[#f87171]">{Number(ev.rsvpNotGoing ?? 0)}</strong> · 
									Maybe: <strong class="tw-text-[#fbbf24]">{Number(ev.rsvpMaybe ?? 0)}</strong>
								</span>
								{#if ev.liveStreamUrl}
									<a href={ev.liveStreamUrl} target="_blank" rel="noopener noreferrer" class="ops-stream">
										🔴 Live Stream Uplink
									</a>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Pitch Booking Section -->
	{#if teamId}
		<section class="ops-facility tw-mt-6 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-lg tw-p-5 tw-shadow-lg" aria-labelledby="ops-facility-h">
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-3">
				<h3 id="ops-facility-h" class="tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-tracking-widest tw-uppercase tw-m-0">
					[ PITCH COLLISION AVOIDANCE & FACILITY BOOKING ]
				</h3>
				<span class="tw-text-[11px] tw-text-[#94a3b8]">Live Radar Active</span>
			</div>
			<FacilityScheduler {teamId} />
		</section>
	{/if}
</div>

<style>
	.ops-panel { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
	.ops-panel__title { margin: 0; font-size: 16px; font-weight: 900; color: #fafafa; letter-spacing: 0.05em; }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #94a3b8; max-width: 48rem; }
	.ops-form { display: flex; flex-direction: column; gap: 12px; }
	.ops-field { display: flex; flex-direction: column; gap: 6px; }
	.ops-fieldset { border: 1px solid #334155; border-radius: 8px; padding: 12px; margin: 0; background: #020617; }
	.ops-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
	.ops-input {
		border: 1px solid #334155; border-radius: 6px; padding: 8px 12px;
		font-size: 13px; background: #020617; color: #fafafa; width: 100%; box-sizing: border-box;
	}
	.ops-input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2); }
	.ops-check { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer; }
	.ops-check--announce { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; }
	.ops-btn {
		width: 100%; border: 1px solid #14b8a6; border-radius: 6px; padding: 12px 20px;
		font-weight: 800; font-size: 12px; font-family: 'Geist Mono', monospace; letter-spacing: 0.05em;
		background: rgba(20, 184, 166, 0.15); color: #14b8a6; cursor: pointer; transition: all 0.15s; margin-top: 6px;
	}
	.ops-btn:hover:not(:disabled) { background: #14b8a6; color: #0f172a; }
	.ops-btn:disabled { opacity: 0.45; cursor: not-allowed; }
	.ops-err { margin: 0; font-size: 11px; color: #f87171; }
	.ops-ok { margin: 0; font-size: 11px; color: #34d399; }
	.ops-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
	.ops-list__item {
		border: 1px solid #334155; border-radius: 8px; padding: 12px 14px;
		display: flex; flex-direction: column; gap: 6px; background: #020617;
		transition: border-color 0.15s;
	}
	.ops-list__item:hover { border-color: #14b8a6; }
	.ops-list__item--game { border-left: 4px solid #daff0a; }
	.event-badge {
		font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;
	}
	.event-badge--practice { background: rgba(20, 184, 166, 0.2); color: #2dd4bf; border: 1px solid #14b8a6; }
	.event-badge--game { background: rgba(218, 255, 10, 0.2); color: #daff0a; border: 1px solid #daff0a; }
	.ops-rsvp { font-size: 11px; color: #94a3b8; font-family: 'Geist Mono', monospace; }
	.ops-stream { font-size: 11px; color: #f87171; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
	.ops-facility { margin-top: 16px; }
</style>

