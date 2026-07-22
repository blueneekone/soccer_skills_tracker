<script lang="ts">
	import { untrack } from 'svelte';
	import type { BracketMatch, TournamentBracket } from '$lib/types/tournamentEvent.js';
	import {
		BRACKET_TEAM_SIZES,
		DOUBLE_ELIM_MIN_TEAMS,
		advanceWinner,
		bracketHasStarted,
		defaultTeams,
		firstRoundPairings,
		generateDoubleEliminationBracket,
		generateSingleEliminationBracket,
		matchesByRound,
		matchesForSide,
		moveTeamInList,
		reseedTeams,
		roundLabel,
		roundsForTeamCount,
		setMatchLive,
		shuffleTeamList,
		teamNameMap,
	} from '$lib/tournament/tournamentBracket.js';
	import type { BracketFormat, BracketSide } from '$lib/types/tournamentEvent.js';

	interface Props {
		bracket: TournamentBracket | null;
		readonly?: boolean;
		onchange?: (bracket: TournamentBracket | null) => void;
	}

	let { bracket = null, readonly = false, onchange }: Props = $props();

	let teamSize = $state<4 | 8 | 16 | 32>(8);
	let bracketFormat = $state<BracketFormat>('single_elimination');
	let draftTeams = $state<{ id: string; name: string }[]>([]);
	let scoreDrafts = $state<Record<string, { home: string; away: string }>>({});

	const names = $derived(bracket ? teamNameMap(bracket) : new Map<string, string>());
	const seeds = $derived(
		bracket ? new Map(bracket.teams.map((t) => [t.id, t.seed])) : new Map<string, number>(),
	);
	const rounds = $derived(bracket ? matchesByRound(bracket) : []);
	const totalRounds = $derived(bracket ? roundsForTeamCount(bracket.teamSize) : 0);
	const pairingPreview = $derived(
		!bracket && draftTeams.length > 0
			? firstRoundPairings(
					draftTeams.map((t, i) => ({
						id: t.id,
						name: t.name.trim() || `Team ${i + 1}`,
						seed: i + 1,
					})),
				)
			: [],
	);
	const isDoubleElim = $derived(bracket?.format === 'double_elimination');

	function buildBracketFromTeams(teams: ReturnType<typeof reseedTeams>) {
		if (bracketFormat === 'double_elimination') {
			return generateDoubleEliminationBracket(teams);
		}
		return generateSingleEliminationBracket(teams);
	}

	function sideRoundGroups(side: BracketSide) {
		if (!bracket) return [];
		const sideMatches = matchesForSide(bracket, side);
		const maxRound = sideMatches.reduce((max, m) => Math.max(max, m.round), 0);
		const grouped: BracketMatch[][] = [];
		for (let round = 0; round <= maxRound; round++) {
			const roundMatches = sideMatches
				.filter((m) => m.round === round)
				.sort((a, b) => a.slot - b.slot);
			if (roundMatches.length) grouped.push(roundMatches);
		}
		return grouped;
	}

	const champion = $derived(
		bracket?.matches.find((m) => m.side === 'grand_final' && m.winnerId)?.winnerId ??
			bracket?.matches.find((m) => m.round === totalRounds - 1 && m.slot === 0)?.winnerId ??
			null,
	);

	$effect(() => {
		if (!bracket) {
			draftTeams = defaultTeams(teamSize).map((t) => ({ id: t.id, name: t.name }));
		}
	});

	function emit(next: TournamentBracket | null) {
		onchange?.(next);
	}

	function syncTeamSize(size: 4 | 8 | 16 | 32) {
		teamSize = size;
		if (!bracket) {
			draftTeams = defaultTeams(size).map((t) => ({ id: t.id, name: t.name }));
		}
	}

	function moveTeam(index: number, direction: -1 | 1) {
		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= draftTeams.length) return;
		draftTeams = moveTeamInList(draftTeams, index, nextIndex);
		if (bracket) {
			const teams = reseedTeams(
				moveTeamInList(bracket.teams, index, nextIndex).map((t, i) => ({
					...t,
					name: draftTeams[i]?.name.trim() || t.name,
				})),
			);
			emit(buildBracketFromTeams(teams));
		}
	}

	function shuffleSeeds() {
		draftTeams = shuffleTeamList(draftTeams);
		if (bracket) {
			const teams = reseedTeams(
				shuffleTeamList(bracket.teams).map((t, i) => ({
					...t,
					name: draftTeams[i]?.name.trim() || t.name,
				})),
			);
			emit(buildBracketFromTeams(teams));
		}
	}

	function previewLabel(teamId: string): string {
		const idx = draftTeams.findIndex((t) => t.id === teamId);
		const name = idx >= 0 ? draftTeams[idx].name.trim() || `Team ${idx + 1}` : teamId;
		return `#${idx + 1} ${name}`;
	}

	function generateBracket() {
		const teams = draftTeams.map((t, i) => ({
			id: t.id,
			name: t.name.trim() || `Team ${i + 1}`,
			seed: i + 1,
		}));
		emit(buildBracketFromTeams(teams));
	}

	function clearBracket() {
		emit(null);
	}

	function updateTeamName(index: number, name: string) {
		draftTeams = draftTeams.map((t, i) => (i === index ? { ...t, name } : t));
		if (bracket) {
			const teams = bracket.teams.map((t, i) =>
				i === index ? { ...t, name: name.trim() || `Team ${i + 1}` } : t,
			);
			emit({ ...bracket, teams });
		}
	}

	function scoreKey(matchId: string): string {
		return matchId;
	}

	function getScores(match: BracketMatch): { home: string; away: string } {
		const key = scoreKey(match.id);
		if (scoreDrafts[key]) return scoreDrafts[key];
		return {
			home: match.homeScore != null ? String(match.homeScore) : '',
			away: match.awayScore != null ? String(match.awayScore) : '',
		};
	}

	function setScore(matchId: string, side: 'home' | 'away', value: string) {
		const key = scoreKey(matchId);
		const current = scoreDrafts[key] ?? { home: '', away: '' };
		scoreDrafts = { ...scoreDrafts, [key]: { ...current, [side]: value } };
	}

	function pickWinner(match: BracketMatch, winnerId: string) {
		if (!bracket || readonly) return;
		const scores = getScores(match);
		const homeScore = scores.home === '' ? null : Number.parseInt(scores.home, 10);
		const awayScore = scores.away === '' ? null : Number.parseInt(scores.away, 10);
		emit(advanceWinner(bracket, match.id, winnerId, homeScore, awayScore));
	}

	function markLive(matchId: string) {
		if (!bracket || readonly) return;
		emit(setMatchLive(bracket, matchId));
	}

	function teamLabel(teamId: string | null): string {
		if (!teamId) return 'TBD';
		const seed = seeds.get(teamId);
		const name = names.get(teamId) ?? teamId;
		if (seed != null && readonly) return `#${seed} ${name}`;
		return name;
	}

	function statusClass(status: BracketMatch['status']): string {
		return `match-status match-status--${status}`;
	}
</script>

<section class="bracket-panel glass-panel">
	<header class="panel-header">
		<div>
			<h2 class="panel-title">Tournament Bracket</h2>
			<p class="panel-subtitle">
				{#if readonly}
					{isDoubleElim ? 'Double-elimination results' : 'Live single-elimination results'}
				{:else}
					Seed teams and advance winners — single or double elimination
				{/if}
			</p>
		</div>
		{#if !readonly && bracketHasStarted(bracket)}
			<button type="button" class="btn-ghost" onclick={clearBracket}>Reset bracket</button>
		{/if}
	</header>

	{#if !readonly && !bracketHasStarted(bracket)}
		<div class="setup-block">
			<div class="setup-row">
				<label class="field-label" for="bracket-format">Format</label>
				<select
					id="bracket-format"
					class="field-input field-select"
					bind:value={bracketFormat}
					onchange={() => {
						if (bracketFormat === 'double_elimination' && teamSize < DOUBLE_ELIM_MIN_TEAMS) {
							syncTeamSize(8);
						}
					}}
				>
					<option value="single_elimination">Single elimination</option>
					<option value="double_elimination">Double elimination (8+ teams)</option>
				</select>
			</div>

			<div class="setup-row">
				<label class="field-label" for="bracket-size">Bracket size</label>
				<select
					id="bracket-size"
					class="field-input field-select"
					value={String(teamSize)}
					onchange={(e) => syncTeamSize(Number(e.currentTarget.value) as 4 | 8 | 16 | 32)}
				>
					{#each BRACKET_TEAM_SIZES as size}
						<option value={size} disabled={bracketFormat === 'double_elimination' && size < DOUBLE_ELIM_MIN_TEAMS}>
							{size} teams
						</option>
					{/each}
				</select>
			</div>

			<div class="setup-toolbar">
				<p class="setup-hint">Reorder seeds before generating — #1 plays the lowest seed in round one.</p>
				<button type="button" class="btn-ghost btn-shuffle" onclick={shuffleSeeds}>
					Shuffle seeds
				</button>
			</div>

			<div class="team-grid">
				{#each draftTeams as team, idx (team.id)}
					<div class="team-row">
						<span class="seed-pill">#{idx + 1}</span>
						<input
							class="field-input"
							type="text"
							value={team.name}
							placeholder={`Team ${idx + 1}`}
							maxlength="48"
							oninput={(e) => updateTeamName(idx, e.currentTarget.value)}
						/>
						<div class="seed-actions">
							<button
								type="button"
								class="btn-seed-move"
								aria-label="Move seed up"
								disabled={idx === 0}
								onclick={() => moveTeam(idx, -1)}
							>
								↑
							</button>
							<button
								type="button"
								class="btn-seed-move"
								aria-label="Move seed down"
								disabled={idx === draftTeams.length - 1}
								onclick={() => moveTeam(idx, 1)}
							>
								↓
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if pairingPreview.length > 0}
				<div class="pairing-preview" aria-label="First round pairings preview">
					<span class="pairing-kicker">Round 1 preview</span>
					<ul class="pairing-list">
						{#each pairingPreview as [homeId, awayId]}
							<li>{previewLabel(homeId)} vs {previewLabel(awayId)}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<button type="button" class="btn-generate" onclick={generateBracket}>Generate bracket</button>
		</div>
	{:else if bracket}
		{#if isDoubleElim}
			<p class="format-badge">Double elimination · minimum {DOUBLE_ELIM_MIN_TEAMS} teams</p>
		{/if}
		{#if champion}
			<div class="champion-banner">
				<span class="champion-kicker">Champion</span>
				<span class="champion-name">{teamLabel(champion)}</span>
			</div>
		{/if}

		<div class="bracket-scroll" role="region" aria-label="Tournament bracket">
			{#if isDoubleElim}
				{#each [
					{ side: 'winners' as BracketSide, title: 'Winners bracket' },
					{ side: 'losers' as BracketSide, title: 'Losers bracket' },
					{ side: 'grand_final' as BracketSide, title: 'Grand final' },
				] as section (section.side)}
					{@const sectionRounds = sideRoundGroups(section.side)}
					{#if sectionRounds.length > 0}
						<div class="bracket-side-block">
							<h3 class="bracket-side-title">{section.title}</h3>
							<div class="bracket-tree" style:--rounds={sectionRounds.length}>
								{#each sectionRounds as roundMatches, roundIdx}
									<div class="bracket-round">
										<h3 class="round-label">{roundLabel(roundIdx, sectionRounds.length)}</h3>
										<div class="round-matches">
											{#each roundMatches as match (match.id)}
												<article class="match-card">
													<div class="match-meta">
														<span class={statusClass(match.status)}>{match.status}</span>
													</div>
													<div class="team-slot">
														<span class="team-name">{teamLabel(match.homeTeamId)}</span>
													</div>
													<div class="team-slot">
														<span class="team-name">{teamLabel(match.awayTeamId)}</span>
													</div>
												</article>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			{:else}
			<div class="bracket-tree" style:--rounds={totalRounds}>
				{#each rounds as roundMatches, roundIdx}
					<div class="bracket-round">
						<h3 class="round-label">{roundLabel(roundIdx, totalRounds)}</h3>
						<div class="round-matches">
							{#each roundMatches as match (match.id)}
								<article class="match-card" class:match-card--final={roundIdx === totalRounds - 1}>
									<div class="match-meta">
										<span class={statusClass(match.status)}>{match.status}</span>
										{#if !readonly && match.status === 'pending' && match.homeTeamId && match.awayTeamId}
											<button type="button" class="btn-live" onclick={() => markLive(match.id)}>
												Start
											</button>
										{/if}
									</div>

									<div class="team-slot" class:team-slot--winner={match.winnerId === match.homeTeamId}>
										<span class="team-name">{teamLabel(match.homeTeamId)}</span>
										{#if !readonly && match.homeTeamId && match.awayTeamId && match.status !== 'final'}
											<input
												class="score-input"
												type="number"
												min="0"
												placeholder="0"
												value={getScores(match).home}
												oninput={(e) => setScore(match.id, 'home', e.currentTarget.value)}
											/>
										{:else if match.homeScore != null}
											<span class="score-read">{match.homeScore}</span>
										{/if}
									</div>

									<div class="team-slot" class:team-slot--winner={match.winnerId === match.awayTeamId}>
										<span class="team-name">{teamLabel(match.awayTeamId)}</span>
										{#if !readonly && match.homeTeamId && match.awayTeamId && match.status !== 'final'}
											<input
												class="score-input"
												type="number"
												min="0"
												placeholder="0"
												value={getScores(match).away}
												oninput={(e) => setScore(match.id, 'away', e.currentTarget.value)}
											/>
										{:else if match.awayScore != null}
											<span class="score-read">{match.awayScore}</span>
										{/if}
									</div>

									{#if !readonly && match.homeTeamId && match.awayTeamId && match.status !== 'final'}
										<div class="winner-actions">
											<button
												type="button"
												class="btn-winner"
												onclick={() => pickWinner(match, match.homeTeamId!)}
											>
												{teamLabel(match.homeTeamId)} wins
											</button>
											<button
												type="button"
												class="btn-winner"
												onclick={() => pickWinner(match, match.awayTeamId!)}
											>
												{teamLabel(match.awayTeamId)} wins
											</button>
										</div>
									{/if}
								</article>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			{/if}
		</div>
	{:else}
		<div class="empty-bracket">No bracket configured for this event.</div>
	{/if}
</section>

<style>
	.bracket-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.panel-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
	}

	.panel-subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.82rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.format-badge {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #fbbf24;
	}

	.bracket-side-block {
		margin-bottom: 1.25rem;
	}

	.bracket-side-title {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: #e2e8f0;
	}

	.setup-block {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setup-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.setup-hint {
		margin: 0;
		font-size: 0.8rem;
		color: var(--vanguard-text-muted, #94a3b8);
		max-width: 36rem;
	}

	.btn-shuffle {
		flex-shrink: 0;
	}

	.pairing-preview {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
	}

	.pairing-kicker {
		display: block;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a5b4fc;
		margin-bottom: 0.45rem;
	}

	.pairing-list {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.82rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.setup-row {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-width: 220px;
	}

	.field-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--vanguard-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 0.55rem 0.85rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		font-size: 0.9rem;
		width: 100%;
		box-sizing: border-box;
	}

	.field-select {
		appearance: none;
		cursor: pointer;
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
		gap: 0.6rem;
	}

	.team-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.seed-actions {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex-shrink: 0;
	}

	.btn-seed-move {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: var(--vanguard-text-muted, #94a3b8);
		width: 1.75rem;
		height: 1.35rem;
		font-size: 0.75rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
	}

	.btn-seed-move:hover:not(:disabled) {
		border-color: rgba(99, 102, 241, 0.45);
		color: #c7d2fe;
	}

	.btn-seed-move:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.seed-pill {
		font-size: 0.72rem;
		font-weight: 700;
		color: #a5b4fc;
		background: rgba(99, 102, 241, 0.15);
		border-radius: 99px;
		padding: 0.2rem 0.5rem;
		min-width: 2rem;
		text-align: center;
	}

	.btn-generate,
	.btn-ghost,
	.btn-live,
	.btn-winner {
		border-radius: 10px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s, opacity 0.15s;
	}

	.btn-generate {
		align-self: flex-start;
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		border: none;
		color: white;
		padding: 0.55rem 1.1rem;
		box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
	}

	.btn-ghost {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--vanguard-text-muted, #94a3b8);
		padding: 0.4rem 0.85rem;
	}

	.btn-ghost:hover {
		border-color: rgba(255, 255, 255, 0.28);
		color: var(--vanguard-text-primary, #e2e8f0);
	}

	.champion-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(99, 102, 241, 0.1));
		border: 1px solid rgba(251, 191, 36, 0.35);
	}

	.champion-kicker {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #fbbf24;
	}

	.champion-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
	}

	.bracket-scroll {
		overflow-x: auto;
		padding-bottom: 0.5rem;
	}

	.bracket-tree {
		display: grid;
		grid-template-columns: repeat(var(--rounds), minmax(200px, 1fr));
		gap: 1.25rem;
		min-width: max(100%, calc(var(--rounds) * 220px));
	}

	.bracket-round {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.round-label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #a5b4fc;
		text-align: center;
	}

	.round-matches {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		gap: 1rem;
		flex: 1;
	}

	.match-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		position: relative;
	}

	.match-card--final {
		border-color: rgba(251, 191, 36, 0.35);
		box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.08) inset;
	}

	.match-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.match-status {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.45rem;
		border-radius: 99px;
	}

	.match-status--pending {
		background: rgba(148, 163, 184, 0.15);
		color: #94a3b8;
	}

	.match-status--live {
		background: rgba(52, 211, 153, 0.15);
		color: #34d399;
	}

	.match-status--final {
		background: rgba(99, 102, 241, 0.15);
		color: #a5b4fc;
	}

	.btn-live {
		background: rgba(52, 211, 153, 0.12);
		border: 1px solid rgba(52, 211, 153, 0.35);
		color: #6ee7b7;
		padding: 0.2rem 0.55rem;
	}

	.team-slot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.45rem 0.55rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.team-slot--winner {
		border-color: rgba(251, 191, 36, 0.45);
		background: rgba(251, 191, 36, 0.08);
	}

	.team-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--vanguard-text-primary, #e2e8f0);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.score-input,
	.score-read {
		width: 2.5rem;
		text-align: center;
		font-weight: 700;
	}

	.score-input {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		padding: 0.2rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		font-size: 0.82rem;
	}

	.score-read {
		font-size: 0.9rem;
		color: #fbbf24;
	}

	.winner-actions {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.15rem;
	}

	.btn-winner {
		background: rgba(99, 102, 241, 0.12);
		border: 1px solid rgba(99, 102, 241, 0.3);
		color: #c7d2fe;
		padding: 0.35rem 0.55rem;
		text-align: left;
	}

	.btn-winner:hover {
		background: rgba(99, 102, 241, 0.22);
	}

	.empty-bracket {
		text-align: center;
		padding: 1.5rem;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.875rem;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}
</style>
