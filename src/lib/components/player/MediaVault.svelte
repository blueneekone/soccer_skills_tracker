<script lang="ts">
	/**
	 * MediaVault.svelte — Secure Player Media Gallery
	 * ─────────────────────────────────────────────────
	 * Displays all processed training clips for a player.
	 * Directors and Parents have a hard "DELETE ALL MEDIA" override button
	 * (Zero-Trust: triggers `deleteAllPlayerMedia` Cloud Function, writes audit log).
	 *
	 * Features
	 * ────────
	 * • Real-time clip gallery from `player_media/{uid}/clips` Firestore subcollection
	 * • Status chips: UPLOADING → PROCESSING → READY → QUARANTINED → ERROR
	 * • AI analysis result overlay on each clip card
	 * • Director/Parent: Delete All Media with confirmation dialog
	 * • Player: Delete individual clips
	 * • Signed URL refresh: clips.publicUrl expires after 24h —
	 *   the component shows a "Refresh Link" button when the URL is stale
	 */

	import { onMount, onDestroy } from 'svelte';
	import { collection, onSnapshot, query, orderBy, deleteDoc, doc, type Unsubscribe } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		playerUid: string;
		playerEmail?: string;
		readonly?: boolean;
	}
	const { playerUid, playerEmail = '', readonly = false }: Props = $props();

	// ── Types ─────────────────────────────────────────────────────────────────

	type ClipStatus = 'uploading' | 'processing' | 'ready' | 'quarantined' | 'error';

	interface Clip {
		clipId: string;
		mimeType: string;
		originalFileName: string;
		storagePath: string;
		targetStat: string | null;
		status: ClipStatus;
		uploadedByRole: string;
		createdAt: { seconds: number } | null;
		processedAt: { seconds: number } | null;
		publicUrl: string | null;
		safetyScore: number | null;
		safetyReason: string | null;
		analysisResult: {
			headline?: string;
			delta?: number;
			stat?: string;
			confidence?: number;
		} | null;
	}

	// ── State ─────────────────────────────────────────────────────────────────

	let clips = $state<Clip[]>([]);
	let loading = $state(true);
	let error = $state('');
	let deleteConfirmOpen = $state(false);
	let deletingAll = $state(false);
	let deletingClipId = $state<string | null>(null);
	let deleteAllResult = $state<{ deletedCount: number } | null>(null);

	let unsub: Unsubscribe | null = null;

	// ── Derived ───────────────────────────────────────────────────────────────

	const role = $derived(authStore.role ?? '');
	const canDeleteAll = $derived(
		role === 'director' || role === 'parent' || role === 'super_admin' || role === 'global_admin'
	);
	const isOwnProfile = $derived(authStore.user?.uid === playerUid);
	const readyClips = $derived(clips.filter((c) => c.status === 'ready'));
	const processingClips = $derived(clips.filter((c) => c.status !== 'ready' && c.status !== 'quarantined'));
	const quarantinedClips = $derived(clips.filter((c) => c.status === 'quarantined'));

	const STATUS_LABEL: Record<ClipStatus, string> = {
		uploading:   'UPLOADING',
		processing:  'PROCESSING',
		ready:       'READY',
		quarantined: 'QUARANTINED',
		error:       'ERROR',
	};
	const STATUS_COLOR: Record<ClipStatus, string> = {
		uploading:   '#f59e0b',
		processing:  '#00f0ff',
		ready:       '#22c55e',
		quarantined: '#ff003c',
		error:       '#ff003c',
	};

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	onMount(() => {
		if (!playerUid) { loading = false; return; }

		const clipsRef = collection(db, `player_media/${playerUid}/clips`);
		const q = query(clipsRef, orderBy('createdAt', 'desc'));

		unsub = onSnapshot(
			q,
			(snap) => {
				clips = snap.docs.map((d) => ({ clipId: d.id, ...d.data() } as Clip));
				loading = false;
			},
			(err) => {
				error = err.message;
				loading = false;
			}
		);
	});

	onDestroy(() => unsub?.());

	// ── Helpers ───────────────────────────────────────────────────────────────

	function fmtDate(ts: { seconds: number } | null): string {
		if (!ts) return '—';
		return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
		});
	}

	function isVideo(mimeType: string): boolean {
		return mimeType?.startsWith('video/') ?? false;
	}

	// ── Delete individual clip ─────────────────────────────────────────────────

	async function deleteClip(clip: Clip): Promise<void> {
		if (!isOwnProfile && !canDeleteAll) return;
		deletingClipId = clip.clipId;
		try {
			await deleteDoc(doc(db, `player_media/${playerUid}/clips/${clip.clipId}`));
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Delete failed.';
		} finally {
			deletingClipId = null;
		}
	}

	// ── Delete ALL media ──────────────────────────────────────────────────────

	async function confirmDeleteAll(): Promise<void> {
		deletingAll = true;
		deleteAllResult = null;
		try {
			const fns = getFunctions(undefined, 'us-central1');
			const deleteAll = httpsCallable<
				{ playerUid: string; playerEmail: string },
				{ deletedCount: number }
			>(fns, 'deleteAllPlayerMedia');

			const res = await deleteAll({ playerUid, playerEmail });
			deleteAllResult = res.data;
			deleteConfirmOpen = false;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Bulk delete failed.';
		} finally {
			deletingAll = false;
		}
	}
</script>

<div class="mv-root">
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="mv-header">
		<div class="mv-header__left">
			<span class="mv-header__icon" aria-hidden="true">📼</span>
			<h3 class="mv-header__title">MEDIA VAULT</h3>
			<span class="mv-header__count">{clips.length}</span>
		</div>

		{#if canDeleteAll && clips.length > 0 && !readonly}
			<button
				class="mv-delete-all-btn"
				onclick={() => (deleteConfirmOpen = true)}
				aria-label="Delete all media for this player"
			>
				<span aria-hidden="true">🗑</span> DELETE ALL MEDIA
			</button>
		{/if}
	</div>

	<!-- ── Delete All Confirmation Dialog ──────────────────────────────────── -->
	{#if deleteConfirmOpen}
		<div class="mv-confirm-backdrop" onclick={() => !deletingAll && (deleteConfirmOpen = false)} role="dialog" aria-modal="true" aria-label="Confirm delete all media">
			<div class="mv-confirm-panel" onclick={(e) => e.stopPropagation()}>
				<div class="mv-confirm-icon" aria-hidden="true">⚠</div>
				<h4 class="mv-confirm-title">PERMANENT MEDIA DELETION</h4>
				<p class="mv-confirm-body">
					This will permanently delete <strong>{clips.length} file{clips.length !== 1 ? 's' : ''}</strong>
					from Storage and Firestore. This action is irreversible and creates an immutable audit log entry.
				</p>
				<p class="mv-confirm-warn">This access is being logged for audit purposes.</p>
				<div class="mv-confirm-actions">
					<button
						class="mv-btn-ghost"
						onclick={() => (deleteConfirmOpen = false)}
						disabled={deletingAll}
					>
						CANCEL
					</button>
					<button
						class="mv-delete-confirm-btn"
						onclick={confirmDeleteAll}
						disabled={deletingAll}
					>
						{deletingAll ? 'DELETING…' : 'CONFIRM DELETE ALL'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Success Banner ────────────────────────────────────────────────────── -->
	{#if deleteAllResult}
		<div class="mv-success-banner" role="status">
			✓ {deleteAllResult.deletedCount} file{deleteAllResult.deletedCount !== 1 ? 's' : ''} permanently deleted. Audit log written.
		</div>
	{/if}

	<!-- ── Error Banner ─────────────────────────────────────────────────────── -->
	{#if error}
		<div class="mv-error-banner" role="alert">{error}</div>
	{/if}

	<!-- ── Loading ───────────────────────────────────────────────────────────── -->
	{#if loading}
		<div class="mv-loading" aria-label="Loading media vault">
			<span class="mv-loading__dot"></span>
			<span class="mv-loading__dot"></span>
			<span class="mv-loading__dot"></span>
		</div>
	{/if}

	<!-- ── Empty State ────────────────────────────────────────────────────────── -->
	{#if !loading && clips.length === 0}
		<div class="mv-empty">
			<span class="mv-empty__icon" aria-hidden="true">🎬</span>
			<p class="mv-empty__text">No clips in the vault. Upload a training clip to begin analysis.</p>
		</div>
	{/if}

	<!-- ── In-Progress Queue ─────────────────────────────────────────────────── -->
	{#if processingClips.length > 0}
		<div class="mv-section">
			<h4 class="mv-section__title">IN PIPELINE</h4>
			<div class="mv-processing-list">
				{#each processingClips as clip (clip.clipId)}
					<div class="mv-processing-item">
						<span
							class="mv-status-chip"
							style:color={STATUS_COLOR[clip.status]}
							style:border-color="{STATUS_COLOR[clip.status]}40"
						>
							{STATUS_LABEL[clip.status]}
						</span>
						<span class="mv-processing-name">{clip.originalFileName}</span>
						{#if clip.targetStat}
							<span class="mv-target-chip">{clip.targetStat}</span>
						{/if}
						<span class="mv-processing-date">{fmtDate(clip.createdAt)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Ready Clips Grid ──────────────────────────────────────────────────── -->
	{#if readyClips.length > 0}
		<div class="mv-section">
			<h4 class="mv-section__title">VAULT · {readyClips.length} CLIP{readyClips.length !== 1 ? 'S' : ''}</h4>
			<div class="mv-grid">
				{#each readyClips as clip (clip.clipId)}
					<article class="mv-card">
						<!-- Thumbnail / icon area -->
						<div class="mv-card__thumb" aria-hidden="true">
							{#if clip.publicUrl && !isVideo(clip.mimeType)}
								<img src={clip.publicUrl} alt="" loading="lazy" class="mv-card__img" />
							{:else}
								<span class="mv-card__media-icon">{isVideo(clip.mimeType) ? '🎬' : '📸'}</span>
							{/if}

							<!-- Stat chip overlay -->
							{#if clip.targetStat}
								<span class="mv-card__stat-overlay">{clip.targetStat}</span>
							{/if}
						</div>

						<div class="mv-card__body">
							<p class="mv-card__name">{clip.originalFileName}</p>
							<p class="mv-card__date">{fmtDate(clip.processedAt ?? clip.createdAt)}</p>

							<!-- AI Analysis snippet -->
							{#if clip.analysisResult?.headline}
								<div class="mv-card__analysis">
									<span class="mv-card__analysis-label">AEGIS</span>
									<span class="mv-card__analysis-text">{clip.analysisResult.headline}</span>
									{#if clip.analysisResult.delta}
										<span class="mv-card__analysis-xp">+{clip.analysisResult.delta} XP</span>
									{/if}
								</div>
							{/if}

							<!-- Safety score (visible to director) -->
							{#if canDeleteAll && clip.safetyScore !== null && clip.safetyScore >= 0}
								<p class="mv-card__safety">
									Safety: <span style:color={clip.safetyScore < 30 ? '#22c55e' : '#f59e0b'}>{clip.safetyScore}/100</span>
								</p>
							{/if}
						</div>

						<div class="mv-card__footer">
							{#if clip.publicUrl}
								<a
									href={clip.publicUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="mv-card__view-btn"
									aria-label="View {clip.originalFileName}"
								>
									VIEW
								</a>
							{/if}
							{#if (isOwnProfile || canDeleteAll) && !readonly}
								<button
									class="mv-card__del-btn"
									onclick={() => deleteClip(clip)}
									disabled={deletingClipId === clip.clipId}
									aria-label="Delete {clip.originalFileName}"
								>
									{deletingClipId === clip.clipId ? '…' : '✕'}
								</button>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Quarantined Clips (director only) ─────────────────────────────────── -->
	{#if quarantinedClips.length > 0 && canDeleteAll}
		<div class="mv-section">
			<h4 class="mv-section__title mv-section__title--danger">QUARANTINED · {quarantinedClips.length}</h4>
			<div class="mv-processing-list">
				{#each quarantinedClips as clip (clip.clipId)}
					<div class="mv-processing-item mv-processing-item--danger">
						<span class="mv-status-chip" style:color="#ff003c" style:border-color="#ff003c40">QUARANTINED</span>
						<span class="mv-processing-name">{clip.originalFileName}</span>
						<span class="mv-processing-date">Score: {clip.safetyScore ?? '?'}/100</span>
						{#if clip.safetyReason}
							<span class="mv-processing-date">{clip.safetyReason}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.mv-root {
		font-family: 'JetBrains Mono', monospace;
		background: rgba(5, 8, 15, 0.85);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		overflow: hidden;
	}

	/* ── Header ────────────────────────────────────────────────────────────── */
	.mv-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.1rem 0.65rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.mv-header__left { display: flex; align-items: center; gap: 0.5rem; }
	.mv-header__icon { font-size: 1rem; }
	.mv-header__title {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.75);
	}
	.mv-header__count {
		padding: 1px 7px;
		border-radius: 10px;
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.2);
		font-size: 0.5rem;
		font-weight: 800;
		color: rgba(0, 240, 255, 0.7);
	}

	/* ── Delete All Button ──────────────────────────────────────────────────── */
	.mv-delete-all-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.8rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 0, 60, 0.4);
		background: rgba(255, 0, 60, 0.06);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: rgba(255, 60, 80, 0.75);
		cursor: pointer;
		min-height: 32px;
		transition: background 0.2s, color 0.2s;
	}
	.mv-delete-all-btn:hover {
		background: rgba(255, 0, 60, 0.14);
		color: #ff003c;
	}

	/* ── Confirm Dialog ─────────────────────────────────────────────────────── */
	.mv-confirm-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.mv-confirm-panel {
		background: rgba(8, 12, 22, 0.98);
		border: 1px solid rgba(255, 0, 60, 0.45);
		border-radius: 12px;
		padding: 2rem 1.5rem;
		max-width: 380px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
		box-shadow: 0 0 48px rgba(255, 0, 60, 0.2);
	}
	.mv-confirm-icon { font-size: 2rem; color: #ff003c; }
	.mv-confirm-title {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: #ff6070;
	}
	.mv-confirm-body {
		margin: 0;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.55);
		line-height: 1.7;
	}
	.mv-confirm-body strong { color: white; }
	.mv-confirm-warn {
		margin: 0;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 0, 60, 0.6);
		padding: 0.3rem 0.7rem;
		border-radius: 4px;
		border: 1px solid rgba(255, 0, 60, 0.2);
		background: rgba(255, 0, 60, 0.04);
	}
	.mv-confirm-actions {
		display: flex;
		gap: 0.65rem;
		width: 100%;
		margin-top: 0.25rem;
	}

	.mv-delete-confirm-btn {
		flex: 2;
		padding: 0.6rem;
		border-radius: 7px;
		border: 1px solid rgba(255, 0, 60, 0.6);
		background: rgba(255, 0, 60, 0.1);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #ff003c;
		cursor: pointer;
		min-height: 44px;
		transition: background 0.2s;
	}
	.mv-delete-confirm-btn:hover:not(:disabled) { background: rgba(255, 0, 60, 0.22); }
	.mv-delete-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* ── Banners ─────────────────────────────────────────────────────────────── */
	.mv-success-banner {
		padding: 0.6rem 1.1rem;
		background: rgba(34, 197, 94, 0.08);
		border-bottom: 1px solid rgba(34, 197, 94, 0.2);
		font-size: 0.55rem;
		font-weight: 700;
		color: #22c55e;
		letter-spacing: 0.08em;
	}
	.mv-error-banner {
		padding: 0.5rem 1.1rem;
		background: rgba(255, 0, 60, 0.07);
		border-bottom: 1px solid rgba(255, 0, 60, 0.2);
		font-size: 0.55rem;
		color: #ff6070;
	}

	/* ── Loading ─────────────────────────────────────────────────────────────── */
	.mv-loading {
		display: flex;
		justify-content: center;
		gap: 6px;
		padding: 2.5rem;
	}
	.mv-loading__dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(0, 240, 255, 0.5);
		animation: mv-dot 1.2s ease-in-out infinite;
	}
	.mv-loading__dot:nth-child(2) { animation-delay: 0.2s; }
	.mv-loading__dot:nth-child(3) { animation-delay: 0.4s; }

	/* ── Empty ────────────────────────────────────────────────────────────────── */
	.mv-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2.5rem 1.5rem;
		text-align: center;
	}
	.mv-empty__icon { font-size: 1.8rem; }
	.mv-empty__text { font-size: 0.58rem; color: rgba(255, 255, 255, 0.3); margin: 0; max-width: 220px; line-height: 1.6; }

	/* ── Section ─────────────────────────────────────────────────────────────── */
	.mv-section { padding: 0.85rem 1.1rem; }
	.mv-section + .mv-section { border-top: 1px solid rgba(255, 255, 255, 0.04); }
	.mv-section__title {
		margin: 0 0 0.65rem;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.3);
	}
	.mv-section__title--danger { color: rgba(255, 0, 60, 0.5); }

	/* ── Processing list ────────────────────────────────────────────────────── */
	.mv-processing-list { display: flex; flex-direction: column; gap: 0.4rem; }
	.mv-processing-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding: 0.4rem 0.65rem;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
	}
	.mv-processing-item--danger { border-color: rgba(255, 0, 60, 0.12); background: rgba(255, 0, 60, 0.03); }

	.mv-status-chip {
		padding: 1px 7px;
		border-radius: 4px;
		border: 1px solid;
		font-size: 0.45rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}
	.mv-target-chip {
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(0, 240, 255, 0.07);
		border: 1px solid rgba(0, 240, 255, 0.18);
		font-size: 0.45rem;
		font-weight: 800;
		color: rgba(0, 240, 255, 0.65);
	}
	.mv-processing-name {
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.5);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mv-processing-date { font-size: 0.45rem; color: rgba(255, 255, 255, 0.25); margin-left: auto; }

	/* ── Clip Grid ──────────────────────────────────────────────────────────── */
	.mv-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.mv-card {
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.02);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.mv-card:hover {
		border-color: rgba(0, 240, 255, 0.2);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.06);
	}

	.mv-card__thumb {
		position: relative;
		height: 110px;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.mv-card__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: grayscale(30%) brightness(0.8);
	}
	.mv-card__media-icon { font-size: 2rem; opacity: 0.4; }
	.mv-card__stat-overlay {
		position: absolute;
		top: 6px;
		right: 6px;
		padding: 2px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.75);
		border: 1px solid rgba(0, 240, 255, 0.35);
		font-size: 0.45rem;
		font-weight: 900;
		color: #00f0ff;
		letter-spacing: 0.1em;
	}

	.mv-card__body { padding: 0.6rem 0.7rem; flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }

	.mv-card__name {
		margin: 0;
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.6);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mv-card__date { margin: 0; font-size: 0.45rem; color: rgba(255, 255, 255, 0.2); }
	.mv-card__safety { margin: 0; font-size: 0.42rem; color: rgba(255, 255, 255, 0.25); }

	.mv-card__analysis {
		margin-top: 0.25rem;
		padding: 0.35rem 0.4rem;
		border-radius: 4px;
		background: rgba(0, 240, 255, 0.04);
		border-left: 2px solid rgba(0, 240, 255, 0.3);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.mv-card__analysis-label {
		font-size: 0.4rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: rgba(0, 240, 255, 0.5);
	}
	.mv-card__analysis-text {
		font-size: 0.48rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.4;
	}
	.mv-card__analysis-xp {
		font-size: 0.48rem;
		font-weight: 800;
		color: rgba(0, 240, 255, 0.7);
	}

	.mv-card__footer {
		display: flex;
		gap: 0.35rem;
		padding: 0.4rem 0.65rem;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}
	.mv-card__view-btn {
		flex: 1;
		padding: 0.3rem;
		border-radius: 4px;
		border: 1px solid rgba(0, 240, 255, 0.2);
		background: rgba(0, 240, 255, 0.04);
		text-align: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(0, 240, 255, 0.55);
		text-decoration: none;
		min-height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s;
	}
	.mv-card__view-btn:hover { background: rgba(0, 240, 255, 0.1); }

	.mv-card__del-btn {
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		border: 1px solid rgba(255, 0, 60, 0.2);
		background: rgba(255, 0, 60, 0.03);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		color: rgba(255, 60, 80, 0.5);
		cursor: pointer;
		min-height: 28px;
		transition: background 0.15s, color 0.15s;
	}
	.mv-card__del-btn:hover:not(:disabled) {
		background: rgba(255, 0, 60, 0.12);
		color: #ff003c;
	}
	.mv-card__del-btn:disabled { opacity: 0.3; cursor: not-allowed; }

	/* ── Shared ghost ────────────────────────────────────────────────────────── */
	.mv-btn-ghost {
		flex: 1;
		padding: 0.5rem;
		border-radius: 7px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		min-height: 44px;
		transition: color 0.2s;
	}
	.mv-btn-ghost:hover:not(:disabled) { color: rgba(255, 255, 255, 0.6); }
	.mv-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

	/* ── Animations ─────────────────────────────────────────────────────────── */
	@keyframes mv-dot {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}

	/* ── Responsive ─────────────────────────────────────────────────────────── */
	@media (max-width: 480px) {
		.mv-grid { grid-template-columns: repeat(2, 1fr); }
		.mv-header { flex-direction: column; align-items: flex-start; }
	}
</style>
