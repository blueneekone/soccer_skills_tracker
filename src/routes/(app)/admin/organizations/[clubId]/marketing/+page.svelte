<script lang="ts">
	import { getContext } from 'svelte';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from '../adminClubCtx.js';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

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
			setTimeout(() => (successMsg = ''), 4000);
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

<div class="tw-flex tw-flex-col tw-gap-5 tw-w-full">
	<div class="tw-flex tw-flex-col tw-gap-1">
		<h1 class="tw-m-0 tw-text-xl tw-font-extrabold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2.5">
			<Icon name={"data.target" as IconName} class="tw-text-[#14b8a6]" />
			Marketing Hub & Conversion Engine
		</h1>
		<p class="tw-m-0 tw-text-xs tw-text-[#94a3b8] tw-font-mono">
			Inject secure tracking pixels and generate campaign links for {ctx?.clubDoc?.name || ctx.clubId}
		</p>
	</div>

	{#if ctx.clubErr}
		<div class="tw-p-3.5 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">
			{ctx.clubErr}
		</div>
	{:else if loading || ctx.clubLoading}
		<div class="tw-p-10 tw-text-center tw-text-xs tw-font-mono tw-text-[#94a3b8]">Loading configurations...</div>
	{:else}
		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
			<!-- Secure Pixel Injection -->
			<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col">
				<div class="tw-bg-[#020617] tw-px-5 tw-py-3.5 tw-border-b tw-border-[#334155]">
					<h3 class="tw-m-0 tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-wider">Secure Pixel Injection</h3>
					<p class="tw-m-0 tw-text-[11px] tw-text-[#94a3b8] tw-font-mono tw-mt-0.5">Attach third-party analytics to your public storefront. Data collection respects age-gating.</p>
				</div>
				<div class="tw-p-5 tw-flex tw-flex-col tw-gap-4">
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="meta-pixel" class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase">Meta Pixel ID</label>
						<input
							id="meta-pixel"
							type="text"
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
							placeholder="e.g. 123456789012345"
							bind:value={metaPixelId}
						/>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="ga-id" class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase">Google Analytics Measurement ID</label>
						<input
							id="ga-id"
							type="text"
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
							placeholder="e.g. G-ABC123XYZ"
							bind:value={googleAnalyticsId}
						/>
					</div>

					<button
						class="tw-px-4 tw-py-2 tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] tw-text-[#020617] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors disabled:tw-opacity-50 tw-w-fit tw-mt-2"
						onclick={saveConfigs}
						disabled={saving}
					>
						{saving ? 'Injecting Scripts...' : 'Save & Inject Configuration'}
					</button>

					{#if errorMsg}
						<p class="tw-p-3 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold tw-m-0">{errorMsg}</p>
					{/if}
					{#if successMsg}
						<p class="tw-p-3 tw-bg-[#1E293B] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-m-0">{successMsg}</p>
					{/if}
				</div>
			</section>

			<!-- Campaign Link Builder -->
			<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col">
				<div class="tw-bg-[#020617] tw-px-5 tw-py-3.5 tw-border-b tw-border-[#334155]">
					<h3 class="tw-m-0 tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-wider">Campaign Link Builder</h3>
					<p class="tw-m-0 tw-text-[11px] tw-text-[#94a3b8] tw-font-mono tw-mt-0.5">Generate shareable tracking URLs for your recruitment and tryout campaigns.</p>
				</div>
				
				<div class="tw-p-5 tw-flex tw-flex-col tw-gap-4">
					{#if !publicSlug}
						<div class="tw-p-3.5 tw-bg-[#020617] tw-border tw-border-[#fbbf24]/40 tw-text-[#fbbf24] tw-font-mono tw-text-xs">
							Your club does not have a public storefront slug configured yet.
						</div>
					{:else}
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="utm-source" class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase">Traffic Source (utm_source)</label>
							<select id="utm-source" class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]" bind:value={utmSource}>
								<option value="facebook">Facebook</option>
								<option value="instagram">Instagram</option>
								<option value="twitter">X (Twitter)</option>
								<option value="email">Email Blast</option>
								<option value="direct">Direct</option>
							</select>
						</div>
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="utm-campaign" class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase">Campaign Name (utm_campaign)</label>
							<input
								id="utm-campaign"
								type="text"
								class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-border-[#14b8a6]"
								placeholder="e.g. spring_tryouts"
								bind:value={utmCampaign}
							/>
						</div>

						<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-3 tw-flex tw-flex-col tw-gap-2">
							<div class="tw-flex tw-items-center tw-justify-between">
								<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-text-[#94a3b8]">Generated URL</span>
								<button class="tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40" onclick={copyUrl}>Copy</button>
							</div>
							<div class="tw-text-xs tw-font-mono tw-text-[#14b8a6] tw-break-all">{generatedUrl}</div>
						</div>

						<div class="tw-flex tw-gap-3 tw-mt-2">
							<button class="tw-flex-1 tw-px-3 tw-py-2 tw-bg-[#020617] hover:tw-bg-white/[0.04] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-font-bold tw-transition-colors" onclick={shareToMeta}>Share to Meta</button>
							<button class="tw-flex-1 tw-px-3 tw-py-2 tw-bg-[#020617] hover:tw-bg-white/[0.04] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-font-bold tw-transition-colors" onclick={shareToX}>Share to X</button>
						</div>
					{/if}
				</div>
			</section>
		</div>
	{/if}
</div>
