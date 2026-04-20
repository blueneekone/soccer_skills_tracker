<script>
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { storage, db } from '$lib/firebase.js';
	import {
		collection,
		deleteDoc,
		doc,
		onSnapshot,
		serverTimestamp,
		setDoc,
		updateDoc,
	} from 'firebase/firestore';
	import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
	import '$lib/styles/enterprise-console.css';
	import TacticalBuilder from '$lib/components/field-ops/TacticalBuilder.svelte';
	import LogisticsMap from '$lib/components/director/os/LogisticsMap.svelte';

	/**
	 * @typedef {{ id: string; name: string; address?: string; mapStoragePath: string; mapDownloadUrl: string; type: 'image' | 'pdf'; uploadedAt?: import('firebase/firestore').Timestamp; latitude?: number; longitude?: number; routingUrl?: string; tacticalCanvasJson?: string }} FacilityMapRow
	 */

	let { clubId = '', canManage = false } = $props();

	let rows = $state(/** @type {FacilityMapRow[]} */ ([]));
	let mapName = $state('');
	let mapAddress = $state('');
	let uploading = $state(false);
	let uploadErr = $state('');
	let dragOver = $state(false);
	let previewId = $state(/** @type {string | null} */ (null));
	let previewOpen = $state(false);
	let draftAddress = $state('');
	/** @type {number | null} */
	let draftLat = $state(null);
	/** @type {number | null} */
	let draftLng = $state(null);
	let logisticsSaving = $state(false);
	let logisticsSaveErr = $state('');

	const previewRow = $derived.by(() => {
		if (!previewId) return /** @type {FacilityMapRow | null} */ (null);
		return rows.find((r) => r.id === previewId) ?? null;
	});

	const routingDisplayUri = $derived(
		draftLat != null && draftLng != null ?
			`http://googleusercontent.com/maps.google.com/maps?daddr=${draftLat},${draftLng}`
		:	''
	);

	/** @type {HTMLCanvasElement | null} */
	let pdfCanvasEl = $state(null);
	let pdfBusy = $state(false);

	$effect(() => {
		if (!clubId) {
			rows = [];
			return;
		}
		const col = collection(db, 'clubs', clubId, 'facilities');
		const unsub = onSnapshot(
			col,
			(snap) => {
				const list = snap.docs.map((d) => {
					const x = d.data();
					const lat = typeof x.latitude === 'number' ? x.latitude : undefined;
					const lng = typeof x.longitude === 'number' ? x.longitude : undefined;
					const routingUrl =
						typeof x.routingUrl === 'string' && x.routingUrl ? x.routingUrl : undefined;
					const tacticalCanvasJson =
						typeof x.tacticalCanvasJson === 'string' && x.tacticalCanvasJson.trim() ?
							x.tacticalCanvasJson
						:	undefined;
					return {
						id: d.id,
						name: typeof x.name === 'string' ? x.name : d.id,
						address: typeof x.address === 'string' ? x.address : '',
						mapStoragePath: String(x.mapStoragePath || ''),
						mapDownloadUrl: String(x.mapDownloadUrl || ''),
						type: x.type === 'pdf' ? 'pdf' : 'image',
						uploadedAt: x.uploadedAt,
						...(lat !== undefined ? { latitude: lat } : {}),
						...(lng !== undefined ? { longitude: lng } : {}),
						...(routingUrl ? { routingUrl } : {}),
						...(tacticalCanvasJson ? { tacticalCanvasJson } : {}),
					};
				});
				list.sort((a, b) => {
					const ta = a.uploadedAt?.toMillis?.() ?? 0;
					const tb = b.uploadedAt?.toMillis?.() ?? 0;
					return tb - ta;
				});
				rows = list;
			},
			(e) => console.error('[FacilityMapVault]', e)
		);
		return () => unsub();
	});

	function closePreview() {
		previewOpen = false;
		previewId = null;
		pdfBusy = false;
		logisticsSaveErr = '';
		draftAddress = '';
		draftLat = null;
		draftLng = null;
	}

	/**
	 * @param {FacilityMapRow} row
	 */
	function openPreview(row) {
		previewId = row.id;
		previewOpen = true;
		draftAddress = row.address ?? '';
		draftLat = typeof row.latitude === 'number' ? row.latitude : null;
		draftLng = typeof row.longitude === 'number' ? row.longitude : null;
		logisticsSaveErr = '';
	}

	$effect(() => {
		if (!browser || !previewOpen || !previewRow || previewRow.type !== 'pdf') return;
		const url = previewRow.mapDownloadUrl;
		if (!url) return;

		let cancelled = false;
		pdfBusy = true;

		(async () => {
			try {
				await tick();
				if (cancelled || !pdfCanvasEl) return;
				const pdfjs = await import('pdfjs-dist');
				const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
				const workerSrc =
					typeof workerMod.default === 'string' ? workerMod.default : String(workerMod.default);
				pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

				const task = pdfjs.getDocument({ url, withCredentials: false });
				const pdf = await task.promise;
				if (cancelled) return;
				const page = await pdf.getPage(1);
				if (cancelled) return;
				const canvas = pdfCanvasEl;
				if (!canvas) return;
				const ctx = canvas.getContext('2d');
				if (!ctx) return;
				const baseVp = page.getViewport({ scale: 1 });
				const maxW = Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 48 : 720);
				const scale = Math.min(maxW / baseVp.width, 2);
				const vp = page.getViewport({ scale });
				canvas.width = Math.floor(vp.width);
				canvas.height = Math.floor(vp.height);
				const renderTask = page.render({ canvasContext: ctx, viewport: vp });
				await renderTask.promise;
			} catch (e) {
				console.error('[FacilityMapVault] pdf render', e);
			} finally {
				if (!cancelled) pdfBusy = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const MAX_BYTES = 10 * 1024 * 1024;

	/**
	 * @param {File} file
	 */
	function validateFile(file) {
		if (file.size >= MAX_BYTES) return 'File must be under 10 MB.';
		const ok =
			file.type.startsWith('image/') ||
			file.type === 'application/pdf' ||
			/\.pdf$/i.test(file.name);
		if (!ok) return 'Only PDF or image files are allowed.';
		return '';
	}

	/**
	 * @param {File} file
	 */
	async function uploadFile(file) {
		uploadErr = '';
		if (!clubId || !canManage) return;
		const err = validateFile(file);
		if (err) {
			uploadErr = err;
			return;
		}
		const nameTrim = mapName.trim() || file.name.replace(/\.[^.]+$/, '') || 'Facility map';
		const fid =
			typeof crypto !== 'undefined' && crypto.randomUUID ?
				crypto.randomUUID() :
				`m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const ext =
			file.type === 'application/pdf' ?
				'pdf'
			: file.type === 'image/png' ?
				'png'
			: file.type === 'image/jpeg' || file.type === 'image/jpg' ?
				'jpg'
			: file.type === 'image/webp' ?
				'webp'
			: file.type === 'image/gif' ?
				'gif'
			:	'bin';
		const path = `clubs/${clubId}/facility_maps/${fid}.${ext}`;
		const storageRef = ref(storage, path);

		uploading = true;
		try {
			await uploadBytes(storageRef, file, { contentType: file.type || undefined });
			const mapDownloadUrl = await getDownloadURL(storageRef);
			const type = file.type === 'application/pdf' || ext === 'pdf' ? 'pdf' : 'image';
			const addressTrim = mapAddress.trim();
			await setDoc(doc(db, 'clubs', clubId, 'facilities', fid), {
				name: nameTrim.slice(0, 200),
				...(addressTrim ? { address: addressTrim.slice(0, 500) } : {}),
				mapStoragePath: path,
				mapDownloadUrl,
				type,
				uploadedAt: serverTimestamp(),
			});
			mapName = '';
			mapAddress = '';
		} catch (e) {
			uploadErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			uploading = false;
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	function onDrop(e) {
		e.preventDefault();
		dragOver = false;
		const f = e.dataTransfer?.files?.[0];
		if (f) void uploadFile(f);
	}

	/**
	 * @param {FacilityMapRow} row
	 */
	async function removeRow(row) {
		if (!canManage || !clubId) return;
		if (!confirm(`Remove “${row.name}” from the vault?`)) return;
		try {
			await deleteObject(ref(storage, row.mapStoragePath));
		} catch {
			/* file may already be gone */
		}
		try {
			await deleteDoc(doc(db, 'clubs', clubId, 'facilities', row.id));
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		}
		if (previewId === row.id) closePreview();
	}

	async function saveLogistics() {
		logisticsSaveErr = '';
		if (!canManage || !clubId || !previewId) return;
		if (draftLat == null || draftLng == null) {
			alert('Click the map to place a pin for this facility.');
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${draftLat},${draftLng}`;
		logisticsSaving = true;
		try {
			await updateDoc(doc(db, 'clubs', clubId, 'facilities', previewId), {
				address: draftAddress.trim().slice(0, 500),
				latitude: draftLat,
				longitude: draftLng,
				routingUrl,
			});
		} catch (e) {
			logisticsSaveErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			logisticsSaving = false;
		}
	}

	/**
	 * @param {import('firebase/firestore').Timestamp | undefined} t
	 */
	function fmtTime(t) {
		if (!t?.toDate) return '—';
		try {
			return t.toDate().toLocaleString();
		} catch {
			return '—';
		}
	}
</script>

<div class="fm-vault">
	<div class="fm-vault__grid">
		<section class="fm-panel fm-panel--upload" aria-label="Upload facility map">
			<h4 class="fm-panel__title">Upload map</h4>
			<p class="fm-panel__hint">
				PDF or image, max 10 MB. Stored under your club only ({canManage ? 'director' : 'view only'}).
			</p>
			{#if canManage}
				<label class="fm-label" for="fm-map-name">Map name</label>
				<input
					id="fm-map-name"
					class="fm-input"
					type="text"
					bind:value={mapName}
					placeholder="e.g. North pitch — overhead"
					disabled={uploading}
					autocomplete="off"
				/>
				<label class="fm-label" for="fm-map-addr">Address <span class="fm-optional">(optional)</span></label>
				<input
					id="fm-map-addr"
					class="fm-input"
					type="text"
					bind:value={mapAddress}
					placeholder="Field location notes"
					disabled={uploading}
					autocomplete="off"
				/>
				<div
					class="fm-dropzone"
					class:fm-dropzone--active={dragOver}
					role="button"
					tabindex="0"
					ondragenter={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondrop={onDrop}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							document.getElementById('fm-file-input')?.click();
						}
					}}
				>
					<input
						id="fm-file-input"
						type="file"
						accept="image/*,application/pdf"
						class="fm-file-input"
						disabled={uploading}
						onchange={(e) => {
							const f = e.currentTarget.files?.[0];
							if (f) void uploadFile(f);
							e.currentTarget.value = '';
						}}
					/>
					<i class="ph ph-upload-simple fm-dropzone__icon" aria-hidden="true"></i>
					<p class="fm-dropzone__text">
						Drop a file here or <span class="fm-link">browse</span>
					</p>
					<button
						type="button"
						class="fm-btn fm-btn--secondary"
						disabled={uploading}
						onclick={() => document.getElementById('fm-file-input')?.click()}
					>
						{uploading ? 'Uploading…' : 'Choose file'}
					</button>
				</div>
				{#if uploadErr}
					<p class="fm-err" role="alert">{uploadErr}</p>
				{/if}
			{:else}
				<p class="fm-panel__hint">Sign in as a director to upload maps.</p>
			{/if}
		</section>

		<section class="fm-panel" aria-label="Facility map vault">
			<h4 class="fm-panel__title">Vault</h4>
			{#if rows.length === 0}
				<p class="fm-panel__empty">No maps yet.</p>
			{:else}
				<div class="ec-table-wrap fm-table-wrap">
					<table class="ec-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Type</th>
								<th>Uploaded</th>
								{#if canManage}
									<th style="width: 5rem;">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.id)}
								<tr
									class="ec-table__row-click"
									onclick={() => openPreview(row)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											openPreview(row);
										}
									}}
									role="button"
									tabindex="0"
								>
									<td class="ec-table__strong">{row.name}</td>
									<td class="ec-muted">{row.type === 'pdf' ? 'PDF' : 'Image'}</td>
									<td class="ec-muted">{fmtTime(row.uploadedAt)}</td>
									{#if canManage}
										<td>
											<button
												type="button"
												class="fm-btn fm-btn--danger"
												onclick={(e) => {
													e.stopPropagation();
													void removeRow(row);
												}}
											>
												Delete
											</button>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</div>
</div>

<!-- Preview drawer (enterprise panel) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="ec-drawer-backdrop"
	class:ec-drawer-backdrop--open={previewOpen}
	role="presentation"
	aria-hidden={!previewOpen}
	onclick={closePreview}
></div>
<aside
	class="ec-drawer fm-preview-drawer"
	class:ec-drawer--open={previewOpen}
	aria-hidden={!previewOpen}
	aria-label="Facility details"
>
	{#if previewRow}
		<div class="ec-drawer__head">
			<h2 class="ec-drawer__title">{previewRow.name}</h2>
			<button type="button" class="ec-drawer__close" onclick={closePreview} aria-label="Close">
				<i class="ph ph-x" style="font-size: 1.25rem;"></i>
			</button>
		</div>
		<div class="ec-drawer__body fm-preview-body">
			<section class="fm-logistics-bento" aria-labelledby="fm-location-h">
				<h3 id="fm-location-h" class="fm-logistics__title">Location & Routing</h3>
				<div class="fm-logistics-map-slot">
					{#key previewId}
						<LogisticsMap
							bind:latitude={draftLat}
							bind:longitude={draftLng}
							readonly={!canManage}
						/>
					{/key}
				</div>
				{#if draftLat != null && draftLng != null}
					<label class="fm-label" for="fm-routing-uri">Routing URI</label>
					<input
						id="fm-routing-uri"
						class="fm-input fm-logistics-input fm-routing-uri-input"
						type="text"
						readonly
						value={routingDisplayUri}
					/>
				{/if}
				{#if canManage}
					<label class="fm-label" for="fm-logistics-address">Address</label>
					<input
						id="fm-logistics-address"
						class="fm-input fm-logistics-input"
						type="text"
						bind:value={draftAddress}
						placeholder="Street, city, state"
						autocomplete="off"
					/>
					<p class="fm-logistics__coords" aria-live="polite">
						{#if draftLat != null && draftLng != null}
							{draftLat.toFixed(6)}, {draftLng.toFixed(6)}
						{:else}
							Click the map to set coordinates.
						{/if}
					</p>
					<button
						type="button"
						class="fm-btn fm-btn--primary"
						disabled={logisticsSaving}
						onclick={() => void saveLogistics()}
					>
						{logisticsSaving ? 'Saving…' : 'Save logistics'}
					</button>
					{#if logisticsSaveErr}
						<p class="fm-err" role="alert">{logisticsSaveErr}</p>
					{/if}
				{:else if previewRow.routingUrl}
					<a
						class="fm-logistics__route-link"
						href={previewRow.routingUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Open in Maps
					</a>
				{:else if draftLat == null || draftLng == null}
					<p class="fm-logistics__hint">Directions are not configured for this facility yet.</p>
				{/if}
			</section>

			<section class="fm-tactical-wrap" aria-labelledby="fm-tactical-h">
				<h3 id="fm-tactical-h" class="fm-logistics__title">Tactical Builder</h3>
				{#key previewId}
					<TacticalBuilder
						{clubId}
						facilityId={previewRow.id}
						{canManage}
						initialJson={previewRow.tacticalCanvasJson}
					/>
				{/key}
			</section>

			{#if previewRow.address && !canManage}
				<p class="fm-preview-meta">{previewRow.address}</p>
			{/if}

			{#if previewRow.type === 'image'}
				<img
					class="fm-preview-img"
					src={previewRow.mapDownloadUrl}
					alt=""
					loading="lazy"
				/>
			{:else}
				{#if pdfBusy}
					<p class="fm-preview-meta">Rendering PDF…</p>
				{/if}
				<canvas bind:this={pdfCanvasEl} class="fm-preview-canvas"></canvas>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.fm-vault {
		width: 100%;
	}

	.fm-vault__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		align-items: start;
	}

	@media (min-width: 1024px) {
		.fm-vault__grid {
			grid-template-columns: minmax(280px, 1fr) minmax(0, 1.2fr);
			gap: 20px;
		}
	}

	.fm-panel {
		background: #ffffff;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 14px;
		padding: 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .fm-panel {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.fm-panel__title {
		margin: 0 0 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.fm-panel__hint {
		margin: 0 0 12px;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.fm-panel__empty {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.fm-label {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.fm-optional {
		font-weight: 500;
		opacity: 0.85;
	}

	.fm-input {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 12px;
		padding: 8px 10px;
		font-size: 13px;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .fm-input {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.fm-dropzone {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 160px;
		padding: 20px;
		border-radius: 14px;
		border: 1px dashed #d4d4d8;
		background: #fafafa;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	:global(html.dark) .fm-dropzone {
		border-color: #3f3f46;
		background: #18181b;
	}

	.fm-dropzone--active {
		border-color: #71717a;
		background: #f4f4f5;
	}

	:global(html.dark) .fm-dropzone--active {
		background: #27272a;
		border-color: #a1a1aa;
	}

	.fm-file-input {
		position: absolute;
		width: 0;
		height: 0;
		opacity: 0;
		pointer-events: none;
	}

	.fm-dropzone__icon {
		font-size: 2rem;
		color: var(--text-secondary);
	}

	.fm-dropzone__text {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		text-align: center;
	}

	.fm-link {
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.fm-btn {
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: #ffffff;
		color: var(--text-primary);
		cursor: pointer;
	}

	.fm-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.fm-btn--secondary:hover:not(:disabled) {
		background: #f4f4f5;
	}

	.fm-btn--danger {
		border-color: rgba(220, 38, 38, 0.35);
		color: #b91c1c;
		background: #ffffff;
	}

	.fm-btn--danger:hover {
		background: rgba(254, 226, 226, 0.35);
	}

	.fm-btn--primary {
		background: var(--brand-primary, #f59e0b);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 55%, #0f172a);
		color: #0f172a;
	}

	.fm-btn--primary:hover:not(:disabled) {
		filter: brightness(0.97);
	}

	:global(html.dark) .fm-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(html.dark) .fm-btn--primary {
		color: #0f172a;
	}

	.fm-err {
		margin: 10px 0 0;
		font-size: 12px;
		font-weight: 600;
		color: #b91c1c;
	}

	.fm-table-wrap {
		margin-top: 4px;
	}

	.fm-preview-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: stretch;
	}

	.fm-logistics-bento {
		width: 100%;
		box-sizing: border-box;
		padding: 14px;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
	}

	:global(html.dark) .fm-logistics-bento {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.fm-logistics__title {
		margin: 0 0 10px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.fm-logistics__hint {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.fm-logistics-map-slot {
		margin-bottom: 12px;
	}

	.fm-routing-uri-input {
		font-family: ui-monospace, monospace;
		font-size: 11px;
	}

	.fm-logistics-input {
		margin-bottom: 8px;
	}

	.fm-logistics__coords {
		margin: 0 0 10px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.fm-logistics__route-link {
		display: inline-flex;
		align-items: center;
		font-size: 13px;
		font-weight: 600;
		color: var(--brand-primary, #f59e0b);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.fm-tactical-wrap {
		width: 100%;
		margin-top: 4px;
	}

	.fm-preview-meta {
		margin: 0;
		width: 100%;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.fm-preview-img {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.08);
	}

	:global(html.dark) .fm-preview-img {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.fm-preview-canvas {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.08);
	}

	:global(html.dark) .fm-preview-canvas {
		border-color: rgba(255, 255, 255, 0.1);
	}

	/* Match enterprise drawer width: desktop ~half, mobile 95vw via global ec-drawer rules */
	:global(.fm-preview-drawer.ec-drawer) {
		width: min(50vw, 560px);
		min-width: 280px;
	}
</style>
