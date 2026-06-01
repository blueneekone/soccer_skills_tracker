<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';

	let {
		teamId = '',
		clubId = '',
		teamName = '',
	}: {
		teamId?: string;
		clubId?: string;
		teamName?: string;
	} = $props();

	const engine = new CommsEngine();

	let subject = $state('');
	let body = $state('');

	const canSend = $derived(Boolean(teamId?.trim()) && body.trim().length > 0 && !engine.isSending);

	async function sendAnnouncement() {
		if (!teamId?.trim() || !body.trim() || engine.isSending) return;
		try {
			await engine.broadcastMessage({
				target: {
					type: 'team',
					id: teamId.trim(),
					clubId: clubId?.trim() || undefined,
				},
				subject: subject.trim() || undefined,
				body: body.trim(),
			});
			subject = '';
			body = '';
		} catch {
			/* engine.error surfaced in UI */
		}
	}
</script>

<section class="pac-root" aria-labelledby="pac-heading">
	<header class="pac-head">
		<div class="pac-head-copy">
			<h2 id="pac-heading" class="pac-title">Parent announcement</h2>
			<p class="pac-sub">
				Parent-targeted team broadcast — primary staff→family surface per COMMS_HUB charter.
				Delivered via SafeSport broadcast; linked guardians auto-CC when minors are on the roster.
			</p>
		</div>
		<span class="pac-badge" aria-hidden="true">
			<Icon name={'status.shield-check' as IconName} size={14} />
			Parent-targeted
		</span>
	</header>

	{#if !teamId}
		<p class="pac-hint">Select a team to compose an announcement.</p>
	{:else}
		<p class="pac-team qa-mono" aria-label="Target team">
			{teamName || teamId}
		</p>

		<label class="pac-label" for="pac-subject">Subject <span class="pac-opt">(optional)</span></label>
		<input
			id="pac-subject"
			class="pac-input"
			type="text"
			maxlength="200"
			placeholder="Practice update, schedule change…"
			bind:value={subject}
			disabled={engine.isSending}
		/>

		<label class="pac-label" for="pac-body">Message</label>
		<textarea
			id="pac-body"
			class="pac-textarea"
			rows="4"
			maxlength="4000"
			placeholder="Write to parents and adult players on this team…"
			bind:value={body}
			disabled={engine.isSending}
		></textarea>

		{#if engine.phase === 'success' && engine.lastResult}
			<p class="pac-ok" role="status">
				Sent to {engine.lastResult.recipientCount} roster member{engine.lastResult.recipientCount === 1
					? ''
					: 's'}.
				{#if engine.lastResult.ccParentCount > 0}
					{engine.lastResult.ccParentCount} linked parent{engine.lastResult.ccParentCount === 1
						? ''
						: 's'} notified.
				{/if}
			</p>
		{:else if engine.error}
			<p class="pac-err" role="alert">{engine.error}</p>
		{/if}

		<div class="pac-actions">
			{#if engine.phase === 'success'}
				<button type="button" class="pac-btn pac-btn--ghost" onclick={() => engine.reset()}>
					Dismiss
				</button>
			{/if}
			<button
				type="button"
				class="pac-btn pac-btn--primary"
				disabled={!canSend}
				onclick={() => void sendAnnouncement()}
			>
				{engine.isSending ? 'Sending…' : 'Send to parents'}
			</button>
		</div>
	{/if}
</section>

<style>
	.pac-root {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 18px 20px;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		background: #fff;
		box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
	}

	:global(html.dark) .pac-root {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pac-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.pac-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary, #0f172a);
	}

	.pac-sub {
		margin: 4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: #64748b;
		max-width: 42rem;
	}

	.pac-badge {
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
		color: #047857;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.28);
	}

	.pac-hint,
	.pac-team {
		margin: 0;
		font-size: 13px;
		color: #64748b;
	}

	.pac-team {
		font-weight: 700;
		color: #334155;
	}

	.pac-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
	}

	.pac-opt {
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}

	.pac-input,
	.pac-textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		background: #f8fafc;
		color: var(--text-primary, #0f172a);
	}

	.pac-textarea {
		resize: vertical;
		min-height: 96px;
	}

	:global(html.dark) .pac-input,
	:global(html.dark) .pac-textarea {
		background: #0c0c0e;
		border-color: rgba(255, 255, 255, 0.12);
		color: #e4e4e7;
	}

	.pac-ok {
		margin: 0;
		padding: 10px 12px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 600;
		color: #047857;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.25);
	}

	.pac-err {
		margin: 0;
		font-size: 12px;
		color: #b91c1c;
	}

	.pac-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 4px;
	}

	.pac-btn {
		border-radius: 12px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		border: 1px solid #e2e8f0;
	}

	.pac-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pac-btn--ghost {
		background: #fff;
		color: var(--text-primary, #0f172a);
	}

	.pac-btn--primary {
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
		border-color: transparent;
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
	}
</style>
