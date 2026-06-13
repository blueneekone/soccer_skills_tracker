<script lang="ts">
	import { isTeenAdBlocked } from '$lib/stores/teenAdGuard.svelte.js';
	import { isAllowlistedEmbedUrl, parseLiveStreamUrl } from './liveStreamEmbed.js';

	let {
		url = '',
		title = 'Live stream',
	}: {
		url?: string;
		title?: string;
	} = $props();

	const parsed = $derived(parseLiveStreamUrl(url));
	const teenBlocked = $derived(isTeenAdBlocked.current);
	const safeEmbed = $derived(
		parsed && isAllowlistedEmbedUrl(parsed.embedUrl) ? parsed.embedUrl : null,
	);
</script>

{#if !parsed}
	<p class="live-stream-embed__err" role="status">Stream link unavailable.</p>
{:else if teenBlocked}
	<div class="live-stream-embed__teen" role="region" aria-label="{title} — guardian required">
		<p class="live-stream-embed__teen-msg">
			Live video embeds are disabled for teen accounts. Ask a parent or guardian to watch from their
			account, or open the stream in a new tab with a guardian present.
		</p>
		<a
			class="live-stream-embed__external"
			href={parsed.originalUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			Open stream (external)
		</a>
	</div>
{:else if safeEmbed}
	<div class="live-stream-embed" role="region" aria-label={title}>
		<iframe
			class="live-stream-embed__frame"
			src={safeEmbed}
			title={title}
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
			loading="lazy"
			referrerpolicy="strict-origin-when-cross-origin"
		></iframe>
	</div>
{/if}

<style>
	.live-stream-embed {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #0f172a;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid rgba(51, 65, 85, 0.5);
	}

	.live-stream-embed__frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.live-stream-embed__teen {
		padding: 1rem;
		border-radius: 10px;
		border: 1px solid rgba(251, 191, 36, 0.35);
		background: rgba(251, 191, 36, 0.08);
	}

	.live-stream-embed__teen-msg {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: #fde68a;
		line-height: 1.45;
	}

	.live-stream-embed__external {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #fbbf24;
		text-decoration: underline;
	}

	.live-stream-embed__err {
		margin: 0;
		font-size: 0.8125rem;
		color: #94a3b8;
	}
</style>
