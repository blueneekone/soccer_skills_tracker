<script lang="ts">
	import { browser } from '$app/environment';
	import { storage, functions } from '$lib/firebase.js';
	import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const MAX_BYTES = 50 * 1024 * 1024;
	const MAX_DURATION_SEC = 30;

	const submitVideoTrial = httpsCallable(functions, 'submitVideoTrial');

	let fileInput = $state(/** @type {HTMLInputElement | null} */ (null));
	let busy = $state(false);
	let progress = $state(0);
	let errorMsg = $state('');
	let successMsg = $state('');

	const profile = $derived(authStore.userProfile);
	const uid = $derived(authStore.user?.uid || '');
	const clubId = $derived(
		typeof profile?.clubId === 'string' ? profile.clubId.trim() : '',
	);

	/**
	 * @param {File} file
	 * @returns {Promise<number>}
	 */
	function getVideoDurationSec(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const v = document.createElement('video');
			v.preload = 'metadata';
			v.muted = true;
			v.playsInline = true;
			v.src = url;
			v.onloadedmetadata = () => {
				URL.revokeObjectURL(url);
				const d = v.duration;
				resolve(Number.isFinite(d) ? d : 0);
			};
			v.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Could not read video metadata.'));
			};
		});
	}

	/**
	 * @param {Event} e
	 */
	async function onFile(e) {
		const t = /** @type {HTMLInputElement} */ (e.target);
		const file = t.files && t.files[0];
		errorMsg = '';
		successMsg = '';
		if (!file || !browser) return;
		if (!uid || !clubId) {
			errorMsg = 'Club and team must be set on your profile.';
			return;
		}
		if (!file.type.startsWith('video/')) {
			errorMsg = 'Please choose a video file.';
			return;
		}
		if (file.size > MAX_BYTES) {
			errorMsg = 'Video must be under 50 MB.';
			return;
		}
		let duration = 0;
		try {
			duration = await getVideoDurationSec(file);
		} catch (err) {
			console.error(err);
			errorMsg = 'Could not read video duration.';
			return;
		}
		if (duration <= 0 || duration > MAX_DURATION_SEC + 0.25) {
			errorMsg = `Clip must be ${MAX_DURATION_SEC} seconds or shorter (got ${duration.toFixed(1)}s).`;
			return;
		}

		const scoreId = crypto.randomUUID();
		const path = `clubs/${clubId}/trials/${uid}/${scoreId}_video.mp4`;
		const storageRef = ref(storage, path);

		busy = true;
		progress = 0;
		try {
			const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
			await new Promise((resolve, reject) => {
				task.on(
					'state_changed',
					(snap) => {
						const tBytes = snap.totalBytes;
						progress =
							tBytes > 0 ? Math.round((100 * snap.bytesTransferred) / tBytes) : 0;
					},
					reject,
					resolve,
				);
			});
			const videoUrl = await getDownloadURL(storageRef);
			await submitVideoTrial({
				scoreId,
				videoUrl,
				skill: '',
			});
			successMsg = 'Submitted for coach verification. You will get a push when it is reviewed.';
			progress = 100;
			if (fileInput) fileInput.value = '';
		} catch (err) {
			console.error(err);
			errorMsg =
				typeof err === 'object' && err && 'message' in err ?
					String(/** @type {{ message?: string }} */ (err).message) :
					'Upload failed.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="vtu glass-panel">
	<div class="vtu-head">
		<h2 class="vtu-title">Verified video trial</h2>
		<p class="vtu-sub">
			Upload a single clip (≤30s, &lt;50 MB). Your coach reviews it before it can appear on scouting
			profiles.
		</p>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept="video/*"
		class="vtu-input"
		disabled={busy || !clubId}
		onchange={onFile}
		aria-label="Choose video file"
	/>

	{#if busy}
		<div class="vtu-progress-wrap" aria-live="polite">
			<div class="vtu-progress-track">
				<div class="vtu-progress-fill" style:width="{progress}%"></div>
			</div>
			<span class="vtu-progress-label">{progress}%</span>
		</div>
	{/if}

	{#if errorMsg}
		<p class="vtu-error" role="alert">{errorMsg}</p>
	{/if}
	{#if successMsg}
		<p class="vtu-success">{successMsg}</p>
	{/if}
</div>

<style>
	.vtu {
		padding: clamp(16px, 3vw, 22px);
		border-radius: var(--radius-premium, 20px);
		border: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(15, 23, 42, 0.45);
	}

	.vtu-head {
		margin-bottom: 14px;
	}

	.vtu-title {
		margin: 0 0 6px;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.vtu-sub {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.45;
		color: var(--text-secondary, #94a3b8);
	}

	.vtu-input {
		width: 100%;
		padding: 10px;
		border-radius: 12px;
		border: 1px dashed color-mix(in srgb, var(--brand-primary, #f59e0b) 55%, transparent);
		background: rgba(15, 23, 42, 0.5);
		color: inherit;
		cursor: pointer;
	}

	.vtu-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.vtu-progress-wrap {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 14px;
	}

	.vtu-progress-track {
		flex: 1;
		height: 10px;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.2);
		overflow: hidden;
	}

	.vtu-progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--brand-primary, #f59e0b) 85%, #fff),
			var(--brand-primary, #f59e0b)
		);
		transition: width 0.2s ease;
	}

	.vtu-progress-label {
		font-size: 0.85rem;
		font-weight: 800;
		min-width: 2.5rem;
		color: var(--brand-primary, #f59e0b);
	}

	.vtu-error {
		margin: 12px 0 0;
		color: #fca5a5;
		font-size: 0.88rem;
	}

	.vtu-success {
		margin: 12px 0 0;
		color: #86efac;
		font-size: 0.88rem;
	}
</style>
