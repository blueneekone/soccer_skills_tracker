<script lang="ts">
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import type { SquadTelemetryEngine } from './SquadTelemetryEngine.svelte.js';
	import { DISPATCH_INTEL } from './SquadTelemetryEngine.svelte.js';
	import LiveTelemetrySection from '$lib/components/coach/LiveTelemetrySection.svelte';
	import Swal from 'sweetalert2';
	
	let { engine }: { engine: SquadTelemetryEngine } = $props();

	function fmtTime(ts: any) {
		if (!ts || !ts.toMillis) return '';
		const d = new Date(ts.toMillis());
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
	}
	
	function telemetryRowTone(ev: any) {
		const t = String(ev.type || '').toLowerCase();
		if (t === 'goal') return 'stw__tel-line--goal';
		if (t === 'assist') return 'stw__tel-line--assist';
		if (t === 'shot') return 'stw__tel-line--shot';
		if (t === 'save') return 'stw__tel-line--save';
		if (t === 'tackle') return 'stw__tel-line--tackle';
		return 'stw__tel-line--misc';
	}
	
	function rosterLabelForTelemetry(pid: string) {
		if (!pid) return '—';
		const sid = engine.resolveStatsId(pid, engine.playerStats);
		if (engine.playerStats[sid]?.playerName) {
			const name = String(engine.playerStats[sid].playerName);
			if (engine.resolveStatsId(name, engine.playerStats) === sid) return name;
		}
		return sid.length > 18 ? `${sid.slice(0, 16)}…` : sid;
	}
</script>
<style src="./squad_styles.css"></style>
<div class="stw" data-region="squad-telemetry">
	<header class="stw__hud">
		<div>
			<p class="stw__eyebrow">Project Phoenix · Pillar 1</p>
			<h1 class="stw__title">Squad telemetry</h1>
			<p class="stw__meta">Team scoping · {engine.currentTeam?.name || engine.teamId || '—'}</p>
		</div>
		<div class="stw__stats">
			<div class="stw__pill">
				<span class="stw__eyebrow">Roster</span>
				<span class="stw__mono stw__cyber">{engine.players.length}</span>
			</div>
			<div class="stw__pill" class:stw__pill--alert={engine.vpcItems.length > 0}>
				<span class="stw__eyebrow">VPC pending</span>
				<span class="stw__mono stw__orange">{engine.vpcItems.length}</span>
			</div>
			<div class="stw__pill">
				<span class="stw__eyebrow">Field signals</span>
				<span class="stw__mono stw__green">{engine.signalCount}</span>
			</div>
		</div>
	</header>

	{#if engine.showLiveTelemetry}
		<LiveTelemetrySection
			teamId={engine.teamId}
			matchId={engine.activeMatchId}
			players={engine.players}
			getStatsId={(p) => engine.resolveStatsId(p, engine.playerStats)}
			onCommitted={() => engine.fetchData(engine.teamId)}
		/>
		{#if engine.teamId && engine.activeMatchId}
			<section class="stw__tel-shell" aria-labelledby="stw-tel-feed-title">
				<div class="stw__tel-head">
					<h2 id="stw-tel-feed-title" class="stw__tel-title">LIVE FEED · SOCKET</h2>
					<p class="stw__tel-meta">
						Session <span class="stw__mono">{engine.activeMatchId.slice(0, 10)}…</span>
					</p>
				</div>
				<div class="stw__tel-body" role="log" aria-live="polite" aria-relevant="additions">
					{#if engine.liveEventsError}
						<p class="stw__tel-err">{engine.liveEventsError}</p>
					{:else if engine.liveEvents.length === 0}
						<p class="stw__tel-empty">Awaiting pitch taps…</p>
					{:else}
						{#each engine.liveEvents as ev (ev.id)}
							<div class="stw__tel-line {telemetryRowTone(ev)}">
								<span class="stw__tel-ts">{fmtTime(ev.timestamp)}</span>
								<span class="stw__tel-act">{String(ev.action ?? '—').toUpperCase()}</span>
								<span class="stw__tel-pts">+{Math.round(Number(ev.points) || 0)}</span>
								<span class="stw__tel-player">{rosterLabelForTelemetry(ev.playerId)}</span>
							</div>
						{/each}
					{/if}
				</div>
			</section>
		{/if}
	{/if}

	<section
		class="stw__dispatch tw-mb-4 tw-rounded-lg tw-border tw-border-cyan-500/35 tw-bg-[#000000]/50 tw-px-3 tw-py-3 sm:tw-px-4"
		aria-labelledby="stw-dispatch"
	>
		<div class="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
			<div class="tw-min-w-0">
				<p id="stw-dispatch" class="stw__eyebrow tw-mb-1 tw-text-cyan-400/90">Persistent Squad Code</p>
				<p class="stw__meta tw-m-0 tw-text-xs tw-text-white/60">
					Permanent team code. Parents enter this persistent code to link their player to this specific squad.
				</p>
			</div>
			<div
				class="tw-flex tw-flex-col tw-items-stretch tw-gap-2 sm:tw-min-w-[14rem] sm:tw-items-end"
			>
				<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
					<IntelModal
						title={DISPATCH_INTEL.title}
						instructions={DISPATCH_INTEL.instructions}
					/>
					{#if engine.teamInviteCode}
						<div
							class="stw__mono tw-flex tw-min-h-[2.75rem] tw-select-all tw-items-center tw-justify-center tw-rounded tw-border tw-border-cyan-500/40 tw-bg-[#05050a] tw-px-3 tw-py-2 tw-text-base tw-font-bold tw-tracking-widest tw-text-cyan-300"
							title="Persistent Team Code"
						>
							{engine.teamInviteCode}
						</div>
						<button
							type="button"
							class="coach-os-action-chip tw-text-[10px] tw-min-h-[2.75rem] tw-px-3"
							onclick={() => { navigator.clipboard.writeText(engine.teamInviteCode); Swal.fire({ title: "Copied", text: "Code copied", icon: "success" }); }}
							title="Copy team code to clipboard"
						>
							COPY CODE
						</button>
					{:else}
						<button
							type="button"
							class="tw-min-h-[2.75rem] tw-rounded tw-border tw-border-cyan-500/50 tw-bg-cyan-950/30 tw-px-4 tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-300 tw-shadow-[0_0_18px_rgba(20, 184, 166,0.12)] tw-transition hover:tw-border-cyan-400/70 hover:tw-bg-cyan-900/25 disabled:tw-opacity-50"
							disabled={!engine.teamId || engine.inviteBusy}
							onclick={engine.generateInviteCode}
						>
							{engine.inviteBusy ? 'Establishing…' : 'Establish Team Code'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	{#if engine.feedback}
		<p
			class="stw__feedback"
			class:stw__feedback--err={engine.feedback.type === 'error'}
			class:stw__feedback--ok={engine.feedback.type === 'success'}
		>
			{engine.feedback.text}
		</p>
	{/if}

	<div class="stw__grid">
		<section class="stw__panel" aria-labelledby="stw-roster">
			<div class="stw__panelhead">
				<h2 id="stw-roster" class="stw__h2">Roster</h2>
			</div>
			<div class="stw__add">
				<input class="stw__inp" type="text" placeholder="Name" bind:value={engine.addName} />
				<input class="stw__inp" type="email" placeholder="Email (opt)" bind:value={engine.addEmail} />
				<input class="stw__inp stw__inp--sm" type="text" placeholder="#" bind:value={engine.addJersey} />
				<button type="button" class="stw__btn" disabled={engine.addSaving} onclick={() => engine.handleAdd()}>Ingest</button>
			</div>
			<p class="stw__import-hint">
				<a class="stw__import-link" href="/coach/logistics?tab=roster">Import CSV on Team Ops →</a>
			</p>
			<div class="stw__tablewrap">
				<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-4 tw-min-w-0 tw-overflow-x-auto">
					<table class="tw-w-full tw-font-mono tw-text-sm stw__table" aria-label="Roster">
					<thead>
						<tr>
							<th scope="col">Athlete</th>
							<th scope="col">#</th>
							<th scope="col">Link</th>
						</tr>
					</thead>
					<tbody>
						{#if engine.loading}
							<tr><td colspan="3" class="stw__muted">Loading roster…</td></tr>
						{:else if engine.players.length === 0}
							<tr><td colspan="3" class="stw__muted">No athletes on file.</td></tr>
						{:else}
							{#each engine.players as p (p)}
								{@const sid = engine.resolveStatsId(p, engine.playerStats)}
								{@const rowLabel =
									typeof engine.playerStats[sid]?.playerName === 'string'
										? String(engine.playerStats[sid].playerName)
										: p}
								{@const copa = engine.complianceByPlayer[p] ?? 'unverified'}
								<tr
									class="stw__row"
									role="button"
									tabindex="0"
									onclick={() => engine.openDrawer(p)}
									onkeydown={(e) => e.key === 'Enter' && engine.openDrawer(p)}
								>
									<td class="stw__mono">{rowLabel}</td>
									<td class="stw__mono">
										{engine.jerseys[p] != null && String(engine.jerseys[p]).trim() ? engine.jerseys[p] : '—'}
									</td>
									<td
										class="stw__mono"
										class:stw__green={copa === 'compliant' && (engine.linkedPlayers.has(rowLabel) || engine.linkedPlayers.has(p))}
									>
										{#if engine.linkedPlayers.has(rowLabel) || engine.linkedPlayers.has(p)}
											LIVE
										{:else}
											—
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
				</div>
			</div>
		</section>

		<section class="stw__panel" aria-labelledby="stw-signals">
			<div class="stw__panelhead">
				<h2 id="stw-signals" class="stw__h2">Open signals</h2>
			</div>

			<div class="stw__subhead">VPC (video compliance)</div>
			{#if engine.vpcLoading}
				<p class="stw__muted">Subscribing to queue…</p>
			{:else if engine.vpcErr}
				<p class="stw__err">{engine.vpcErr}</p>
			{:else if engine.vpcItems.length === 0}
				<p class="stw__muted">No pending verifications.</p>
			{:else}
				<ul class="stw__list">
					{#each engine.vpcItems as v (v.id)}
						<li class="stw__li">
							<div class="stw__lirow">
								<span class="stw__mono">{String(v.playerName ?? 'Player')}</span>
								<span class="stw__muted2">{fmtTime(v.submittedAt)}</span>
							</div>
							<div class="stw__liact">
								<button
									type="button"
									class="stw__mini stw__mini--ok"
									disabled={engine.busyVpcId === v.id}
									onclick={() => engine.vpcAct(/** @type {string} */(v.id), 'approve')}
								>OK</button>
								<button
									type="button"
									class="stw__mini stw__mini--no"
									disabled={engine.busyVpcId === v.id}
									onclick={() => engine.vpcAct(/** @type {string} */(v.id), 'reject')}
								>NO</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="stw__subhead">Field trials (recent)</div>
			{#if engine.trialRows.length === 0}
				<p class="stw__muted">No recent trials.</p>
			{:else}
				<ul class="stw__list stw__list--dense">
					{#each engine.trialRows as t (t.id)}
						<li class="stw__mono stw__tiny">
							{String(t.player ?? '—')} · {String(t.type ?? t.skill ?? 'trial')}
						</li>
					{/each}
				</ul>
			{/if}

			<div class="stw__subhead">Evaluations (latest)</div>
			{#if engine.evalRows.length === 0}
				<p class="stw__muted">No evaluation rows.</p>
			{:else}
				<ul class="stw__list stw__list--dense">
					{#each engine.evalRows as e (e.id)}
						<li class="stw__mono stw__tiny">
							{String(e.player ?? '—')} · {String(e.skill ?? '—')} · {String(e.score ?? '—')}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>