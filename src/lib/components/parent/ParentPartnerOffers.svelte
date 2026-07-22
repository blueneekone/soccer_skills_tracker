<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		getDocs,
		limit,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const clubId = $derived(
		String(authStore.userProfile?.clubId || authStore.tenantId || '').trim(),
	);
	const channelId = $derived(clubId ? `sponsor-partner-${clubId}` : '');
	const CACHE_TTL_MS = 30_000;

	type OfferRow = {
		id: string;
		subject: string | null;
		text: string;
		partnerName: string | null;
		ctaLabel: string | null;
		ctaUrl: string | null;
		createdAt?: { toDate?: () => Date };
	};

	let offerCache: { email: string; clubId: string; fetchedAt: number; rows: OfferRow[] } | null =
		null;

	function mapOfferRow(id: string, x: Record<string, unknown>): OfferRow {
		return {
			id,
			subject: typeof x.subject === 'string' ? x.subject : null,
			text: String(x.text || x.body || ''),
			partnerName: typeof x.partnerName === 'string' ? x.partnerName : null,
			ctaLabel: typeof x.ctaLabel === 'string' ? x.ctaLabel : null,
			ctaUrl: typeof x.ctaUrl === 'string' ? x.ctaUrl : null,
			createdAt: x.createdAt as OfferRow['createdAt'],
		};
	}

	async function fetchPartnerOffers(
		email: string,
		resolvedClubId: string,
		maxRows: number,
	): Promise<OfferRow[]> {
		if (
			offerCache &&
			offerCache.email === email &&
			offerCache.clubId === resolvedClubId &&
			Date.now() - offerCache.fetchedAt < CACHE_TTL_MS
		) {
			return offerCache.rows.slice(0, maxRows);
		}

		if (!resolvedClubId || !channelId) return [];
		if (!db || !authStore.isAuthenticated) return [];

		const qy = query(
			collection(db, 'clubs', resolvedClubId, 'channels', channelId, 'messages'),
			where('parentEmail', '==', email),
			limit(maxRows),
		);

		const snap = await getDocs(qy);
		const rows = snap.docs
			.map((d) => mapOfferRow(d.id, d.data()))
			.filter((row) => row.text.trim().length > 0);

		rows.sort((a, b) => {
			const at = a.createdAt?.toDate?.()?.getTime() ?? 0;
			const bt = b.createdAt?.toDate?.()?.getTime() ?? 0;
			return bt - at;
		});

		const sorted = rows.slice(0, maxRows);
		offerCache = { email, clubId: resolvedClubId, fetchedAt: Date.now(), rows: sorted };
		return sorted;
	}

	let items = $state<OfferRow[]>([]);
	let loading = $state(true);

	$effect(() => {
		if (!browser || !myEmail || !clubId) {
			items = [];
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;

		void fetchPartnerOffers(myEmail, clubId, 3)
			.then((rows) => {
				if (!cancelled) items = rows;
			})
			.catch((e) => {
				console.error('[ParentPartnerOffers]', e);
				if (!cancelled) items = [];
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function fmtDate(ts?: { toDate?: () => Date }) {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		} catch {
			return '';
		}
	}
</script>

<section class="parent-partner-strip parent-lounge-z2-panel" aria-labelledby="parent-partner-strip-heading">
	<div class="parent-partner-strip__head">
		<p class="parent-lounge-eyebrow">Partner offers</p>
		<h2 id="parent-partner-strip-heading" class="parent-lounge-page-title tw-text-sm">
			Club partner updates
		</h2>
	</div>

	<p class="parent-lounge-meta">
		Shown when you opted in on VPC (sponsor + in-app comms). Never sent to player accounts.
	</p>

	{#if loading}
		<p class="parent-lounge-meta">Loading…</p>
	{:else if items.length === 0}
		<p class="parent-lounge-meta">No partner offers yet.</p>
	{:else}
		<ul class="parent-partner-strip__list">
			{#each items as offer (offer.id)}
				<li class="parent-partner-strip__item">
					{#if offer.partnerName}
						<p class="parent-partner-strip__partner">{offer.partnerName}</p>
					{/if}
					{#if offer.subject}
						<p class="parent-partner-strip__subject">{offer.subject}</p>
					{/if}
					<p class="parent-partner-strip__preview">{offer.text}</p>
					<p class="parent-lounge-meta">{fmtDate(offer.createdAt)}</p>
					{#if offer.ctaUrl && offer.ctaLabel}
						<a
							class="parent-partner-strip__cta"
							href={offer.ctaUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							{offer.ctaLabel}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<a class="parent-partner-strip__link" href="/parent/vpc">Manage sponsor opt-in on VPC →</a>
</section>

<style>
	.parent-partner-strip {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.parent-partner-strip__head {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.parent-partner-strip__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.parent-partner-strip__item {
		padding: 0.65rem 0;
		border-bottom: 1px solid var(--structural-border, #334155);
	}

	.parent-partner-strip__item:last-child {
		border-bottom: none;
	}

	.parent-partner-strip__partner {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--accent-gold, #fbbf24);
	}

	.parent-partner-strip__subject {
		margin: 0.15rem 0 0;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.parent-partner-strip__preview {
		margin: 0.35rem 0 0;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--color-muted, #94a3b8);
	}

	.parent-partner-strip__cta {
		display: inline-block;
		margin-top: 0.35rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--accent-gold, #fbbf24);
		text-decoration: none;
	}

	.parent-partner-strip__cta:hover {
		text-decoration: underline;
	}

	.parent-partner-strip__link {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--accent-gold, #fbbf24);
		text-decoration: none;
	}

	.parent-partner-strip__link:hover {
		text-decoration: underline;
	}
</style>
