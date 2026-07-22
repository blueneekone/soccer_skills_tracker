<script>
	import { untrack } from 'svelte';
	import { db, functions, storage } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
	import { httpsCallable } from 'firebase/functions';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import {
		applySixtyThirtyTenPalette,
		paletteFromClubBranding,
	} from '$lib/player/dashboard/brandingPalette.js';

	let { clubId = '' } = $props();

	const saveBranding = httpsCallable(functions, 'directorSaveClubBranding');

	const MAX_BYTES = 2 * 1024 * 1024;
	const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

	let primaryHex = $state('#6366f1');
	let accentHex = $state('#10b981');
	/** Local blob preview while selecting (before upload completes) */
	let logoPreview = $state(/** @type {string | null} */ (null));
	/** Persisted URL from Firestore */
	let savedLogoUrl = $state('');
	let loading = $state(false);
	let saving = $state(false);
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let loadErr = $state(/** @type {string | null} */ (null));
	const fileInputId = $derived(clubId ? `club-logo-file-${clubId}` : 'club-logo-file');

	function applyRootBranding() {
		if (typeof document === 'undefined') return;
		applySixtyThirtyTenPalette(paletteFromClubBranding(primaryHex, accentHex));
	}

	$effect(() => {
		primaryHex;
		accentHex;
		applyRootBranding();
	});

	async function loadClubBranding() {
		if (!clubId) {
			loadErr = null;
			loading = false;
			savedLogoUrl = '';
			return;
		}
		loading = true;
		loadErr = null;
		try {
			const snap = await getDoc(doc(db, 'clubs', clubId));
			if (snap.exists()) {
				const d = snap.data();
				const p = typeof d.brandPrimaryHex === 'string' ? d.brandPrimaryHex : '';
				const a = typeof d.brandAccentHex === 'string' ? d.brandAccentHex : '';
				if (/^#[0-9A-Fa-f]{6}$/.test(p)) primaryHex = p;
				if (/^#[0-9A-Fa-f]{6}$/.test(a)) accentHex = a;
				savedLogoUrl =
					typeof d.brandLogoUrl === 'string' ? d.brandLogoUrl.trim() : '';
			} else {
				savedLogoUrl = '';
			}
			applyRootBranding();
		} catch (e) {
			console.error('[ClubIdentityModule]', e);
			loadErr = e instanceof Error ? e.message : 'Could not load club branding.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		clubId;
		loadClubBranding();
	});

	function validateFile(file) {
		if (!ALLOWED_TYPES.includes(file.type)) {
			return 'Use PNG, JPG, or WebP only.';
		}
		if (file.size > MAX_BYTES) {
			return 'File must be 2MB or smaller.';
		}
		return null;
	}

	async function uploadLogoToStorage(file) {
		if (!clubId) return;
		const err = validateFile(file);
		if (err) {
			alert(err);
			return;
		}
		uploading = true;
		uploadProgress = 0;
		try {
			const storageRef = ref(storage, `clubs/${clubId}/branding/logo.png`);
			const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
			await new Promise((resolve, reject) => {
				task.on(
					'state_changed',
					(snap) => {
						const t = snap.totalBytes;
						uploadProgress = t ? Math.round((100 * snap.bytesTransferred) / t) : 0;
					},
					(e) => reject(e),
					() => resolve(undefined)
				);
			});
			const downloadUrl = await getDownloadURL(storageRef);
			await saveBranding({
				clubId,
				brandPrimaryHex: primaryHex,
				brandAccentHex: accentHex,
				logoUrl: downloadUrl
			});
			savedLogoUrl = downloadUrl;
			if (logoPreview) URL.revokeObjectURL(logoPreview);
			logoPreview = null;
			uploadProgress = 100;
			applyRootBranding();
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					'Upload failed.';
			alert(msg);
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}

	function onLogoChange(e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const file = input.files?.[0];
		if (!file) return;
		const err = validateFile(file);
		if (err) {
			alert(err);
			input.value = '';
			return;
		}
		if (logoPreview) URL.revokeObjectURL(logoPreview);
		logoPreview = URL.createObjectURL(file);
		void uploadLogoToStorage(file);
		input.value = '';
	}

	async function onSave() {
		if (!clubId) {
			alert('No club scope on your profile.');
			return;
		}
		saving = true;
		try {
			await saveBranding({
				clubId,
				brandPrimaryHex: primaryHex,
				brandAccentHex: accentHex
			});
			applyRootBranding();
			alert('Branding saved.');
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					'Save failed.';
			alert(msg);
		} finally {
			saving = false;
		}
	}

	const displayLogoSrc = $derived(logoPreview || savedLogoUrl || '');
</script>

<div class="tw-flex tw-flex-col tw-gap-4">
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 dir-ent-label-row">
		<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight cim-title">
			Club identity
		</h3>
		<span class="tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide cim-preview-badge">
			Live preview
		</span>
	</div>
	<p class="tw-m-0 tw-text-sm tw-leading-relaxed cim-muted">
		Colors apply instantly; logo uploads go to Cloud Storage, then save to your club record.
	</p>
	{#if loadErr}
		<p class="tw-m-0 tw-text-sm cim-danger" role="alert">{loadErr}</p>
	{/if}

	<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
		<div class="tw-flex tw-flex-col tw-gap-2">
			<span class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide cim-muted">Club logo</span>
			<label
				for={fileInputId}
				class="tw-flex tw-min-h-[clamp(7rem,18vw,10rem)] tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-dashed tw-transition hover:tw-border-slate-400 cim-logo-drop"
			>
				<input
					id={fileInputId}
					type="file"
					accept="image/png,image/jpeg,image/webp"
					class="tw-sr-only"
					disabled={uploading || !clubId}
					onchange={onLogoChange}
				/>
				{#if displayLogoSrc}
					<img
						src={displayLogoSrc}
						alt="Club logo"
						class="tw-max-h-32 tw-max-w-full tw-object-contain tw-p-2"
					/>
				{:else}
					<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-text-center tw-px-4">
						<ClubLogoMark size="xl" />
						<span class="tw-text-sm tw-font-semibold cim-muted">
							PNG, JPG, or WebP · max 2MB — tap to upload
						</span>
					</div>
				{/if}
			</label>
			{#if uploading}
				<div
					class="tw-h-1.5 tw-rounded-full tw-overflow-hidden cim-progress-track"
					role="progressbar"
					aria-valuenow={uploadProgress}
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<!-- CSS var passes the dynamic width; gradient is in scoped CSS -->
					<div
						class="tw-h-full tw-rounded-full tw-transition-all tw-duration-150 cim-progress-fill"
						style="--progress:{uploadProgress}%;"
					></div>
				</div>
				<p class="tw-m-0 tw-text-xs tw-font-semibold cim-hint">
					Uploading… {uploadProgress}%
				</p>
			{/if}
		</div>

		<div class="tw-flex tw-flex-col tw-gap-3 tw-justify-center">
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="dir-brand-primary"
					class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide cim-muted">Primary</label
				>
				<div class="tw-flex tw-items-center tw-gap-3">
					<input
						id="dir-brand-primary"
						type="color"
						bind:value={primaryHex}
						class="tw-h-12 tw-w-full tw-max-w-[5rem] tw-cursor-pointer tw-rounded-xl tw-border tw-bg-white tw-p-1 cim-color-input"
					/>
					<code class="tw-rounded-lg tw-px-2 tw-py-1 tw-text-sm tw-font-mono cim-code">{primaryHex}</code>
				</div>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="dir-brand-accent"
					class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide cim-muted">Accent</label
				>
				<div class="tw-flex tw-items-center tw-gap-3">
					<input
						id="dir-brand-accent"
						type="color"
						bind:value={accentHex}
						class="tw-h-12 tw-w-full tw-max-w-[5rem] tw-cursor-pointer tw-rounded-xl tw-border tw-bg-white tw-p-1 cim-color-input"
					/>
					<code class="tw-rounded-lg tw-px-2 tw-py-1 tw-text-sm tw-font-mono cim-code">{accentHex}</code>
				</div>
			</div>
			<button
				type="button"
				class="dir-os-btn-primary tw-mt-1"
				onclick={onSave}
				disabled={saving || loading || uploading || !clubId}
			>
				{saving ? 'Saving…' : 'Save branding'}
			</button>
		</div>
	</div>
</div>

<style>
	.cim-title         { color: var(--text-primary); }
	.cim-muted         { color: var(--text-secondary); }
	.cim-hint          { color: var(--muted-slate); }
	.cim-danger        { color: var(--danger-red); }

	.cim-preview-badge {
		background: color-mix(in srgb, var(--brand-primary) 18%, transparent);
		color: var(--muted-slate);
	}

	.cim-logo-drop {
		border-color: color-mix(in srgb, var(--brand-primary) 35%, rgba(15, 23, 42, 0.2));
		background: rgba(255, 255, 255, 0.35);
	}

	.cim-progress-track {
		background: color-mix(in srgb, var(--brand-primary) 12%, rgba(15, 23, 42, 0.08));
	}

	/* Dynamic width via CSS custom property; gradient is static */
	.cim-progress-fill {
		width: var(--progress);
		background: linear-gradient(90deg, var(--brand-primary), var(--brand-accent));
	}

	.cim-color-input { border-color: rgba(15, 23, 42, 0.15); }

	.cim-code {
		background: rgba(15, 23, 42, 0.06);
		color: var(--text-primary);
	}
</style>
