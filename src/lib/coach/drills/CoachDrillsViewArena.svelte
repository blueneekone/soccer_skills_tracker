<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { CoachDrillsViewEngine } from './CoachDrillsViewEngine.svelte.js';
	import FacilityScheduler from '$lib/components/coach/FacilityScheduler.svelte';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';

	let { engine }: { engine: CoachDrillsViewEngine } = $props();
</script>

{#if engine.pageView === 'schedule'}
	<div class="cdm-grid cdm-grid--schedule tw-font-mono" data-region="team-schedule">
		<div class="cdm-panel" aria-labelledby="cdm-sch-h">
			<div class="cdm-panel__head">
				<span class="cdm-eyebrow">Schedule</span>
				<h2 id="cdm-sch-h" class="cdm-h2">Game or practice</h2>
				<p class="cdm-muted" style="margin:0 0 1rem; font-size:0.8rem; max-width: 36rem">
					<code>reminderOffsets</code> is an array: minute values (e.g. 60, 30) and optionally the
					string <code>morning</code> for &ldquo;Morning of.&rdquo;
					<code>startTimestamp</code> is the event start in Unix milliseconds for dispatch
					timing.
				</p>
			</div>
			<div class="cdm-sch-form">
				<label class="cdm-field">
					<span class="cdm-eyebrow">Event type</span>
					<select class="cdm-select" bind:value={engine.scheduleEventKind}>
						<option value="practice">Practice</option>
						<option value="game">Game</option>
					</select>
				</label>
				<label class="cdm-field">
					<span class="cdm-eyebrow">Title (optional)</span>
					<input
						class="cdm-select"
						type="text"
						placeholder="e.g. Scrimmage vs North"
						bind:value={engine.scheduleTitle}
						maxlength="200"
					/>
				</label>
				<label class="cdm-field">
					<span class="cdm-eyebrow">Start</span>
					<input
						class="cdm-select"
						type="datetime-local"
						bind:value={engine.scheduleStartLocal}
						required
					/>
				</label>
				<fieldset class="cdm-sch-triggers">
					<legend class="cdm-eyebrow" style="margin-bottom:0.5rem">Notification triggers</legend>
					<div class="cdm-sch-toggles">
						<label class="cdm-sch-ch">
							<input type="checkbox" bind:checked={engine.schedNotify1h} />
							1 hour before
						</label>
						<label class="cdm-sch-ch">
							<input type="checkbox" bind:checked={engine.schedNotify30m} />
							30 minutes before
						</label>
						<label class="cdm-sch-ch">
							<input type="checkbox" bind:checked={engine.schedNotifyMorning} />
							Morning of
						</label>
						<label class="cdm-sch-ch cdm-sch-ch--announce" title="Sends a team broadcast message via the SafeSport comms bus">
							<input type="checkbox" bind:checked={engine.schedAnnounce} />
							Announce to team
						</label>
					</div>
				</fieldset>
				{#if engine.scheduleErr}
					<p class="cdm-err" role="alert">{engine.scheduleErr}</p>
				{/if}
				{#if engine.scheduleOk}
					<p class="cdm-ok" role="status">{engine.scheduleOk}</p>
				{/if}
				<button
					type="button"
					class="cdm-deploy"
					disabled={!engine.teamScope.selectedTeamId || !engine.scheduleStartLocal || engine.scheduleSaveBusy}
					onclick={() => void engine.submitScheduleEvent()}
				>
					{#if engine.scheduleSaveBusy}
						Saving…
					{:else}
						Save event
					{/if}
				</button>
			</div>
		</div>
		<aside class="cdm-panel cdm-panel--payload" aria-labelledby="cdm-sch-list">
			<div class="cdm-panel__head">
				<span class="cdm-eyebrow">Ingested</span>
				<h2 id="cdm-sch-list" class="cdm-h2">Scheduled for this team</h2>
			</div>
			{#if engine.scheduleRows.length === 0}
				<p class="cdm-muted">No team events in <code>team_workouts</code> yet.</p>
			{:else}
				<ul class="cdm-sch-list">
					{#each engine.scheduleRows as ev (ev.id)}
						<li class="cdm-sch-li">
							<div class="cdm-sch-li__top">
								<span class="cdm-sch-pill"
									>{String(ev.eventKind || ev.type || '—')}</span
								>
								<time class="cdm-sch-time">{engine.formatScheduleStart(/** @type {*} */ (ev))}</time>
							</div>
							<p class="cdm-sch-name">{String(ev.name || '—')}</p>
							<p class="cdm-sch-meta">
								<span>reminderOffsets: {JSON.stringify(ev.reminderOffsets || [])}</span>
								<br />
								<span class="cdm-mono"
									>startTimestamp: {String(ev.startTimestamp != null ? ev.startTimestamp : '—')}</span
								>
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
	{#if engine.teamScope.selectedTeamId}
		<section class="cdm-panel cdm-panel--facility" aria-labelledby="cdm-facility-h">
			<div class="cdm-panel__head">
				<span class="cdm-eyebrow">Field booking</span>
				<h2 id="cdm-facility-h" class="cdm-h2">Facility scheduler</h2>
				<p class="cdm-muted" style="margin:0; font-size:0.8rem; max-width: 36rem">
					Check pitch availability and book practice or fixture blocks without double-booking.
				</p>
			</div>
			<FacilityScheduler teamId={engine.teamScope.selectedTeamId} />
		</section>
	{/if}
{:else if engine.pageView === 'designer'}
	<div class="tw-p-4 tw-w-full">
		<DrillDesignerTab
			teamId={engine.teamScope.selectedTeamId || ''}
			onDrillSaved={() => {
				engine.reloadCounter++;
				engine.pageView = 'library';
			}}
		/>
	</div>
{:else}
	<nav class="coach-drill-z4-tabs" aria-label="Drill library sections">
		<button
			type="button"
			class="coach-drill-z4-tab"
			class:coach-drill-z4-tab--active={engine.activeTab === 'team'}
			onclick={() => (engine.activeTab = 'team')}
		>
			Custom drills
			<span class="coach-drill-z4-tab__count tw-font-mono">{engine.teamDrills.length}</span>
		</button>
		<button
			type="button"
			class="coach-drill-z4-tab"
			class:coach-drill-z4-tab--active={engine.activeTab === 'platform'}
			onclick={() => (engine.activeTab = 'platform')}
		>
			Platform basics
			<span class="coach-drill-z4-tab__count tw-font-mono">{engine.platformDrills.length}</span>
			<span class="coach-drill-z4-tab__count tw-font-mono">{engine.activeSportLabel}</span>
		</button>
	</nav>

	<div class="coach-drill-z1-well">
		<div class="coach-drill-z1-toolbar">
			<label class="coach-drill-z1-search">
				<Icon name="action.search" />
				<input
					type="text"
					placeholder="Search by title, category, or metric…"
					bind:value={engine.searchTerm}
				/>
			</label>
		</div>
		{#if engine.activeTab === 'team'}
			<p class="coach-drill-z1-hint">
				Team drills are yours to edit and deploy via Intent Engine. Recommend a strong drill to your director with Share with director — they add it to the club library after review.
			</p>
		{:else}
			<p class="coach-drill-z1-hint">
				Starter drills for {engine.activeSportLabel}. Copy to your team library, then customize in War Room or deploy from Assignments.
			</p>
		{/if}
		{#if engine.copyPlatformMsg}
			<p class="coach-drill-z1-hint coach-drill-z1-hint--status" role="status">{engine.copyPlatformMsg}</p>
		{/if}
		{#if engine.loadError}
			<div class="coach-drill-z1-alert" role="alert">{engine.loadError}</div>
		{/if}

		<div class="coach-drill-z2-grid tw-font-mono" aria-label="Drill library">
			{#if engine.activeTab === 'team' && engine.loadingTeamDrills}
				<p class="coach-drill-z2-empty">Loading custom drills…</p>
			{:else if engine.activeTab === 'platform' && engine.loadingPlatformDrills}
				<p class="coach-drill-z2-empty">Loading platform basics…</p>
			{:else if engine.visibleRows.length === 0}
				<p class="coach-drill-z2-empty">
					{#if engine.activeTab === 'team'}
						No team drills yet. Use New drill, War Room, or copy from Platform basics.
					{:else}
						No platform basics for {engine.activeSportLabel} yet.
					{/if}
				</p>
			{:else}
				{#each engine.visibleRows as row (row.id)}
					<article class="coach-drill-z2-card">
						<h2 class="coach-drill-z2-card__title">{row.title}</h2>
						{#if row.description}
							<p class="coach-drill-z2-card__desc">{row.description}</p>
						{/if}
						<div class="coach-drill-z2-card__labels">
							<span class="coach-drill-z2-label">{row.category}</span>
							<span class="coach-drill-z2-label">{row.metricType}</span>
							{#if row.source === 'platform'}
								<span class="coach-drill-z2-label coach-drill-z2-label--warn">Template</span>
							{/if}
						</div>
						<ul class="coach-drill-z2-card__meta">
							<li>
								<dl>
									<dt>Base XP</dt>
									<dd>{row.baseXp}</dd>
								</dl>
							</li>
							<li>
								<dl>
									<dt>Duration</dt>
									<dd>{row.durationMinutes}m</dd>
								</dl>
							</li>
						</ul>
						{#if row.videoUrl}
							<a
								class="coach-drill-z2-card__link"
								href={row.videoUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon name="status.circle-play" />
								<span>Watch</span>
							</a>
						{/if}
						<div class="coach-drill-z2-card__actions">
							{#if row.source === 'platform'}
								<button
									type="button"
									class="coach-drill-z2-btn coach-drill-z2-btn--assign"
									disabled={engine.copyPlatformBusy || !engine.teamScope.selectedTeamId}
									onclick={() => void engine.copyPlatformToTeam(row)}
								>
									<Icon name="action.copy" />
									<span>Copy to team</span>
								</button>
							{:else}
								<button
									type="button"
									class="coach-drill-z2-btn coach-drill-z2-btn--assign"
									onclick={() => engine.openAssign(row)}
								>
									<span>Assign</span>
								</button>
								<button
									type="button"
									class="coach-drill-z2-btn"
									onclick={() => void engine.recommendToDirector(row)}
								>
									<Icon name="comm.send" />
									<span>Share</span>
								</button>
								<button
									type="button"
									class="coach-drill-z2-btn coach-drill-z2-btn--danger"
									onclick={() => engine.deleteDrill(row)}
									aria-label={`Delete drill ${row.title}`}
								>
									<Icon name="action.delete" />
									<span>Delete</span>
								</button>
							{/if}
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<style>
	.cdm-panel {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: #05050a;
		padding: 1rem 1.1rem;
		min-width: 0;
	}

	.cdm-panel__head {
		margin-bottom: 0.75rem;
	}

	.cdm-h2 {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #f4f4f5;
	}

	.cdm-eyebrow {
		display: block;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.45);
	}

	.cdm-muted {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0.5rem 0 0;
	}

	.cdm-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
	}

	.cdm-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.85rem;
	}

	.cdm-select {
		min-height: 2.5rem;
		padding: 0 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: #000;
		color: #fff;
		font-size: 0.8rem;
	}

	.cdm-err {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		color: #fca5a5;
	}

	.cdm-ok {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		color: #86efac;
	}

	.cdm-deploy {
		width: 100%;
		min-height: 3.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		cursor: pointer;
		border: 1px solid rgba(0, 212, 255, 0.45);
		background: #000;
		color: #fff;
		transition: box-shadow 0.2s, border-color 0.2s;
	}

	.cdm-deploy:hover:not(:disabled) {
		border-color: #2dd4bf;
		box-shadow: 0 0 32px rgba(57, 255, 20, 0.35), 0 0 20px rgba(0, 212, 255, 0.25);
	}

	.cdm-deploy:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.cdm-grid {
		display: grid;
		grid-template-columns: minmax(16rem, 1fr) minmax(0, 1.2fr) minmax(14rem, 0.9fr);
		gap: 1rem;
		align-items: start;
		min-width: 0;
	}

	@media (max-width: 69rem) {
		.cdm-grid {
			grid-template-columns: 1fr;
		}
	}

	.cdm-grid--schedule {
		align-items: start;
	}

	.cdm-sch-triggers {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		margin: 0 0 0.5rem;
	}

	.cdm-sch-toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
	}

	.cdm-sch-ch {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.cdm-sch-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		max-height: min(50vh, 420px);
		overflow: auto;
	}

	.cdm-sch-li {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: #000;
	}

	.cdm-sch-li__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.cdm-sch-pill {
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.2rem 0.45rem;
		border: 1px solid rgba(0, 212, 255, 0.35);
		color: #14b8a6;
	}

	.cdm-sch-time {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.cdm-sch-name {
		margin: 0 0 0.35rem;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.cdm-sch-meta {
		margin: 0;
		font-size: 0.6rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.45);
		word-break: break-word;
	}
</style>
