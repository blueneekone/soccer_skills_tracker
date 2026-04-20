<script>
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		getDocs,
		limit,
		orderBy,
		query,
	} from 'firebase/firestore';

	let { clubId = '' } = $props();

	const isSuperAdmin = $derived(authStore.role === 'super_admin');

	let adminClubInput = $state('');

	const effectiveClubId = $derived(
		isSuperAdmin ? adminClubInput.trim() : String(clubId || '').trim(),
	);

	const publishClubCampaign = httpsCallable(functions, 'publishClubCampaign');

	let title = $state('');
	let body = $state('');
	let targetAudience = $state('all');
	let priority = $state(false);
	let publishBusy = $state(false);
	let publishError = $state('');
	let publishOk = $state('');

	let historyVersion = $state(0);
	let historyLoading = $state(false);
	let historyError = $state('');
	/** @type {Array<{ id: string } & Record<string, unknown>>} */
	let campaigns = $state([]);

	/** @type {Record<string, string>} */
	const audienceLabels = {
		all: 'Everyone',
		parents: 'Parents',
		coaches: 'Coaches',
		players: 'Players',
	};

	/**
	 * @param {unknown} ts
	 */
	function formatCreated(ts) {
		if (!ts || typeof ts !== 'object' || !('toDate' in ts)) return '';
		const t = /** @type {{ toDate: () => Date }} */ (ts);
		try {
			return t.toDate().toLocaleString();
		} catch {
			return '';
		}
	}

	$effect(() => {
		const cid = effectiveClubId;
		historyVersion;
		if (!cid) {
			campaigns = [];
			historyLoading = false;
			historyError = '';
			return;
		}
		let cancelled = false;
		historyLoading = true;
		historyError = '';
		(async () => {
			try {
				const q = query(
					collection(db, 'clubs', cid, 'campaigns'),
					orderBy('createdAt', 'desc'),
					limit(40),
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				const rows = [];
				snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
				campaigns = rows;
			} catch (e) {
				if (!cancelled) {
					historyError =
						e && typeof e === 'object' && 'message' in e ?
							String(e.message) :
							'Could not load campaigns.';
					campaigns = [];
				}
			} finally {
				if (!cancelled) historyLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function sendCampaign() {
		publishError = '';
		publishOk = '';
		const t = title.trim();
		const b = body.trim();
		if (!t || !b) {
			publishError = 'Title and message are required.';
			return;
		}
		if (isSuperAdmin && !adminClubInput.trim()) {
			publishError = 'Enter the target club ID.';
			return;
		}
		if (!isSuperAdmin && !String(clubId || '').trim()) {
			publishError = 'Club context is missing.';
			return;
		}
		publishBusy = true;
		try {
			/** @type {Record<string, unknown>} */
			const payload = {
				title: t,
				body: b,
				targetAudience,
				priority: priority === true,
			};
			if (isSuperAdmin) {
				payload.clubId = adminClubInput.trim();
			}
			await publishClubCampaign(payload);
			title = '';
			body = '';
			targetAudience = 'all';
			priority = false;
			publishOk = 'Campaign published.';
			historyVersion++;
		} catch (e) {
			publishError =
				e && typeof e === 'object' && 'message' in e ?
					String(e.message) :
					'Publish failed.';
		} finally {
			publishBusy = false;
		}
	}
</script>

<div class="marketing-tab">
	<div class="bento-section marketing-bento">
		<div class="card marketing-compose">
			<div class="card-header marketing-card-head">Compose campaign</div>
			<div class="card-body marketing-card-body">
				{#if isSuperAdmin}
					<label class="marketing-label" for="marketing-club-id">Target club ID</label>
					<input
						id="marketing-club-id"
						class="marketing-input"
						type="text"
						bind:value={adminClubInput}
						placeholder="Club document id"
						autocomplete="off"
					/>
				{/if}

				{#if !isSuperAdmin && !clubId}
					<p class="marketing-hint" role="status">
						Your profile needs a club scope to send campaigns.
					</p>
				{:else}
					<label class="marketing-label" for="marketing-title">Title</label>
					<input
						id="marketing-title"
						class="marketing-input"
						type="text"
						bind:value={title}
						maxlength="200"
						placeholder="e.g. Spring tryouts — registration open"
					/>

					<label class="marketing-label" for="marketing-body">Message</label>
					<textarea
						id="marketing-body"
						class="marketing-textarea"
						rows="8"
						bind:value={body}
						maxlength="8000"
						placeholder="Announcement details, dates, links (plain text)…"
					></textarea>

					<label class="marketing-label" for="marketing-audience">Target audience</label>
					<select id="marketing-audience" class="marketing-select" bind:value={targetAudience}>
						<option value="all">Everyone in the club</option>
						<option value="parents">Parents</option>
						<option value="coaches">Coaches</option>
						<option value="players">Players</option>
					</select>

					<label class="marketing-priority">
						<input type="checkbox" bind:checked={priority} />
						<span>High priority</span>
					</label>

					<button
						type="button"
						class="primary-btn marketing-send"
						disabled={publishBusy || (!isSuperAdmin && !clubId)}
						onclick={sendCampaign}
					>
						{publishBusy ? 'Sending…' : 'Send campaign'}
					</button>

					{#if publishError}
						<p class="marketing-error" role="alert">{publishError}</p>
					{/if}
					{#if publishOk}
						<p class="marketing-ok" role="status">{publishOk}</p>
					{/if}
				{/if}
			</div>
		</div>

		<div class="card marketing-history">
			<div class="card-header marketing-card-head">Campaign history</div>
			<div class="card-body marketing-card-body">
				{#if !effectiveClubId}
					<p class="marketing-hint">
						{#if isSuperAdmin}
							Enter a club ID to load past broadcasts.
						{:else}
							Club context required to view history.
						{/if}
					</p>
				{:else if historyLoading}
					<div class="marketing-skeleton" aria-busy="true" aria-label="Loading campaigns">
						<div class="marketing-skel-line"></div>
						<div class="marketing-skel-line marketing-skel-line--mid"></div>
						<div class="marketing-skel-line marketing-skel-line--short"></div>
						<div class="marketing-skel-line"></div>
						<div class="marketing-skel-line marketing-skel-line--mid"></div>
					</div>
				{:else if historyError}
					<p class="marketing-error" role="alert">{historyError}</p>
				{:else if campaigns.length === 0}
					<p class="marketing-hint">No campaigns yet. Send your first announcement.</p>
				{:else}
					<ul class="marketing-list">
						{#each campaigns as c (c.id)}
							<li class="marketing-item" class:marketing-item--priority={c.priority === true}>
								<div class="marketing-item-head">
									<span class="marketing-item-title">{String(c.title || '')}</span>
									{#if c.priority === true}
										<span class="marketing-priority-badge">Priority</span>
									{/if}
								</div>
								<p class="marketing-item-meta">
									{formatCreated(c.createdAt)}
									·
									{audienceLabels[String(c.targetAudience || '')] ||
										String(c.targetAudience || '')}
								</p>
								<p class="marketing-item-body">{String(c.body || '')}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.marketing-tab {
		width: 100%;
		box-sizing: border-box;
	}

	.marketing-bento {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
		gap: clamp(16px, 3vw, 24px);
		align-items: start;
	}

	.marketing-compose,
	.marketing-history {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.marketing-card-head {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.marketing-card-body {
		padding-top: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(12px, 2vw, 16px);
	}

	.marketing-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.marketing-input,
	.marketing-select,
	.marketing-textarea {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px) clamp(12px, 2vw, 14px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--input-border);
		background: var(--input-bg);
		font: inherit;
		margin: 0;
	}

	.marketing-textarea {
		resize: vertical;
		min-height: 140px;
		line-height: 1.5;
	}

	.marketing-priority {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		margin: 0;
	}

	.marketing-send {
		width: 100%;
		margin: 0;
		padding: clamp(12px, 2.5vw, 14px) clamp(16px, 3vw, 20px);
		border-radius: var(--radius-premium);
		font-weight: 900;
	}

	.marketing-hint {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.marketing-error {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--danger-red);
	}

	.marketing-ok {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--success-green);
	}

	.marketing-skeleton {
		display: flex;
		flex-direction: column;
		gap: clamp(12px, 2vw, 14px);
		padding: clamp(8px, 1.5vw, 12px) 0;
	}

	.marketing-skel-line {
		height: 12px;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			rgba(15, 23, 42, 0.06) 0%,
			rgba(15, 23, 42, 0.14) 50%,
			rgba(15, 23, 42, 0.06) 100%
		);
		background-size: 200% 100%;
		animation: marketing-shimmer 1.2s ease-in-out infinite;
	}

	.marketing-skel-line--mid {
		width: 85%;
	}

	.marketing-skel-line--short {
		width: 55%;
	}

	@keyframes marketing-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.marketing-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(12px, 2vw, 16px);
	}

	.marketing-item {
		padding: clamp(14px, 2.5vw, 18px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
	}

	.marketing-item--priority {
		border-color: rgba(245, 158, 11, 0.45);
		box-shadow: 0 8px 24px -12px rgba(245, 158, 11, 0.35);
	}

	.marketing-item-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 6px;
	}

	.marketing-item-title {
		font-weight: 900;
		font-size: clamp(0.95rem, 2.4vw, 1.05rem);
		letter-spacing: -0.02em;
	}

	.marketing-priority-badge {
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 4px 10px;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--aggie-gold) 0%, #fbbf24 100%);
		color: var(--text-on-gold);
	}

	.marketing-item-meta {
		margin: 0 0 10px;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.marketing-item-body {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 600;
		line-height: 1.55;
		white-space: pre-wrap;
		word-break: break-word;
	}

	:global(html.dark) .marketing-skel-line {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.06) 0%,
			rgba(255, 255, 255, 0.12) 50%,
			rgba(255, 255, 255, 0.06) 100%
		);
		background-size: 200% 100%;
	}

	:global(html.dark) .marketing-item {
		background: rgba(15, 23, 42, 0.45);
		border-color: rgba(255, 255, 255, 0.12);
	}
</style>
