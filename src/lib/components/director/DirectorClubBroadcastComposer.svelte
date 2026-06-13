<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';

	let {
		clubId = '',
		teams = [],
		clubName = '',
	}: {
		clubId?: string;
		teams?: Array<{ id: string; name?: string }>;
		clubName?: string;
	} = $props();

	const engine = new CommsEngine();

	let subject = $state('');
	let body = $state('');
	let allTeams = $state(true);
	/** @type {Set<string>} */
	let selectedTeamIds = $state(new Set());

	$effect(() => {
		if (allTeams) {
			selectedTeamIds = new Set(teams.map((t) => t.id));
		}
	});

	const targetCount = $derived(allTeams ? teams.length : selectedTeamIds.size);
	const canSend = $derived(
		Boolean(clubId?.trim()) && body.trim().length > 0 && targetCount > 0 && !engine.isSending,
	);

	function toggleTeam(teamId: string) {
		const next = new Set(selectedTeamIds);
		if (next.has(teamId)) next.delete(teamId);
		else next.add(teamId);
		selectedTeamIds = next;
		allTeams = next.size === teams.length;
	}

	async function sendBroadcast() {
		if (!clubId?.trim() || !body.trim() || engine.isSending || targetCount === 0) return;
		const teamIds = allTeams ? undefined : [...selectedTeamIds];
		try {
			await engine.clubBroadcastMessage({
				clubId: clubId.trim(),
				subject: subject.trim() || undefined,
				body: body.trim(),
				teamIds: teamIds as string[] | undefined,
			});
			subject = '';
			body = '';
		} catch {
			/* engine.error surfaced in UI */
		}
	}
</script>

<section class="dcb-root" aria-labelledby="dcb-heading">
	<header class="dcb-head">
		<div class="dcb-head-copy">
			<h2 id="dcb-heading" class="dcb-title">Club broadcast</h2>
			<p class="dcb-sub">
				Director club-wide announcement — fans out to team broadcasts with SafeSport parent CC per roster.
				Rides the Epic 4.3 push bus (`push_announcements`).
			</p>
		</div>
		<span class="dcb-badge" aria-hidden="true">
			<Icon name={'status.shield-check' as IconName} size={14} />
			Club-wide
		</span>
	</header>

	{#if !clubId}
		<p class="dcb-hint">Select a club context to compose a broadcast.</p>
	{:else}
		<p class="dcb-club qa-mono" aria-label="Target club">
			{clubName || clubId}
		</p>

		<fieldset class="dcb-fieldset">
			<legend class="dcb-label">Target teams</legend>
			<label class="dcb-check dcb-check--all">
				<input
					type="checkbox"
					checked={allTeams}
					onchange={(e) => {
						allTeams = e.currentTarget.checked;
						if (allTeams) selectedTeamIds = new Set(teams.map((t) => t.id));
					}}
					disabled={engine.isSending || teams.length === 0}
				/>
				All teams ({teams.length})
			</label>
			{#if teams.length === 0}
				<p class="dcb-muted">No teams in this club yet.</p>
			{:else if !allTeams}
				<ul class="dcb-team-list">
					{#each teams as team (team.id)}
						<li>
							<label class="dcb-check">
								<input
									type="checkbox"
									checked={selectedTeamIds.has(team.id)}
									onchange={() => toggleTeam(team.id)}
									disabled={engine.isSending}
								/>
								{team.name || team.id}
							</label>
						</li>
					{/each}
				</ul>
			{/if}
		</fieldset>

		<label class="dcb-label" for="dcb-subject">Subject <span class="dcb-opt">(optional)</span></label>
		<input
			id="dcb-subject"
			class="dcb-input"
			type="text"
			maxlength="200"
			placeholder="Club update, weather policy, registration deadline…"
			bind:value={subject}
			disabled={engine.isSending}
		/>

		<label class="dcb-label" for="dcb-body">Message</label>
		<textarea
			id="dcb-body"
			class="dcb-textarea"
			rows="5"
			maxlength="4000"
			placeholder="Write to parents and adult players across selected teams…"
			bind:value={body}
			disabled={engine.isSending}
		></textarea>

		{#if engine.phase === 'success' && engine.lastClubResult}
			<p class="dcb-ok" role="status">
				Sent to {engine.lastClubResult.successCount} of {engine.lastClubResult.teamCount} team{engine.lastClubResult.teamCount === 1 ? '' : 's'}
				({engine.lastClubResult.totalRecipients} roster member{engine.lastClubResult.totalRecipients === 1 ? '' : 's'}).
				{#if engine.lastClubResult.totalCcParents > 0}
					{engine.lastClubResult.totalCcParents} linked parent{engine.lastClubResult.totalCcParents === 1 ? '' : 's'} notified.
				{/if}
			</p>
		{:else if engine.error}
			<p class="dcb-err" role="alert">{engine.error}</p>
		{/if}

		<div class="dcb-actions">
			{#if engine.phase === 'success'}
				<button type="button" class="dcb-btn dcb-btn--ghost" onclick={() => engine.reset()}>
					Dismiss
				</button>
			{/if}
			<button
				type="button"
				class="dcb-btn dcb-btn--primary"
				disabled={!canSend}
				onclick={() => void sendBroadcast()}
			>
				{engine.isSending ? 'Sending…' : `Send to ${targetCount} team${targetCount === 1 ? '' : 's'}`}
			</button>
		</div>
	{/if}
</section>

<style>
	.dcb-root {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 18px 20px;
		border: 1px solid #334155;
		border-radius: 12px;
		background: #0f172a;
		color: #e2e8f0;
	}

	.dcb-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.dcb-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #f8fafc;
	}

	.dcb-sub {
		margin: 4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
		max-width: 42rem;
	}

	.dcb-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		padding: 6px 10px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #14b8a6;
		background: rgba(20, 184, 166, 0.12);
		border: 1px solid rgba(20, 184, 166, 0.35);
	}

	.dcb-hint,
	.dcb-club,
	.dcb-muted {
		margin: 0;
		font-size: 13px;
		color: #94a3b8;
	}

	.dcb-club {
		font-weight: 700;
		color: #cbd5e1;
	}

	.dcb-fieldset {
		border: 1px solid #334155;
		border-radius: 10px;
		padding: 10px 12px;
		margin: 0;
	}

	.dcb-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.dcb-opt {
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}

	.dcb-check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: #cbd5e1;
		margin-top: 6px;
	}

	.dcb-check--all {
		margin-top: 0;
		font-weight: 700;
	}

	.dcb-team-list {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 12rem;
		overflow-y: auto;
	}

	.dcb-input,
	.dcb-textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #334155;
		border-radius: 10px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		background: #1e293b;
		color: #f8fafc;
	}

	.dcb-textarea {
		resize: vertical;
		min-height: 110px;
	}

	.dcb-ok {
		margin: 0;
		padding: 10px 12px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 600;
		color: #14b8a6;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.3);
	}

	.dcb-err {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}

	.dcb-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 4px;
	}

	.dcb-btn {
		border-radius: 10px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		border: 1px solid #334155;
	}

	.dcb-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dcb-btn--ghost {
		background: transparent;
		color: #cbd5e1;
	}

	.dcb-btn--primary {
		background: #14b8a6;
		color: #0f172a;
		border-color: transparent;
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
	}
</style>
