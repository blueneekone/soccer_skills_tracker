<script>
	import { db, functions } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	let { clubId = '' } = $props();

	const saveBranding = httpsCallable(functions, 'directorSaveClubBranding');

	let primaryHex = $state('#6366f1');
	let accentHex = $state('#10b981');
	let logoPreview = $state(/** @type {string | null} */ (null));
	let loading = $state(false);
	let saving = $state(false);
	let loadErr = $state(/** @type {string | null} */ (null));

	function applyRootBranding() {
		if (typeof document === 'undefined') return;
		document.documentElement.style.setProperty('--brand-primary', primaryHex);
		document.documentElement.style.setProperty('--brand-accent', accentHex);
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

	function onLogoChange(e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const file = input.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		if (logoPreview) URL.revokeObjectURL(logoPreview);
		logoPreview = URL.createObjectURL(file);
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
</script>

<div class="tw-flex tw-flex-col tw-gap-4">
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 dir-ent-label-row">
		<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight" style="color: var(--text-primary);">
			Club identity
		</h3>
		<span
			class="tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide"
			style="background: color-mix(in srgb, var(--brand-primary) 18%, transparent); color: var(--muted-slate);"
		>
			Live preview
		</span>
	</div>
	<p class="tw-m-0 tw-text-sm tw-leading-relaxed" style="color: var(--text-secondary);">
		Colors apply to this session instantly; Save publishes them to your club record.
	</p>
	{#if loadErr}
		<p class="tw-m-0 tw-text-sm" style="color: var(--danger-red);" role="alert">{loadErr}</p>
	{/if}

	<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
		<label class="tw-flex tw-flex-col tw-gap-2 tw-cursor-pointer">
			<span class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide" style="color: var(--text-secondary);"
				>Club logo</span
			>
			<input
				type="file"
				accept="image/png,image/jpeg,image/webp,image/svg+xml"
				class="tw-sr-only"
				onchange={onLogoChange}
			/>
			<div
				class="tw-flex tw-min-h-[clamp(7rem,18vw,10rem)] tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-dashed tw-transition hover:tw-border-slate-400"
				style="border-color: color-mix(in srgb, var(--brand-primary) 35%, rgba(15,23,42,0.2)); background: rgba(255,255,255,0.35);"
			>
				{#if logoPreview}
					<img
						src={logoPreview}
						alt="Club logo preview"
						class="tw-max-h-32 tw-max-w-full tw-object-contain tw-p-2"
					/>
				{:else}
					<div class="tw-text-center tw-px-4">
						<span class="tw-block tw-text-2xl tw-mb-1" aria-hidden="true">📷</span>
						<span class="tw-text-sm tw-font-semibold" style="color: var(--text-secondary);"
							>Upload mark (PNG / JPG / WebP / SVG)</span
						>
					</div>
				{/if}
			</div>
		</label>

		<div class="tw-flex tw-flex-col tw-gap-3 tw-justify-center">
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="dir-brand-primary"
					class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide"
					style="color: var(--text-secondary);">Primary</label
				>
				<div class="tw-flex tw-items-center tw-gap-3">
					<input
						id="dir-brand-primary"
						type="color"
						bind:value={primaryHex}
						class="tw-h-12 tw-w-full tw-max-w-[5rem] tw-cursor-pointer tw-rounded-xl tw-border tw-bg-white tw-p-1"
						style="border-color: rgba(15, 23, 42, 0.15);"
					/>
					<code
						class="tw-rounded-lg tw-px-2 tw-py-1 tw-text-sm tw-font-mono"
						style="background: rgba(15,23,42,0.06); color: var(--text-primary);">{primaryHex}</code
					>
				</div>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="dir-brand-accent"
					class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide"
					style="color: var(--text-secondary);">Accent</label
				>
				<div class="tw-flex tw-items-center tw-gap-3">
					<input
						id="dir-brand-accent"
						type="color"
						bind:value={accentHex}
						class="tw-h-12 tw-w-full tw-max-w-[5rem] tw-cursor-pointer tw-rounded-xl tw-border tw-bg-white tw-p-1"
						style="border-color: rgba(15, 23, 42, 0.15);"
					/>
					<code
						class="tw-rounded-lg tw-px-2 tw-py-1 tw-text-sm tw-font-mono"
						style="background: rgba(15,23,42,0.06); color: var(--text-primary);">{accentHex}</code
					>
				</div>
			</div>
			<button
				type="button"
				class="dir-os-btn-primary tw-mt-1"
				onclick={onSave}
				disabled={saving || loading || !clubId}
			>
				{saving ? 'Saving…' : 'Save branding'}
			</button>
		</div>
	</div>
</div>
