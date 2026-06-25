<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const SESSION_DISMISS_KEY = 'parent-comms-consent-banner-dismissed';

	let { childEmails = [] }: { childEmails?: string[] } = $props();

	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const linkedChildren = $derived(
		[...new Set(childEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))],
	);

	let dismissed = $state(false);
	let needsConsent = $state(false);
	let loading = $state(true);

	$effect(() => {
		if (!browser) return;
		dismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === '1';
	});

	$effect(() => {
		if (!browser || !myEmail || linkedChildren.length === 0 || dismissed) {
			needsConsent = false;
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;

		(async () => {
			try {
				const snap = await getDocs(
					query(collection(db, 'consent_records'), where('parentEmail', '==', myEmail)),
				);

				/** @type {Map<string, boolean>} */
				const commsByChild = new Map();
				for (const docSnap of snap.docs) {
					const data = docSnap.data();
					const subject = String(data.subjectEmail || '')
						.trim()
						.toLowerCase();
					if (!subject) continue;
					const items = data.consentItems;
					const granted = items && items.comms === true;
					if (!commsByChild.has(subject) || granted) {
						commsByChild.set(subject, granted);
					}
				}

				const missing = linkedChildren.some((child) => !commsByChild.get(child));
				if (!cancelled) needsConsent = missing;
			} catch (e) {
				console.error('[ParentCommsConsentBanner]', e);
				if (!cancelled) needsConsent = false;
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const visible = $derived(!loading && !dismissed && needsConsent && linkedChildren.length > 0);

	function dismiss() {
		if (!browser) return;
		sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
		dismissed = true;
	}
</script>

{#if visible}
	<aside class="parent-comms-consent-banner parent-lounge-z2-panel" role="status" aria-live="polite">
		<div class="parent-comms-consent-banner__body">
			<p class="parent-lounge-eyebrow">Team communications</p>
			<p class="parent-comms-consent-banner__copy">
				Enable in-app communications to receive team announcements.
			</p>
		</div>
		<div class="parent-comms-consent-banner__actions">
			<a class="parent-comms-consent-banner__cta" href="/parent/vpc">Update VPC consent</a>
			<button type="button" class="parent-comms-consent-banner__dismiss" onclick={dismiss}>
				Dismiss for now
			</button>
		</div>
	</aside>
{/if}

<style>
	.parent-comms-consent-banner {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.85rem 1rem;
		border: 1px solid rgba(251, 191, 36, 0.45);
		background: rgba(15, 23, 42, 0.04);
	}

	.parent-comms-consent-banner__body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.parent-comms-consent-banner__copy {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--text-primary, #0f172a);
	}

	.parent-comms-consent-banner__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}

	.parent-comms-consent-banner__cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.25rem;
		padding: 0.35rem 0.85rem;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
		color: #0f172a;
		background: #fbbf24;
		border: 1px solid #d97706;
	}

	.parent-comms-consent-banner__dismiss {
		min-height: 2.25rem;
		padding: 0.35rem 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #475569;
		background: transparent;
		border: none;
		cursor: pointer;
		text-decoration: underline;
	}

	@media (min-width: 390px) {
		.parent-comms-consent-banner {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}
</style>
