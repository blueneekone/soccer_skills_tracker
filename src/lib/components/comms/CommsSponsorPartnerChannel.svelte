<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { COMMS_CHANNEL_TYPE_REGISTRY } from '$lib/comms/channelTypes.js';
	import { CommsEngine, type DeliveryReport } from '$lib/services/comms.svelte.js';
	import DeliveryReceipt from '$lib/components/comms/DeliveryReceipt.svelte';

	let { clubId = '' } = $props();

	type SponsorTemplate = {
		id: string;
		title: string;
		partnerName: string;
		headline: string;
		body: string;
		ctaLabel: string | null;
		ctaUrl: string | null;
		status: string;
	};

	type SponsorMessage = {
		id: string;
		subject: string | null;
		text: string;
		partnerName: string | null;
		parentEmail: string | null;
		templateId: string | null;
		createdAt?: { toDate?: () => Date };
		digestSend?: boolean;
	};

	const engine = new CommsEngine();
	const role = $derived(authStore.role);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const channelId = $derived(clubId.trim() ? `sponsor-partner-${clubId.trim()}` : '');
	const def = COMMS_CHANNEL_TYPE_REGISTRY.sponsor_partner;
	const isDirector = $derived(role === 'director' || role === 'admin');

	let title = $state('');
	let partnerName = $state('');
	let headline = $state('');
	let body = $state('');
	let ctaLabel = $state('');
	let ctaUrl = $state('');
	let templates = $state<SponsorTemplate[]>([]);
	let messages = $state<SponsorMessage[]>([]);
	let loadingTemplates = $state(true);
	let loadingMessages = $state(true);
	let error = $state('');
	let confirmSendId = $state('');

	const canCreate = $derived(
		isDirector &&
			Boolean(clubId.trim()) &&
			title.trim().length > 0 &&
			partnerName.trim().length > 0 &&
			headline.trim().length > 0 &&
			body.trim().length > 0 &&
			!engine.isSending,
	);

	$effect(() => {
		if (!browser || !clubId.trim() || !isDirector) {
			templates = [];
			loadingTemplates = false;
			return;
		}
		loadingTemplates = true;
		const qy = query(
			collection(db, 'clubs', clubId.trim(), 'sponsor_templates'),
			orderBy('createdAt', 'desc'),
			limit(20),
		);
		const unsub = onSnapshot(
			qy,
			(snap) => {
				templates = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						title: String(x.title || ''),
						partnerName: String(x.partnerName || ''),
						headline: String(x.headline || ''),
						body: String(x.body || ''),
						ctaLabel: typeof x.ctaLabel === 'string' ? x.ctaLabel : null,
						ctaUrl: typeof x.ctaUrl === 'string' ? x.ctaUrl : null,
						status: String(x.status || 'draft'),
					};
				});
				loadingTemplates = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load templates.';
				loadingTemplates = false;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		if (!browser || !clubId.trim() || !channelId) {
			messages = [];
			loadingMessages = false;
			return;
		}
		loadingMessages = true;
		const qy = query(
			collection(db, 'clubs', clubId.trim(), 'channels', channelId, 'messages'),
			orderBy('createdAt', 'desc'),
			limit(isDirector ? 40 : 20),
		);
		const unsub = onSnapshot(
			qy,
			(snap) => {
				messages = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						subject: typeof x.subject === 'string' ? x.subject : null,
						text: String(x.text || x.body || ''),
						partnerName: typeof x.partnerName === 'string' ? x.partnerName : null,
						parentEmail: typeof x.parentEmail === 'string' ? x.parentEmail : null,
						templateId: typeof x.templateId === 'string' ? x.templateId : null,
						createdAt: x.createdAt,
						digestSend: x.digestSend === true,
					};
				});
				loadingMessages = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load sponsor messages.';
				loadingMessages = false;
			},
		);
		return () => unsub();
	});

	const visibleMessages = $derived(
		isDirector
			? messages.filter((m) => !m.digestSend)
			: messages.filter(
					(m) =>
						!m.digestSend &&
						m.parentEmail &&
						m.parentEmail.toLowerCase() === myEmail,
				),
	);

	const lastDeliveryReport = $derived.by(() => {
		const result = engine.lastSponsorResult;
		const dr = result?.deliveryReport;
		if (!dr) return null;
		return {
			messageId: result.templateId,
			audienceScope: 'club_parents' as const,
			rosterAthleteCount: 0,
			parentDelivered: dr.parentDelivered,
			parentSkipped: dr.parentSkipped,
			ccParentEmails: [],
		} satisfies DeliveryReport;
	});

	function formatDate(ts: SponsorMessage['createdAt']) {
		if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
		return '—';
	}

	async function createTemplate() {
		if (!canCreate) return;
		try {
			await engine.createSponsorTemplate({
				clubId: clubId.trim(),
				title: title.trim(),
				partnerName: partnerName.trim(),
				headline: headline.trim(),
				body: body.trim(),
				ctaLabel: ctaLabel.trim() || undefined,
				ctaUrl: ctaUrl.trim() || undefined,
			});
			title = '';
			partnerName = '';
			headline = '';
			body = '';
			ctaLabel = '';
			ctaUrl = '';
		} catch {
			/* engine.error */
		}
	}

	async function approveTemplate(templateId: string) {
		if (!clubId.trim() || engine.isSending) return;
		try {
			await engine.approveSponsorTemplate({ clubId: clubId.trim(), templateId });
		} catch {
			/* engine.error */
		}
	}

	async function sendDigest() {
		if (!confirmSendId || !clubId.trim() || engine.isSending) return;
		const id = confirmSendId;
		confirmSendId = '';
		try {
			await engine.sendSponsorPartnerDigest({ clubId: clubId.trim(), templateId: id });
		} catch {
			/* engine.error */
		}
	}
</script>

<section class="comms-sponsor" aria-labelledby="comms-sponsor-heading">
	<header class="comms-sponsor__head">
		<h2 id="comms-sponsor-heading" class="comms-sponsor__title">{def.label}</h2>
		<p class="comms-sponsor__sub">{def.description}</p>
	</header>

	{#if isDirector}
		<p class="comms-sponsor__note">
			Director-approved partner templates only. Guardians must opt in via VPC
			(<strong>consentSponsor</strong> + in-app comms). Never sent to minor accounts.
		</p>

		<form class="comms-sponsor__form" onsubmit={(e) => { e.preventDefault(); void createTemplate(); }}>
			<h3 class="comms-sponsor__form-title">New template (draft)</h3>
			<label class="comms-sponsor__label" for="sponsor-title">Title</label>
			<input id="sponsor-title" class="comms-sponsor__input" bind:value={title} maxlength="200" />
			<label class="comms-sponsor__label" for="sponsor-partner">Partner name</label>
			<input id="sponsor-partner" class="comms-sponsor__input" bind:value={partnerName} maxlength="120" />
			<label class="comms-sponsor__label" for="sponsor-headline">Headline</label>
			<input id="sponsor-headline" class="comms-sponsor__input" bind:value={headline} maxlength="200" />
			<label class="comms-sponsor__label" for="sponsor-body">Body</label>
			<textarea id="sponsor-body" class="comms-sponsor__textarea" bind:value={body} maxlength="2000" rows="4"></textarea>
			<label class="comms-sponsor__label" for="sponsor-cta-label">CTA label (optional)</label>
			<input id="sponsor-cta-label" class="comms-sponsor__input" bind:value={ctaLabel} maxlength="64" />
			<label class="comms-sponsor__label" for="sponsor-cta-url">CTA URL — https only (optional)</label>
			<input id="sponsor-cta-url" class="comms-sponsor__input" type="url" bind:value={ctaUrl} maxlength="500" />
			<button type="submit" class="comms-sponsor__btn" disabled={!canCreate}>Save draft</button>
		</form>

		{#if loadingTemplates}
			<p class="comms-sponsor__muted">Loading templates…</p>
		{:else if templates.length > 0}
			<ul class="comms-sponsor__templates">
				{#each templates as t (t.id)}
					<li class="comms-sponsor__template">
						<p class="comms-sponsor__template-title">
							<strong>{t.title}</strong> — {t.partnerName}
							<span class="comms-sponsor__status comms-sponsor__status--{t.status}">{t.status}</span>
						</p>
						<p class="comms-sponsor__template-preview">{t.headline}</p>
						<div class="comms-sponsor__template-actions">
							{#if t.status === 'draft'}
								<button
									type="button"
									class="comms-sponsor__btn comms-sponsor__btn--secondary"
									disabled={engine.isSending}
									onclick={() => approveTemplate(t.id)}
								>
									Approve
								</button>
							{:else if t.status === 'approved'}
								<button
									type="button"
									class="comms-sponsor__btn"
									disabled={engine.isSending}
									onclick={() => (confirmSendId = t.id)}
								>
									Send digest
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if confirmSendId}
			<div class="comms-sponsor__confirm" role="dialog" aria-labelledby="sponsor-send-confirm">
				<h3 id="sponsor-send-confirm">Confirm sponsor digest send</h3>
				<p>Only guardians who opted in (sponsor + comms VPC) will receive this digest.</p>
				<div class="comms-sponsor__confirm-actions">
					<button type="button" class="comms-sponsor__btn" disabled={engine.isSending} onclick={() => void sendDigest()}>
						Confirm send
					</button>
					<button type="button" class="comms-sponsor__btn comms-sponsor__btn--secondary" onclick={() => (confirmSendId = '')}>
						Cancel
					</button>
				</div>
			</div>
		{/if}

		{#if lastDeliveryReport}
			<DeliveryReceipt report={lastDeliveryReport} />
		{/if}
	{:else}
		<p class="comms-sponsor__note">
			Read-only partner updates when you opted in on VPC. Coach DMs and sponsor digests use separate consent.
		</p>
	{/if}

	{#if error}
		<p class="comms-sponsor__error" role="alert">{error}</p>
	{/if}
	{#if engine.error}
		<p class="comms-sponsor__error" role="alert">{engine.error}</p>
	{/if}

	<h3 class="comms-sponsor__stream-title">{isDirector ? 'Delivered digests' : 'Your partner updates'}</h3>
	{#if loadingMessages}
		<p class="comms-sponsor__muted">Loading…</p>
	{:else if visibleMessages.length === 0}
		<p class="comms-sponsor__muted">
			{isDirector ? 'No digests sent yet.' : 'No partner updates — opt in on VPC to receive them.'}
		</p>
	{:else}
		<ul class="comms-sponsor__messages">
			{#each visibleMessages as m (m.id)}
				<li class="comms-sponsor__message">
					<p class="comms-sponsor__message-meta">
						{#if m.partnerName}<strong>{m.partnerName}</strong> · {/if}
						{formatDate(m.createdAt)}
					</p>
					{#if m.subject}<p class="comms-sponsor__message-subject">{m.subject}</p>{/if}
					<p class="comms-sponsor__message-body">{m.text}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.comms-sponsor {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.comms-sponsor__head {
		margin: 0;
	}
	.comms-sponsor__title {
		margin: 0;
		font-size: 1.1rem;
	}
	.comms-sponsor__sub,
	.comms-sponsor__note,
	.comms-sponsor__muted {
		margin: 0;
		color: var(--color-muted, #94a3b8);
		font-size: 0.875rem;
	}
	.comms-sponsor__form {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		border: 1px solid var(--structural-border, #334155);
	}
	.comms-sponsor__label {
		font-size: 0.8rem;
	}
	.comms-sponsor__input,
	.comms-sponsor__textarea {
		width: 100%;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--structural-border, #334155);
		background: var(--dominant, #0f172a);
		color: inherit;
	}
	.comms-sponsor__btn {
		align-self: flex-start;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--accent-gold, #fbbf24);
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.comms-sponsor__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.comms-sponsor__btn--secondary {
		border-color: var(--structural-border, #334155);
	}
	.comms-sponsor__templates {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.comms-sponsor__template {
		padding: 0.65rem;
		border: 1px solid var(--structural-border, #334155);
	}
	.comms-sponsor__status {
		font-size: 0.75rem;
		text-transform: uppercase;
		margin-left: 0.35rem;
	}
	.comms-sponsor__status--approved {
		color: var(--accent-gold, #fbbf24);
	}
	.comms-sponsor__messages {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.comms-sponsor__message {
		padding: 0.65rem;
		border: 1px solid var(--structural-border, #334155);
	}
	.comms-sponsor__error {
		color: #f87171;
		margin: 0;
	}
	.comms-sponsor__confirm {
		padding: 0.75rem;
		border: 1px solid var(--accent-gold, #fbbf24);
	}
	.comms-sponsor__confirm-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
