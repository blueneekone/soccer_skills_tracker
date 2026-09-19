<script lang="ts">
	import { TELEMETRY_PAD, type CoachMatchDayViewEngine } from './CoachMatchDayViewEngine.svelte.js';

	let { engine }: { engine: CoachMatchDayViewEngine } = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-5 tw-bg-[#0f172a] tw-border-b tw-border-[#334155] tw-shrink-0" style="padding: clamp(12px, 3vw, 24px);">
	<div style="display: grid;" class="tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-3">
		<div class="tw-flex tw-flex-col tw-gap-1">
			<label class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" for="field-loc">Field / Pitch</label>
			<input id="field-loc" type="text" class="coach-match-stream__input" placeholder="e.g. Field 4" bind:value={engine.fieldLocation} onblur={() => void engine.persistMatchSession()} />
		</div>
		<div class="tw-flex tw-flex-col tw-gap-1">
			<label class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" for="opp-team">Opponent</label>
			<input id="opp-team" type="text" class="coach-match-stream__input" placeholder="e.g. Crossfire" bind:value={engine.opponentTeam} onblur={() => void engine.persistMatchSession()} />
		</div>
		<div class="tw-flex tw-flex-col tw-gap-1 tw-col-span-2">
			<label class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" for="stream-url">Live Stream URL</label>
			<div class="tw-flex tw-gap-2">
				<input id="stream-url" type="url" class="coach-match-stream__input" placeholder="YouTube / Vimeo link" bind:value={engine.liveStreamDraft} />
				<button type="button" class="coach-match-stream__save" disabled={engine.liveStreamSaving} onclick={() => void engine.saveLiveStreamUrl()}>{engine.liveStreamSaving ? 'Saving…' : 'Save'}</button>
			</div>
			{#if engine.liveStreamErr}
				<p class="coach-match-stream__err" role="alert">{engine.liveStreamErr}</p>
			{:else if engine.liveStreamUrl}
				<p class="coach-match-stream__ok" role="status">Stream linked — parents can watch live.</p>
			{/if}
		</div>
	</div>
	<div class="tw-flex tw-flex-col tw-gap-1">
		<span class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">Game Day Roster</span>
		<div class="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-1" style="scrollbar-width: none;">
			{#each engine.operatives as op (op.id)}
				<button type="button" class="tw-border tw-px-2 tw-py-1 tw-text-[10px] tw-font-mono tw-rounded-none tw-whitespace-nowrap {engine.gameDayActiveRoster.has(op.id) ? 'tw-bg-[#14b8a6]/20 tw-text-[#14b8a6] tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-500 tw-border-slate-700'}" onclick={() => {
					if (engine.gameDayActiveRoster.has(op.id)) engine.gameDayActiveRoster.delete(op.id);
					else engine.gameDayActiveRoster.add(op.id);
					engine.gameDayActiveRoster = new Set(engine.gameDayActiveRoster);
					void engine.persistMatchSession();
				}}>
					{op.name}
				</button>
			{/each}
		</div>
	</div>
</div>

<div class="coach-match-main">
	<div class="coach-match-z2-row" aria-label="Scoreboard">
		<button
			type="button"
			class="coach-match-z2-cell"
			class:coach-match-z2-cell--flash={engine.scoreFlashHome}
			aria-label="Add home goal"
			onclick={() => void engine.bumpScore('home')}
		>
			<p class="coach-match-z2-cell__label">Home</p>
			<p class="coach-match-z2-cell__score">{engine.homeScore}</p>
		</button>
		<button
			type="button"
			class="coach-match-z2-cell"
			class:coach-match-z2-cell--flash={engine.scoreFlashAway}
			aria-label="Add opponent goal"
			onclick={() => void engine.bumpScore('away')}
		>
			<p class="coach-match-z2-cell__label">Away</p>
			<p class="coach-match-z2-cell__score">{engine.awayScore}</p>
		</button>
	</div>

	<section class="coach-match-z1-well" aria-label="Match log">
		<p class="coach-match-z1-well__label">Match log</p>
		<div class="coach-match-z1-log">
			<div
				bind:this={engine.feedScrollRoot}
				class="coach-match-z1-log__scroll"
				role="log"
				aria-live="polite"
				aria-relevant="additions"
			>
				{#if engine.eventFeed.length === 0}
					<p class="coach-match-z1-log__empty">Awaiting first event</p>
				{:else}
					{#each engine.eventFeed as entry, idx (entry.id)}
						<p class={engine.feedLineClass(entry, idx)}>{entry.line}</p>
					{/each}
				{/if}
			</div>
		</div>
	</section>
</div>

<div class="coach-match-telemetry" aria-label="Telemetry control pad">
	<p class="coach-match-telemetry__label">Asset selector</p>
	<div class="coach-match-roster" role="tablist" aria-label="Select active player">
		{#if engine.rosterLoading}
			<p class="coach-match-roster__empty">Syncing roster…</p>
		{:else if engine.operatives.length === 0}
			<p class="coach-match-roster__empty">
				{engine.teamScope.selectedTeamId?.trim()
					? 'NO ROSTERED PLAYERS — ADD PLAYERS IN ROSTER & TEAMS'
					: 'SELECT A TEAM TO LOAD THE SQUAD'}
			</p>
		{:else}
			{#each engine.operatives as op (op.id)}
				<button
					type="button"
					role="tab"
					class="coach-match-roster__chip"
					class:coach-match-roster__chip--active={engine.activeTarget === op.id}
					aria-selected={engine.activeTarget === op.id}
					aria-label="Target {op.name}"
					onclick={() => (engine.activeTarget = op.id)}
				>
					<span class="coach-match-roster__glyph">{engine.rosterGlyph(op)}</span>
					<span class="coach-match-roster__pos">{engine.stripAbbr(op)}</span>
				</button>
			{/each}
		{/if}
	</div>

	<p class="coach-match-telemetry__label">Telemetry triggers</p>
	<div class="coach-match-pad-grid">
		{#each TELEMETRY_PAD as a (a.id)}
			<button type="button" class={engine.padClass(a)} disabled={!engine.activeOperative} onclick={() => engine.fireAction(a)}>
				{a.label}
			</button>
		{/each}
	</div>
</div>
