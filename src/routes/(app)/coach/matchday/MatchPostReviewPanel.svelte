<script lang="ts">
	import type { MatchDayEngine } from './MatchDayEngine.svelte';

	interface Props {
		engine: MatchDayEngine;
	}

	let { engine }: Props = $props();

	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveFeedback = $state('');

	async function handleSaveRecord() {
		saveStatus = 'saving';
		saveFeedback = '';
		const res = await engine.saveMatchRecord();
		if (res.ok) {
			saveStatus = 'saved';
			saveFeedback = `Match saved to Team Ops (${engine.lastSavedAt || 'Now'})`;
			setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 4000);
		} else {
			saveStatus = 'error';
			saveFeedback = res.error || 'Failed to save';
		}
	}

	const playersList = $derived.by(() => {
		const list = Object.values(engine.playerStats);
		if (list.length > 0) return list;
		return engine.roster.map((p) => ({
			id: p.id,
			name: p.name,
			jersey: p.jersey || '',
			goals: 0,
			assists: 0,
			shots: 0,
			tackles: 0,
			saves: 0,
			fouls: 0,
			yellowCards: 0,
			redCards: 0,
			mistakes: 0,
		}));
	});
</script>

<div class="tw-col-span-12 tw-space-y-6">
	<!-- Summary Card & Save Bar -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-border-b tw-border-[#334155] tw-pb-4 tw-mb-4">
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6]"></span>
					<h2 class="tw-font-mono tw-text-sm sm:tw-text-base tw-font-black tw-text-white tw-uppercase tw-tracking-wider tw-m-0">
						POST-MATCH TELEMETRY & COACH REVIEW DOSSIER
					</h2>
				</div>
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">
					{engine.teamScope.teamLabel || 'OUR SQUAD'} vs {engine.opponentName || 'Opponent'} • Score: <strong class="tw-text-[#daff0a]">{engine.homeScore} - {engine.awayScore}</strong> • Total Events: {engine.events.length}
				</p>
			</div>

			<!-- Save to Team Ops Button -->
			<div class="tw-flex tw-items-center tw-gap-3">
				{#if saveFeedback}
					<span class="tw-font-mono tw-text-xs {saveStatus === 'saved' ? 'tw-text-emerald-400' : 'tw-text-rose-400'}">
						{saveFeedback}
					</span>
				{/if}
				<button
					type="button"
					onclick={handleSaveRecord}
					disabled={engine.isSavingMatch}
					class="tw-inline-flex tw-items-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-[#fbbf24] hover:tw-bg-amber-400 active:tw-scale-95 tw-text-black tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-wider tw-transition-all tw-cursor-pointer disabled:tw-opacity-50"
					style="border-radius: 0px;"
				>
					<span>💾</span>
					<span>{engine.isSavingMatch ? 'SAVING...' : 'SAVE MATCH TO TEAM OPS'}</span>
				</button>
			</div>
		</div>

		<!-- Match Highlights Quick Badges -->
		<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-3">
			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">FINAL RESULT</div>
				<div class="tw-font-mono tw-text-lg tw-font-black {engine.homeScore > engine.awayScore ? 'tw-text-emerald-400' : engine.homeScore < engine.awayScore ? 'tw-text-rose-400' : 'tw-text-amber-400'}">
					{engine.homeScore > engine.awayScore ? 'WIN' : engine.homeScore < engine.awayScore ? 'LOSS' : 'DRAW'} ({engine.homeScore} - {engine.awayScore})
				</div>
			</div>

			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">MATCH DURATION</div>
				<div class="tw-font-mono tw-text-lg tw-font-black tw-text-white">
					{Math.round(engine.elapsedSeconds / 60)} MINS
				</div>
			</div>

			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">GOALS SCORED</div>
				<div class="tw-font-mono tw-text-lg tw-font-black tw-text-emerald-400">
					{engine.homeScore}
				</div>
			</div>

			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">MISTAKE REMINDERS</div>
				<div class="tw-font-mono tw-text-lg tw-font-black {engine.mistakes.length > 0 ? 'tw-text-rose-400' : 'tw-text-slate-400'}">
					{engine.mistakes.length} LOGGED
				</div>
			</div>
		</div>
	</div>

	<!-- Coach's Post-Match Reminders & Mistake Log -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-rose-500"></span>
				<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-rose-400 tw-uppercase tw-tracking-widest tw-m-0">
					⚡ COACH'S POST-MATCH REMINDERS & MISTAKE LOG ({engine.mistakes.length})
				</h3>
			</div>
			<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">FILM & PRACTICE QUEUE</span>
		</div>

		{#if engine.mistakes.length === 0}
			<div class="tw-p-6 tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-center">
				<p class="tw-font-mono tw-text-xs tw-text-emerald-400 tw-m-0">
					✓ Clean performance — zero critical mistake reminders recorded for this match.
				</p>
			</div>
		{:else}
			<div class="tw-space-y-2">
				{#each engine.mistakes as m (m.id)}
					<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-2 tw-p-3 tw-bg-[#000000] tw-border tw-border-rose-900/40 hover:tw-border-rose-500 tw-transition-colors">
						<div class="tw-flex tw-items-center tw-gap-3">
							<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-rose-400 tw-bg-rose-950/60 tw-px-2 tw-py-0.5 tw-border tw-border-rose-800">
								{m.minute}'
							</span>
							<span class="tw-font-mono tw-text-xs tw-font-black tw-text-white">
								{m.playerName}
							</span>
						</div>
						<div class="tw-font-mono tw-text-xs tw-text-slate-200 sm:tw-text-right">
							"{m.note}"
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Player Performance Box Score Table -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-[#daff0a]"></span>
				<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#daff0a] tw-uppercase tw-tracking-widest tw-m-0">
					PLAYER PERFORMANCE BOX SCORE
				</h3>
			</div>
			<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">ROSTER STAT ATTRIBUTION</span>
		</div>

		<div class="tw-w-full tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse">
				<thead>
					<tr class="tw-border-b tw-border-[#334155] tw-bg-[#000000]">
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">Player</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">#</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-emerald-400 tw-uppercase tw-text-center">Goals</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-teal-400 tw-uppercase tw-text-center">Assists</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Shots</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Tackles</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Saves</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Fouls</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-amber-400 tw-uppercase tw-text-center">Cards</th>
						<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-rose-400 tw-uppercase tw-text-center">Mistakes</th>
					</tr>
				</thead>
				<tbody class="tw-divide-y tw-divide-[#334155]/40">
					{#each playersList as player (player.id)}
						<tr class="hover:tw-bg-[#000000]/60 tw-transition-colors">
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-font-bold tw-text-white">
								{player.name}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400">
								{player.jersey ? `#${player.jersey}` : '-'}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center tw-font-bold {player.goals > 0 ? 'tw-text-emerald-400' : 'tw-text-slate-500'}">
								{player.goals}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center tw-font-bold {player.assists > 0 ? 'tw-text-teal-400' : 'tw-text-slate-500'}">
								{player.assists}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.shots > 0 ? 'tw-text-slate-200' : 'tw-text-slate-500'}">
								{player.shots}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.tackles > 0 ? 'tw-text-slate-200' : 'tw-text-slate-500'}">
								{player.tackles}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.saves > 0 ? 'tw-text-slate-200' : 'tw-text-slate-500'}">
								{player.saves}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.fouls > 0 ? 'tw-text-amber-400' : 'tw-text-slate-500'}">
								{player.fouls}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center">
								{#if player.yellowCards > 0 || player.redCards > 0}
									<span class="tw-text-amber-400">{player.yellowCards}Y</span>
									{#if player.redCards > 0}
										<span class="tw-text-rose-400 tw-ml-1">{player.redCards}R</span>
									{/if}
								{:else}
									<span class="tw-text-slate-500">0</span>
								{/if}
							</td>
							<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.mistakes > 0 ? 'tw-text-rose-400 tw-font-bold' : 'tw-text-slate-500'}">
								{player.mistakes}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Chronological Event Stream -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-[#14b8a6]"></span>
				<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-m-0">
					EVENT LOG TIMELINE ({engine.events.length})
				</h3>
			</div>
			<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">CLICK TO EDIT AUDIT LABEL</span>
		</div>

		<div class="tw-w-full tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse">
				<thead>
					<tr class="tw-border-b tw-border-[#334155] tw-bg-[#000000]">
						<th class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">Time</th>
						<th class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">Event Code</th>
						<th class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">Audit Label</th>
					</tr>
				</thead>
				<tbody class="tw-divide-y tw-divide-[#334155]/40">
					{#each engine.events as evt (evt.id)}
						<tr class="hover:tw-bg-[#000000]/70 tw-transition-colors">
							<td class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-300">{evt.time}</td>
							<td class="tw-p-3 tw-font-mono tw-text-xs">
								<span class="tw-px-2 tw-py-0.5 tw-border {evt.type === 'GOAL' ? 'tw-bg-emerald-950/60 tw-border-emerald-500 tw-text-emerald-300' : evt.type.includes('CARD') ? 'tw-bg-amber-950/60 tw-border-amber-400 tw-text-amber-300' : evt.type === 'SUB' ? 'tw-bg-teal-950/60 tw-border-[#14b8a6] tw-text-[#14b8a6]' : evt.type === 'MISTAKE' ? 'tw-bg-rose-950/60 tw-border-rose-500 tw-text-rose-300' : 'tw-bg-slate-900 tw-border-slate-600 tw-text-slate-300'}">
									{evt.type}
								</span>
							</td>
							<td class="tw-p-3">
								<input
									type="text"
									value={evt.label}
									onchange={(e) => engine.editEvent(evt.id, e.currentTarget.value)}
									class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-white tw-font-mono tw-text-xs tw-w-full tw-px-2.5 tw-py-1 focus:tw-border-[#14b8a6] focus:tw-outline-none"
									style="border-radius: 0px;"
								/>
							</td>
						</tr>
					{/each}
					{#if engine.events.length === 0}
						<tr>
							<td colspan="3" class="tw-p-8 tw-text-center tw-text-xs tw-text-slate-500 tw-font-mono">
								No match events recorded for this session.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
