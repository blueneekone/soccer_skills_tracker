<script lang="ts">
	import { browser } from '$app/environment';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		limit,
		orderBy,
		query,
		updateDoc,
		where,
	} from 'firebase/firestore';

	let { clubId = '' } = $props();

	const isSuperAdmin = $derived(authStore.role === 'super_admin');

	let adminClubInput = $state('');

	const effectiveClubId = $derived(
		isSuperAdmin ? adminClubInput.trim() : String(clubId || '').trim(),
	);

	const publishClubCampaign = httpsCallable(functions, 'publishClubCampaign');

	// --- In-app campaigns (existing) ---
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

	// --- Epic 18: marketing funnel ---
	let publicSlug = $state('');
	let metaPixelId = $state('');
	let googleAnalyticsId = $state('');
	/** @type {string[]} */
	let activeCampaigns = $state([]);
	let funnelLoading = $state(false);
	let funnelSaveBusy = $state(false);
	let funnelErr = $state('');
	let funnelOk = $state('');

	let utmCampaignName = $state('');
	let utmSource = $state('facebook');
	let generatedUtmUrl = $state('');

	/** @type {Record<string, string>} */
	const audienceLabels = {
		all: 'Everyone',
		parents: 'Parents',
		coaches: 'Coaches',
		players: 'Players',
	};

	const utmSources = [
		{ id: 'facebook', label: 'Facebook' },
		{ id: 'x', label: 'X' },
		{ id: 'instagram', label: 'Instagram' },
		{ id: 'email', label: 'Email' },
	];

	function slugifyInput(raw) {
		return String(raw || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.replace(/-{2,}/g, '-');
	}

	function storefrontBaseUrl() {
		if (!browser) return '';
		const s = slugifyInput(publicSlug);
		if (!s) return '';
		return `${window.location.origin}/club/${encodeURIComponent(s)}`;
	}

	$effect(() => {
		const cid = effectiveClubId;
		if (!cid) {
			publicSlug = '';
			metaPixelId = '';
			googleAnalyticsId = '';
			activeCampaigns = [];
			return;
		}
		let cancelled = false;
		funnelLoading = true;
		funnelErr = '';
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'clubs', cid));
				if (cancelled) return;
				const d = snap.data() || {};
				const m = d.marketing && typeof d.marketing === 'object' ? d.marketing : {};
				publicSlug = typeof m.publicSlug === 'string' ? m.publicSlug : '';
				metaPixelId = typeof m.metaPixelId === 'string' ? m.metaPixelId : '';
				googleAnalyticsId =
					typeof m.googleAnalyticsId === 'string' ? m.googleAnalyticsId : '';
				const ac = m.activeCampaigns;
				activeCampaigns =
					Array.isArray(ac) ? ac.filter((x) => typeof x === 'string').map((x) => x.slice(0, 200)) : [];
			} catch (e) {
				if (!cancelled) {
					funnelErr =
						e && typeof e === 'object' && 'message' in e ?
							String(e.message)
						:	'Could not load marketing settings.';
				}
			} finally {
				if (!cancelled) funnelLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function saveMarketingFunnel() {
		funnelErr = '';
		funnelOk = '';
		const cid = effectiveClubId;
		if (!cid) {
			funnelErr = 'Club context is missing.';
			return;
		}
		if (isSuperAdmin && !adminClubInput.trim()) {
			funnelErr = 'Enter the target club ID.';
			return;
		}
		const slug = slugifyInput(publicSlug);
		if (slug && (slug.length < 2 || slug.length > 80)) {
			funnelErr = 'Public slug must be 2–80 characters (lowercase letters, numbers, hyphens).';
			return;
		}
		if (slug) {
			const q = query(
				collection(db, 'clubs'),
				where('marketing.publicSlug', '==', slug),
				limit(2),
			);
			const snap = await getDocs(q);
			const others = snap.docs.filter((d) => d.id !== cid);
			if (others.length > 0) {
				funnelErr = 'That public slug is already taken by another club.';
				return;
			}
		}
		funnelSaveBusy = true;
		try {
			await updateDoc(doc(db, 'clubs', cid), {
				marketing: {
					publicSlug: slug,
					metaPixelId: metaPixelId.trim().slice(0, 64),
					googleAnalyticsId: googleAnalyticsId.trim().slice(0, 64),
					activeCampaigns: activeCampaigns.slice(0, 50),
				},
			});
			funnelOk = 'Marketing settings saved.';
		} catch (e) {
			funnelErr =
				e && typeof e === 'object' && 'message' in e ?
					String(e.message)
				:	'Save failed.';
		} finally {
			funnelSaveBusy = false;
		}
	}

	async function copyText(text) {
		try {
			await navigator.clipboard.writeText(text);
			funnelOk = 'Copied.';
		} catch {
			funnelErr = 'Could not copy to clipboard.';
		}
	}

	function utmMediumForSource(src) {
		return src === 'email' ? 'email' : 'social';
	}

	function buildUtmUrl() {
		const base = storefrontBaseUrl();
		const camp = utmCampaignName.trim();
		if (!base || !camp) {
			generatedUtmUrl = '';
			return;
		}
		const u = new URL(base);
		u.searchParams.set('utm_campaign', camp);
		u.searchParams.set('utm_source', utmSource);
		u.searchParams.set('utm_medium', utmMediumForSource(utmSource));
		generatedUtmUrl = u.toString();
	}

	function registerGeneratedCampaign() {
		const camp = utmCampaignName.trim();
		if (!camp) return;
		const next = [camp, ...activeCampaigns.filter((c) => c !== camp)].slice(0, 50);
		activeCampaigns = next;
	}

	$effect(() => {
		utmCampaignName;
		utmSource;
		publicSlug;
		browser;
		buildUtmUrl();
	});

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
							String(e.message)
						:	'Could not load campaigns.';
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
			const payload: Record<string, unknown> = {
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
					String(e.message)
				:	'Publish failed.';
		} finally {
			publishBusy = false;
		}
	}
</script>

<div class="mkt-tab">
	{#if isSuperAdmin}
		<section class="mkt-panel">
			<label class="mkt-label" for="mkt-admin-club">Target club ID</label>
			<input
				id="mkt-admin-club"
				class="mkt-input"
				type="text"
				bind:value={adminClubInput}
				placeholder="Club document id"
				autocomplete="off"
			/>
		</section>
	{/if}

	<section class="mkt-panel">
		<h2 class="mkt-h2">Public storefront</h2>
		<p class="mkt-lead">
			Claim a short URL for your public club landing page. Share it in ads and social posts.
		</p>
		{#if funnelLoading}
			<p class="mkt-muted">Loading…</p>
		{:else if !effectiveClubId}
			<p class="mkt-muted">Club context required.</p>
		{:else}
			<label class="mkt-label" for="mkt-slug">Public slug</label>
			<input
				id="mkt-slug"
				class="mkt-input"
				type="text"
				value={publicSlug}
				oninput={(e) => (publicSlug = slugifyInput(e.currentTarget.value))}
				placeholder="e.g. aggies-fc"
				autocomplete="off"
			/>
			{#if storefrontBaseUrl()}
				<div class="mkt-copy-row">
					<code class="mkt-code">{storefrontBaseUrl()}</code>
					<button
						type="button"
						class="mkt-btn mkt-btn--primary"
						onclick={() => void copyText(storefrontBaseUrl())}
					>
						Copy link
					</button>
				</div>
			{:else}
				<p class="mkt-muted">Enter a slug and save to enable your public link.</p>
			{/if}
		{/if}
	</section>

	<section class="mkt-panel">
		<h2 class="mkt-h2">Conversion tracking (pixels)</h2>
		<p class="mkt-lead">
			Add your Meta Pixel and Google Analytics measurement ID so you can retarget visitors who land on
			your public club page in Facebook / Instagram Ads and measure traffic in GA4.
		</p>
		{#if effectiveClubId && !funnelLoading}
			<label class="mkt-label" for="mkt-pixel">Meta Pixel ID</label>
			<input
				id="mkt-pixel"
				class="mkt-input"
				type="text"
				bind:value={metaPixelId}
				placeholder="Numeric ID from Meta Events Manager"
				autocomplete="off"
			/>
			<label class="mkt-label" for="mkt-ga">Google Analytics ID (GA4)</label>
			<input
				id="mkt-ga"
				class="mkt-input"
				type="text"
				bind:value={googleAnalyticsId}
				placeholder="e.g. G-XXXXXXXXXX"
				autocomplete="off"
			/>
		{/if}
	</section>

	<section class="mkt-panel">
		<h2 class="mkt-h2">Campaign link builder</h2>
		<p class="mkt-lead">
			Build UTM-tagged links for Ads Manager. Copy the URL or share via email or social.
		</p>
		{#if effectiveClubId && !funnelLoading}
			<label class="mkt-label" for="mkt-utm-camp">Campaign name</label>
			<input
				id="mkt-utm-camp"
				class="mkt-input"
				type="text"
				bind:value={utmCampaignName}
				placeholder='e.g. Spring Tryouts'
				autocomplete="off"
			/>
			<label class="mkt-label" for="mkt-utm-src">Source</label>
			<select id="mkt-utm-src" class="mkt-input mkt-select" bind:value={utmSource}>
				{#each utmSources as s (s.id)}
					<option value={s.id}>{s.label}</option>
				{/each}
			</select>
			{#if generatedUtmUrl}
				<div class="mkt-copy-row">
					<code class="mkt-code mkt-code--break">{generatedUtmUrl}</code>
					<button type="button" class="mkt-btn mkt-btn--primary" onclick={() => void copyText(generatedUtmUrl)}>
						Copy URL
					</button>
				</div>
				<div class="mkt-share-row">
					<a
						class="mkt-btn mkt-btn--ghost"
						href="mailto:?subject={encodeURIComponent(utmCampaignName.trim() || 'Club link')}&body={encodeURIComponent(generatedUtmUrl)}"
					>
						Email
					</a>
					<a
						class="mkt-btn mkt-btn--ghost"
						target="_blank"
						rel="noopener noreferrer"
						href="https://twitter.com/intent/tweet?url={encodeURIComponent(generatedUtmUrl)}"
					>
						Share on X
					</a>
					<a
						class="mkt-btn mkt-btn--ghost"
						target="_blank"
						rel="noopener noreferrer"
						href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(generatedUtmUrl)}"
					>
						Share on Facebook
					</a>
				</div>
				<button type="button" class="mkt-btn mkt-btn--secondary" onclick={registerGeneratedCampaign}>
					Remember campaign name
				</button>
			{:else}
				<p class="mkt-muted">Set a public slug above and enter a campaign name to generate a link.</p>
			{/if}
		{/if}
	</section>

	{#if effectiveClubId && !funnelLoading}
		<div class="mkt-actions">
			<button
				type="button"
				class="mkt-btn mkt-btn--primary mkt-btn--wide"
				disabled={funnelSaveBusy || (!isSuperAdmin && !clubId)}
				onclick={() => void saveMarketingFunnel()}
			>
				{funnelSaveBusy ? 'Saving…' : 'Save marketing settings'}
			</button>
			{#if funnelErr}
				<p class="mkt-err" role="alert">{funnelErr}</p>
			{/if}
			{#if funnelOk}
				<p class="mkt-ok" role="status">{funnelOk}</p>
			{/if}
		</div>
	{/if}

	<div class="mkt-grid">
		<div class="mkt-panel mkt-panel--compose">
			<h2 class="mkt-h2">In-app broadcast</h2>
			<p class="mkt-lead">Send announcements to signed-in members (separate from ad tracking).</p>
			{#if !isSuperAdmin && !clubId}
				<p class="mkt-muted" role="status">Your profile needs a club scope to send campaigns.</p>
			{:else}
				<label class="mkt-label" for="marketing-title">Title</label>
				<input
					id="marketing-title"
					class="mkt-input"
					type="text"
					bind:value={title}
					maxlength="200"
					placeholder="e.g. Spring tryouts — registration open"
				/>

				<label class="mkt-label" for="marketing-body">Message</label>
				<textarea
					id="marketing-body"
					class="mkt-textarea"
					rows="6"
					bind:value={body}
					maxlength="8000"
					placeholder="Announcement details, dates, links (plain text)…"
				></textarea>

				<label class="mkt-label" for="marketing-audience">Target audience</label>
				<select id="marketing-audience" class="mkt-input mkt-select" bind:value={targetAudience}>
					<option value="all">Everyone in the club</option>
					<option value="parents">Parents</option>
					<option value="coaches">Coaches</option>
					<option value="players">Players</option>
				</select>

				<label class="mkt-priority">
					<input type="checkbox" bind:checked={priority} />
					<span>High priority</span>
				</label>

				<button
					type="button"
					class="mkt-btn mkt-btn--primary mkt-btn--wide"
					disabled={publishBusy || (!isSuperAdmin && !clubId)}
					onclick={sendCampaign}
				>
					{publishBusy ? 'Sending…' : 'Send campaign'}
				</button>

				{#if publishError}
					<p class="mkt-err" role="alert">{publishError}</p>
				{/if}
				{#if publishOk}
					<p class="mkt-ok" role="status">{publishOk}</p>
				{/if}
			{/if}
		</div>

		<div class="mkt-panel">
			<h2 class="mkt-h2">Campaign history</h2>
			{#if !effectiveClubId}
				<p class="mkt-muted">
					{#if isSuperAdmin}
						Enter a club ID to load past broadcasts.
					{:else}
						Club context required to view history.
					{/if}
				</p>
			{:else if historyLoading}
				<p class="mkt-muted" aria-busy="true">Loading…</p>
			{:else if historyError}
				<p class="mkt-err" role="alert">{historyError}</p>
			{:else if campaigns.length === 0}
				<p class="mkt-muted">No in-app campaigns yet.</p>
			{:else}
				<ul class="mkt-list">
					{#each campaigns as c (c.id)}
						<li class="mkt-item" class:mkt-item--priority={c.priority === true}>
							<div class="mkt-item-head">
								<span class="mkt-item-title">{String(c.title || '')}</span>
								{#if c.priority === true}
									<span class="mkt-badge">Priority</span>
								{/if}
							</div>
							<p class="mkt-item-meta">
								{formatCreated(c.createdAt)}
								·
								{audienceLabels[String(c.targetAudience || '')] ||
									String(c.targetAudience || '')}
							</p>
							<p class="mkt-item-body">{String(c.body || '')}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>

<style>
	.mkt-tab {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.mkt-panel {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #fafafa;
		padding: 14px 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .mkt-panel {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.mkt-h2 {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.mkt-lead {
		margin: 0 0 12px;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.mkt-label {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.mkt-input,
	.mkt-textarea,
	.mkt-select {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 10px;
		padding: 8px 10px;
		font-size: 13px;
		border-radius: 8px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .mkt-input,
	:global(html.dark) .mkt-textarea,
	:global(html.dark) .mkt-select {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.mkt-textarea {
		resize: vertical;
		min-height: 120px;
		line-height: 1.5;
	}

	.mkt-muted {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.mkt-copy-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px;
		margin-top: 4px;
		margin-bottom: 8px;
	}

	.mkt-code {
		flex: 1 1 200px;
		font-size: 11px;
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		color: var(--text-primary);
		font-family: ui-monospace, monospace;
	}

	.mkt-code--break {
		word-break: break-all;
	}

	:global(html.dark) .mkt-code {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.mkt-btn {
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		color: var(--text-primary);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	:global(html.dark) .mkt-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.mkt-btn--primary {
		background: var(--brand-primary, #f59e0b);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 55%, #0f172a);
		color: #0f172a;
	}

	.mkt-btn--secondary {
		background: #f4f4f5;
	}

	:global(html.dark) .mkt-btn--secondary {
		background: #27272a;
	}

	.mkt-btn--ghost {
		background: transparent;
	}

	.mkt-btn--wide {
		width: 100%;
	}

	.mkt-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.mkt-share-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 8px 0 10px;
	}

	.mkt-actions {
		padding: 0 2px;
	}

	.mkt-err {
		margin: 8px 0 0;
		font-size: 12px;
		font-weight: 600;
		color: #b91c1c;
	}

	.mkt-ok {
		margin: 8px 0 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--success-green, #15803d);
	}

	.mkt-priority {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 600;
		margin: 0 0 10px;
		cursor: pointer;
	}

	.mkt-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
		align-items: start;
	}

	@media (min-width: 900px) {
		.mkt-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.mkt-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.mkt-item {
		padding: 12px;
		border-radius: 10px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
	}

	:global(html.dark) .mkt-item {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.mkt-item--priority {
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 35%, #e5e5e5);
	}

	.mkt-item-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 4px;
	}

	.mkt-item-title {
		font-weight: 600;
		font-size: 13px;
	}

	.mkt-badge {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 2px 8px;
		border-radius: 999px;
		border: 1px solid #e5e5e5;
		color: var(--text-secondary);
	}

	.mkt-item-meta {
		margin: 0 0 6px;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.mkt-item-body {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
