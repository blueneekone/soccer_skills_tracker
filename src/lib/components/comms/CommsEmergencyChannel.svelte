<script lang="ts">
	import { COMMS_CHANNEL_TYPE_REGISTRY } from '$lib/comms/channelTypes.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';
	import DeliveryReceipt from '$lib/components/comms/DeliveryReceipt.svelte';

	let {
		clubId = '',
		clubName = '',
		teams = [],
	}: {
		clubId?: string;
		clubName?: string;
		teams?: Array<{ id: string; name?: string }>;
	} = $props();

	const engine = new CommsEngine();
	const def = COMMS_CHANNEL_TYPE_REGISTRY.emergency;

	let subject = $state('');
	let body = $state('');
	let allTeams = $state(true);
	/** @type {Set<string>} */
	let selectedTeamIds = $state(new Set<string>());
	let confirmOpen = $state(false);

	$effect(() => {
		if (allTeams) {
			selectedTeamIds = new Set(teams.map((t) => t.id));
		}
	});

	const targetCount = $derived(allTeams ? teams.length : selectedTeamIds.size);
	const canSend = $derived(
		Boolean(clubId?.trim()) &&
			subject.trim().length > 0 &&
			body.trim().length > 0 &&
			targetCount > 0 &&
			!engine.isSending,
	);

	function toggleTeam(teamId: string) {
		const next = new Set(selectedTeamIds);
		if (next.has(teamId)) next.delete(teamId);
		else next.add(teamId);
		selectedTeamIds = next;
		allTeams = next.size === teams.length;
	}

	function openConfirm() {
		if (!canSend) return;
		confirmOpen = true;
	}

	async function sendEmergency() {
		if (!clubId?.trim() || !subject.trim() || !body.trim() || engine.isSending) return;
		confirmOpen = false;
		const teamIds = allTeams ? undefined : [...selectedTeamIds];
		try {
			await engine.emergencyClubBroadcast({
				clubId: clubId.trim(),
				subject: subject.trim(),
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

<section class="comms-emergency" aria-labelledby="comms-emergency-heading">
	<header class="comms-emergency__head">
		<h2 id="comms-emergency-heading" class="comms-emergency__title">
			{def.label}
			<span class="comms-emergency__badge">Break-glass</span>
		</h2>
		<p class="comms-emergency__sub">{def.description}</p>
		<p class="comms-emergency__warn" role="note">
			Use only for weather, safety, or lockdown situations. Sends high-priority push to all
			consented families; SMS requires <code>feature_flags/commsSmsEmergency</code> on dev.
		</p>
	</header>

	{#if !clubId}
		<p class="comms-emergency__muted">Select a club context to send an emergency broadcast.</p>
	{:else}
		<p class="comms-emergency__club">{clubName || clubId}</p>

		<fieldset class="comms-emergency__fieldset">
			<legend class="comms-emergency__label">Target teams</legend>
			<label class="comms-emergency__check comms-emergency__check--all">
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
				<p class="comms-emergency__muted">No teams in this club yet.</p>
			{:else if !allTeams}
				<ul class="comms-emergency__team-list">
					{#each teams as team (team.id)}
						<li>
							<label class="comms-emergency__check">
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

		<label class="comms-emergency__label" for="comms-emergency-subject">Subject (required)</label>
		<input
			id="comms-emergency-subject"
			class="comms-emergency__input"
			type="text"
			maxlength="200"
			placeholder="Weather delay, field closure, safety alert…"
			bind:value={subject}
			disabled={engine.isSending}
		/>

		<label class="comms-emergency__label" for="comms-emergency-body">Message</label>
		<textarea
			id="comms-emergency-body"
			class="comms-emergency__textarea"
			rows="5"
			maxlength="4000"
			placeholder="Write the emergency notice for all club families…"
			bind:value={body}
			disabled={engine.isSending}
		></textarea>

		{#if engine.phase === 'success' && engine.lastClubResult}
			<p class="comms-emergency__ok" role="status">
				Emergency sent to {engine.lastClubResult.successCount} of
				{engine.lastClubResult.teamCount} team{engine.lastClubResult.teamCount === 1 ? '' : 's'}.
			</p>
			{#if engine.lastClubResult.deliveryReport}
				<DeliveryReceipt report={engine.lastClubResult.deliveryReport} />
			{/if}
			{#each engine.lastClubResult.results.filter((r) => r.deliveryReport) as row (row.teamId)}
				<div class="comms-emergency__team-receipt">
					<p class="comms-emergency__team-label">
						{teams.find((t) => t.id === row.teamId)?.name || row.teamId}
					</p>
					<DeliveryReceipt report={row.deliveryReport!} compact />
				</div>
			{/each}
		{:else if engine.error}
			<p class="comms-emergency__err" role="alert">{engine.error}</p>
		{/if}

		<div class="comms-emergency__actions">
			{#if engine.phase === 'success'}
				<button type="button" class="comms-emergency__btn comms-emergency__btn--ghost" onclick={() => engine.reset()}>
					Dismiss
				</button>
			{/if}
			<button
				type="button"
				class="comms-emergency__btn comms-emergency__btn--danger"
				disabled={!canSend}
				onclick={openConfirm}
			>
				{engine.isSending ? 'Sending…' : `Send emergency to ${targetCount} team${targetCount === 1 ? '' : 's'}`}
			</button>
		</div>
	{/if}
</section>

{#if confirmOpen}
	<div class="comms-emergency__dialog-backdrop" role="presentation">
		<div
			class="comms-emergency__dialog"
			role="alertdialog"
			aria-labelledby="comms-emergency-confirm-title"
			aria-describedby="comms-emergency-confirm-body"
		>
			<h3 id="comms-emergency-confirm-title" class="comms-emergency__dialog-title">
				Confirm emergency broadcast
			</h3>
			<p id="comms-emergency-confirm-body" class="comms-emergency__dialog-copy">
				This will send a high-priority alert to parents across
				<strong>{targetCount}</strong> team{targetCount === 1 ? '' : 's'} in
				<strong>{clubName || clubId}</strong>. Subject: <strong>{subject.trim()}</strong>
			</p>
			<div class="comms-emergency__dialog-actions">
				<button
					type="button"
					class="comms-emergency__btn comms-emergency__btn--ghost"
					onclick={() => (confirmOpen = false)}
					disabled={engine.isSending}
				>
					Cancel
				</button>
				<button
					type="button"
					class="comms-emergency__btn comms-emergency__btn--danger"
					disabled={engine.isSending}
					onclick={() => void sendEmergency()}
				>
					{engine.isSending ? 'Sending…' : 'Send emergency now'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.comms-emergency {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 18px 20px;
		border: 1px solid rgba(239, 68, 68, 0.45);
		border-radius: 12px;
		background: rgba(69, 10, 10, 0.25);
		color: #e2e8f0;
	}

	.comms-emergency__head {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.comms-emergency__title {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 16px;
		font-weight: 800;
		color: #fecaca;
	}

	.comms-emergency__badge {
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #fef2f2;
		background: rgba(239, 68, 68, 0.35);
		border: 1px solid rgba(248, 113, 113, 0.5);
	}

	.comms-emergency__sub,
	.comms-emergency__warn,
	.comms-emergency__muted,
	.comms-emergency__club {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
	}

	.comms-emergency__warn {
		padding: 8px 10px;
		border-radius: 8px;
		background: rgba(127, 29, 29, 0.35);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: #fecaca;
	}

	.comms-emergency__warn code {
		font-size: 11px;
		color: #fca5a5;
	}

	.comms-emergency__club {
		font-weight: 700;
		color: #cbd5e1;
	}

	.comms-emergency__fieldset {
		border: 1px solid #334155;
		border-radius: 10px;
		padding: 10px 12px;
		margin: 0;
	}

	.comms-emergency__label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.comms-emergency__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: #cbd5e1;
		margin-top: 6px;
	}

	.comms-emergency__check--all {
		margin-top: 0;
		font-weight: 700;
	}

	.comms-emergency__team-list {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 12rem;
		overflow-y: auto;
	}

	.comms-emergency__input,
	.comms-emergency__textarea {
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

	.comms-emergency__ok {
		margin: 0;
		padding: 10px 12px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 600;
		color: #fca5a5;
		background: rgba(127, 29, 29, 0.35);
		border: 1px solid rgba(239, 68, 68, 0.35);
	}

	.comms-emergency__err {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}

	.comms-emergency__team-receipt {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.comms-emergency__team-label {
		margin: 0;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
	}

	.comms-emergency__actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 4px;
	}

	.comms-emergency__btn {
		border-radius: 10px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		border: 1px solid #334155;
	}

	.comms-emergency__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.comms-emergency__btn--ghost {
		background: transparent;
		color: #cbd5e1;
	}

	.comms-emergency__btn--danger {
		background: #dc2626;
		color: #fef2f2;
		border-color: transparent;
	}

	.comms-emergency__dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: rgba(15, 23, 42, 0.72);
	}

	.comms-emergency__dialog {
		width: min(100%, 28rem);
		padding: 18px 20px;
		border-radius: 12px;
		border: 1px solid rgba(239, 68, 68, 0.45);
		background: #0f172a;
	}

	.comms-emergency__dialog-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: #fecaca;
	}

	.comms-emergency__dialog-copy {
		margin: 10px 0 0;
		font-size: 13px;
		line-height: 1.5;
		color: #cbd5e1;
	}

	.comms-emergency__dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 16px;
	}
</style>
