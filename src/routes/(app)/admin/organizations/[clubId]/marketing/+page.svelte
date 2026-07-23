<script lang="ts">
	import { getContext } from 'svelte';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from '../adminClubCtx.js';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);

	let loading = $state(true);
	let saving = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	let metaPixelId = $state('');
	let googleAnalyticsId = $state('');

	// UTM Campaign Builder
	let utmSource = $state('facebook');
	let utmCampaign = $state('spring_tryouts');
	
	const publicSlug = $derived((ctx.clubDoc?.marketing as Record<string, any>)?.publicSlug || '');
	const baseUrl = $derived(
		publicSlug ? `https://sstracker.com/club/${publicSlug}` : 'https://sstracker.com/club/unconfigured'
	);
	
	const generatedUrl = $derived.by(() => {
		try {
			const u = new URL(baseUrl);
			if (utmSource) u.searchParams.set('utm_source', utmSource);
			if (utmCampaign) u.searchParams.set('utm_campaign', utmCampaign);
			return u.toString();
		} catch (e) {
			return baseUrl;
		}
	});

	$effect(() => {
		const clubId = ctx.clubId;
		if (!clubId) return;

		let cancelled = false;
		loading = true;

		getDoc(doc(db, 'marketing_configs', clubId))
			.then((snap) => {
				if (cancelled) return;
				if (snap.exists()) {
					const d = snap.data();
					metaPixelId = typeof d.metaPixelId === 'string' ? d.metaPixelId : '';
					googleAnalyticsId = typeof d.googleAnalyticsId === 'string' ? d.googleAnalyticsId : '';
				}
			})
			.catch((err) => {
				if (!cancelled) errorMsg = 'Failed to load tracking configs.';
				console.error(err);
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	async function saveConfigs() {
		const clubId = ctx.clubId;
		if (!clubId) return;

		saving = true;
		errorMsg = '';
		successMsg = '';
		try {
			await setDoc(doc(db, 'marketing_configs', clubId), {
				metaPixelId: metaPixelId.trim(),
				googleAnalyticsId: googleAnalyticsId.trim(),
				updatedAt: new Date().toISOString()
			}, { merge: true });
			successMsg = 'Tracking scripts successfully injected.';
			setTimeout(() => (successMsg = ''), 3000);
		} catch (err) {
			errorMsg = 'Failed to save configurations.';
			console.error(err);
		} finally {
			saving = false;
		}
	}

	function shareToMeta() {
		const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedUrl)}`;
		window.open(u, '_blank');
	}

	function shareToX() {
		const text = encodeURIComponent("Register for our upcoming tryouts!");
		const u = `https://twitter.com/intent/tweet?url=${encodeURIComponent(generatedUrl)}&text=${text}`;
		window.open(u, '_blank');
	}

    async function copyUrl() {
        try {
            await navigator.clipboard.writeText(generatedUrl);
            successMsg = 'Link copied to clipboard.';
            setTimeout(() => (successMsg = ''), 3000);
        } catch (e) {
            errorMsg = 'Failed to copy to clipboard.';
        }
    }
</script>

<div class="marketing-hub">
	<header class="mh-header">
		<h2>Marketing Hub & Conversion Engine</h2>
		<p>Inject secure tracking pixels and generate campaign links.</p>
	</header>

	{#if ctx.clubErr}
		<div class="mh-alert mh-alert--error">{ctx.clubErr}</div>
	{:else if loading || ctx.clubLoading}
		<div class="mh-loading">Loading configurations...</div>
	{:else}
		<div class="mh-grid">
			<!-- Secure Pixel Injection -->
			<section class="mh-card z2-data-card">
				<div class="mh-card-header">
					<h3>Secure Pixel Injection</h3>
					<p>Attach third-party analytics to your public storefront. Data collection respects age-gating.</p>
				</div>
				<div class="mh-form-group">
					<label for="meta-pixel">Meta Pixel ID</label>
					<input
						id="meta-pixel"
						type="text"
						class="mh-input geist-mono"
						placeholder="e.g. 123456789012345"
						bind:value={metaPixelId}
					/>
				</div>
				<div class="mh-form-group">
					<label for="ga-id">Google Analytics Measurement ID</label>
					<input
						id="ga-id"
						type="text"
						class="mh-input geist-mono"
						placeholder="e.g. G-ABC123XYZ"
						bind:value={googleAnalyticsId}
					/>
				</div>
				<button class="mh-btn mh-btn--primary" onclick={saveConfigs} disabled={saving}>
					{saving ? 'Injecting Scripts...' : 'Save & Inject Configuration'}
				</button>

				{#if errorMsg}
					<p class="mh-msg mh-msg--error">{errorMsg}</p>
				{/if}
				{#if successMsg}
					<p class="mh-msg mh-msg--success">{successMsg}</p>
				{/if}
			</section>

			<!-- Campaign Link Builder -->
			<section class="mh-card z2-data-card">
				<div class="mh-card-header">
					<h3>Campaign Link Builder</h3>
					<p>Generate shareable tracking URLs for your campaigns.</p>
				</div>
				
				{#if !publicSlug}
					<div class="mh-alert mh-alert--warning">
						Your club does not have a public storefront slug configured yet.
					</div>
				{:else}
					<div class="mh-form-group">
						<label for="utm-source">Traffic Source (utm_source)</label>
						<select id="utm-source" class="mh-input" bind:value={utmSource}>
							<option value="facebook">Facebook</option>
							<option value="instagram">Instagram</option>
							<option value="twitter">X (Twitter)</option>
							<option value="email">Email Blast</option>
							<option value="direct">Direct</option>
						</select>
					</div>
					<div class="mh-form-group">
						<label for="utm-campaign">Campaign Name (utm_campaign)</label>
						<input
							id="utm-campaign"
							type="text"
							class="mh-input"
							placeholder="e.g. spring_tryouts"
							bind:value={utmCampaign}
						/>
					</div>

					<div class="mh-terminal">
						<div class="mh-terminal-header">Generated URL</div>
						<div class="mh-terminal-body geist-mono">{generatedUrl}</div>
                        <button class="mh-terminal-copy" onclick={copyUrl}>Copy</button>
					</div>

					<div class="mh-share-row">
						<button class="mh-btn mh-btn--social" onclick={shareToMeta}>Share to Meta</button>
						<button class="mh-btn mh-btn--social" onclick={shareToX}>Share to X</button>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	.marketing-hub {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		color: #e2e8f0;
	}

	.mh-header h2 {
		margin: 0 0 8px;
		font-size: 24px;
		color: #f8fafc;
	}

	.mh-header p {
		margin: 0;
		color: #94a3b8;
		font-size: 14px;
	}

	.mh-loading {
		padding: 40px;
		text-align: center;
		color: #64748b;
		font-family: 'Geist Mono', monospace;
	}

	.mh-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 24px;
	}

	/* Phase 4: Z2 Data Card Aesthetic */
	.z2-data-card {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.mh-card-header h3 {
		margin: 0 0 4px;
		font-size: 16px;
		color: #f1f5f9;
	}

	.mh-card-header p {
		margin: 0;
		font-size: 13px;
		color: #94a3b8;
		line-height: 1.4;
	}

	.mh-form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mh-form-group label {
		font-size: 12px;
		font-weight: 600;
		color: #cbd5e1;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mh-input {
		background: #1e293b;
		border: 1px solid #475569;
		border-radius: 6px;
		padding: 10px 12px;
		color: #f8fafc;
		font-size: 14px;
		transition: border-color 0.15s ease;
	}

	.mh-input:focus {
		outline: none;
		border-color: #14b8a6;
	}

	.geist-mono {
		font-family: 'Geist Mono', monospace;
	}

	.mh-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.2s ease;
	}

	.mh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.mh-btn--primary {
		background: #fbbf24;
		color: #000;
		margin-top: 8px;
	}

	.mh-btn--primary:hover:not(:disabled) {
		background: #f59e0b;
	}

	.mh-btn--social {
		background: #1e293b;
		color: #f8fafc;
		border: 1px solid #475569;
		flex: 1;
	}

	.mh-btn--social:hover {
		background: #334155;
	}

	.mh-share-row {
		display: flex;
		gap: 12px;
		margin-top: 8px;
	}

	.mh-terminal {
		background: #020617;
		border: 1px solid #1e293b;
		border-radius: 6px;
		overflow: hidden;
        position: relative;
	}

	.mh-terminal-header {
		background: #0f172a;
		border-bottom: 1px solid #1e293b;
		padding: 6px 12px;
		font-size: 11px;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mh-terminal-body {
		padding: 12px;
		font-size: 13px;
		color: #34d399;
		word-break: break-all;
	}

    .mh-terminal-copy {
        position: absolute;
        top: 4px;
        right: 8px;
        background: transparent;
        border: 1px solid #334155;
        color: #94a3b8;
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .mh-terminal-copy:hover {
        background: #1e293b;
        color: #f1f5f9;
    }

	.mh-msg {
		margin: 8px 0 0;
		font-size: 13px;
	}

	.mh-msg--error {
		color: #ef4444;
	}

	.mh-msg--success {
		color: #10b981;
	}

	.mh-alert {
		padding: 16px;
		border-radius: 8px;
		font-size: 14px;
	}

	.mh-alert--warning {
		background: rgba(245, 158, 11, 0.1);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.mh-alert--error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}
</style>
