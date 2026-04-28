<script>
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { storage, db } from '$lib/firebase.js';
	import {
		collection,
		deleteDoc,
		deleteField,
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
	 * @typedef {{ id: string; name: string; address?: string; mapStoragePath?: string; mapDownloadUrl?: string; type?: 'image' | 'pdf'; uploadedAt?: import('firebase/firestore').Timestamp; latitude?: number; longitude?: number; routingUrl?: string; tacticalCanvasJson?: string; status?: string; lockReason?: string; lockedAt?: import('firebase/firestore').Timestamp }} FacilityMapRow
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
	/** Registry form (logistics-only facility docs — no vault map asset required). */
	let regName = $state('');
	let regAddress = $state('');
	let regLat = $state('');
	let regLng = $state('');
	let regStatus = $state(/** @type {'Active' | 'Locked'} */ ('Active'));
	let regSaving = $state(false);
	let regErr = $state('');
	/** @type {'Active' | 'Locked' | 'LOCKED'} */
	let draftStatus = $state('Active');

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
					const mapStoragePath =
						typeof x.mapStoragePath === 'string' ? x.mapStoragePath : '';
					const mapDownloadUrl =
						typeof x.mapDownloadUrl === 'string' ? x.mapDownloadUrl : '';
					const status = typeof x.status === 'string' ? x.status : '';
					const lockReason = typeof x.lockReason === 'string' ? x.lockReason : '';
					const lockedAt = x.lockedAt;
					const hasVaultMap = Boolean(mapStoragePath && mapDownloadUrl);
					return {
						id: d.id,
						name: typeof x.name === 'string' ? x.name : d.id,
						address: typeof x.address === 'string' ? x.address : '',
						...(mapStoragePath ? { mapStoragePath } : {}),
						...(mapDownloadUrl ? { mapDownloadUrl } : {}),
						...(hasVaultMap ? { type: x.type === 'pdf' ? 'pdf' : 'image' } : {}),
						uploadedAt: x.uploadedAt,
						...(lat !== undefined ? { latitude: lat } : {}),
						...(lng !== undefined ? { longitude: lng } : {}),
						...(routingUrl ? { routingUrl } : {}),
						...(tacticalCanvasJson ? { tacticalCanvasJson } : {}),
						...(status ? { status } : {}),
						...(lockReason ? { lockReason } : {}),
						...(lockedAt ? { lockedAt } : {}),
					};
				});
				list.sort((a, b) => {
					const ta = a.uploadedAt?.toMillis?.() ?? 0;
					const tb = b.uploadedAt?.toMillis?.() ?? 0;
					if (tb !== ta) return tb - ta;
					return a.name.localeCompare(b.name);
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
		draftStatus = 'Active';
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
		const st = row.status || '';
		draftStatus =
			st === 'LOCKED' ? 'LOCKED' :
			st === 'Locked' ? 'Locked' :
			st === 'Active' ? 'Active' :
			'Active';
	}

	/**
	 * @param {FacilityMapRow} row
	 */
	function statusTone(row) {
		const s = row.status || '';
		if (s === 'LOCKED' || s === 'Locked') return 'locked';
		return 'active';
	}

	async function saveRegistryFacility() {
		regErr = '';
		if (!clubId || !canManage) return;
		const nameTrim = regName.trim();
		if (!nameTrim) {
			regErr = 'Facility name is required.';
			return;
		}
		const lat = parseFloat(regLat);
		const lng = parseFloat(regLng);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			regErr = 'Enter valid latitude and longitude.';
			return;
		}
		if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
			regErr = 'Coordinates are out of range.';
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
		const fid =
			typeof crypto !== 'undefined' && crypto.randomUUID ?
				crypto.randomUUID()
			:	`fac_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
		regSaving = true;
		try {
			await setDoc(doc(db, 'clubs', clubId, 'facilities', fid), {
				name: nameTrim.slice(0, 200),
				address: regAddress.trim().slice(0, 500),
				latitude: lat,
				longitude: lng,
				routingUrl,
				status: regStatus,
			});
			regName = '';
			regAddress = '';
			regLat = '';
			regLng = '';
			regStatus = 'Active';
		} catch (e) {
			regErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			regSaving = false;
		}
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
				status: 'Active',
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
		if (row.mapStoragePath) {
			try {
				await deleteObject(ref(storage, row.mapStoragePath));
			} catch {
				/* file may already be gone */
			}
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
			alert('Enter latitude and longitude (use the map pin or fields above).');
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${draftLat},${draftLng}`;
		logisticsSaving = true;
		try {
			/** @type {Record<string, unknown>} */
			const patch = {
				address: draftAddress.trim().slice(0, 500),
				latitude: draftLat,
				longitude: draftLng,
				routingUrl,
				status:
					draftStatus === 'LOCKED' ? 'LOCKED' :
					draftStatus === 'Locked' ? 'Locked' :
					'Active',
			};
			if (draftStatus === 'Active') {
				patch.lockReason = deleteField();
				patch.lockedAt = deleteField();
			}
			await updateDoc(doc(db, 'clubs', clubId, 'facilities', previewId), patch);
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
	{#if canManage && clubId}
		<section
			class="fm-panel fm-panel--registry"
			aria-labelledby="fm-reg-h"
		>
			<h4 id="fm-reg-h" class="fm-panel__title">Facility logistics registry</h4>
			<p class="fm-panel__hint">
				Add or edit facilities with precise coordinates for routing and automated weather defense.
				Firestore document IDs are shown in the vault table for webhook correlation.
			</p>
			<div class="fm-registry__grid">
				<div class="fm-registry__field">
					<label class="fm-label" for="fm-reg-name">Facility name</label>
					<input
						id="fm-reg-name"
						class="fm-input"
						type="text"
						bind:value={regName}
						placeholder="e.g. North Training Pitch"
						autocomplete="off"
						disabled={regSaving}
					/>
				</div>
				<div class="fm-registry__field fm-registry__field--wide">
					<label class="fm-label" for="fm-reg-addr">Address</label>
					<input
						id="fm-reg-addr"
						class="fm-input"
						type="text"
						bind:value={regAddress}
						placeholder="Street, city, state"
						autocomplete="off"
						disabled={regSaving}
					/>
				</div>
				<div class="fm-registry__coord">
					<label class="fm-label fm-label--coord" for="fm-reg-lat">Latitude</label>
					<input
						id="fm-reg-lat"
						class="fm-input fm-input--coord"
						type="number"
						step="any"
						bind:value={regLat}
						placeholder="e.g. 40.7128"
						disabled={regSaving}
					/>
				</div>
				<div class="fm-registry__coord">
					<label class="fm-label fm-label--coord" for="fm-reg-lng">Longitude</label>
					<input
						id="fm-reg-lng"
						class="fm-input fm-input--coord"
						type="number"
						step="any"
						bind:value={regLng}
						placeholder="e.g. -74.0060"
						disabled={regSaving}
					/>
				</div>
				<p class="fm-lightning-hint fm-registry__field--wide">
					<strong>Required for Tomorrow.io Automated Lightning Defense.</strong>
				</p>
				<div class="fm-registry__field">
					<label class="fm-label" for="fm-reg-status">Status</label>
					<select id="fm-reg-status" class="fm-input" bind:value={regStatus} disabled={regSaving}>
						<option value="Active">Active</option>
						<option value="Locked">Locked</option>
					</select>
				</div>
				<div class="fm-registry__actions">
					<button
						type="button"
						class="fm-btn fm-btn--primary"
						disabled={regSaving || !regName.trim()}
						onclick={() => void saveRegistryFacility()}
					>
						{regSaving ? 'Saving…' : 'Save facility'}
					</button>
				</div>
			</div>
			{#if regErr}
				<p class="fm-err" role="alert">{regErr}</p>
			{/if}
		</section>
	{/if}

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
								<th>Lat</th>
								<th>Lng</th>
								<th>Status</th>
								<th>Doc ID</th>
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
									<td class="ec-muted">
										{#if row.type}
											{row.type === 'pdf' ? 'PDF' : 'Image'}
										{:else}
											<span class="fm-badge fm-badge--logistics">Logistics</span>
										{/if}
									</td>
									<td class="ec-muted fm-mono">
										{typeof row.latitude === 'number' ? row.latitude.toFixed(5) : '—'}
									</td>
									<td class="ec-muted fm-mono">
										{typeof row.longitude === 'number' ? row.longitude.toFixed(5) : '—'}
									</td>
									<td>
										{#if statusTone(row) === 'locked'}
											<span class="fm-status fm-status--locked">Locked</span>
										{:else}
											<span class="fm-status fm-status--active">Active</span>
										{/if}
										{#if row.status === 'LOCKED'}
											<span class="fm-status fm-status--strike" title={row.lockReason || ''}>AUTO</span>
										{/if}
									</td>
									<td class="fm-docid" title={row.id}>{row.id}</td>
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
			<!-- Location and logistics: always rendered for a selected facility (map handles missing API key). -->
			<section class="fm-logistics-bento" aria-labelledby="fm-location-h">
				<h3 id="fm-location-h" class="fm-logistics__title">Location & routing matrix</h3>
				{#if previewRow.lockReason || previewRow.status === 'LOCKED'}
					<p class="fm-lock-banner" role="status">
						<strong>Lock:</strong>
						{previewRow.lockReason || 'Automated lightning hold — facility CLOSED.'}
					</p>
				{/if}
				{#if canManage}
					<div class="fm-coord-grid">
						<div>
							<label class="fm-label fm-label--coord" for="fm-draft-lat">Latitude</label>
							<input
								id="fm-draft-lat"
								class="fm-input fm-input--coord"
								type="number"
								step="any"
								value={draftLat ?? ''}
								oninput={(e) => {
									const v = parseFloat(e.currentTarget.value);
									draftLat = Number.isFinite(v) ? v : null;
								}}
								placeholder="Latitude"
							/>
						</div>
						<div>
							<label class="fm-label fm-label--coord" for="fm-draft-lng">Longitude</label>
							<input
								id="fm-draft-lng"
								class="fm-input fm-input--coord"
								type="number"
								step="any"
								value={draftLng ?? ''}
								oninput={(e) => {
									const v = parseFloat(e.currentTarget.value);
									draftLng = Number.isFinite(v) ? v : null;
								}}
								placeholder="Longitude"
							/>
						</div>
					</div>
					<p class="fm-lightning-hint">
						<strong>Required for Tomorrow.io Automated Lightning Defense.</strong>
					</p>
					<label class="fm-label" for="fm-draft-status">Operational status</label>
					<select id="fm-draft-status" class="fm-input fm-input--status" bind:value={draftStatus}>
						<option value="Active">Active</option>
						<option value="Locked">Locked (manual)</option>
						<option value="LOCKED" disabled={draftStatus !== 'LOCKED'}>
							LOCKED (automated strike — select Active to clear)
						</option>
					</select>
				{/if}
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

			{#if previewRow.mapDownloadUrl && previewRow.type === 'image'}
				<img
					class="fm-preview-img"
					src={previewRow.mapDownloadUrl}
					alt=""
					loading="lazy"
				/>
			{:else if previewRow.mapDownloadUrl && previewRow.type === 'pdf'}
				{#if pdfBusy}
					<p class="fm-preview-meta">Rendering PDF…</p>
				{/if}
				<canvas bind:this={pdfCanvasEl} class="fm-preview-canvas"></canvas>
			{:else}
				<p class="fm-preview-meta fm-preview-meta--asset">
					No tactical map uploaded — logistics registry only. Upload a PDF or image from the vault panel to attach a field diagram.
				</p>
			{/if}
		</div>
	{:else if previewOpen}
		<div class="ec-drawer__head">
			<h2 class="ec-drawer__title">Facility</h2>
			<button type="button" class="ec-drawer__close" onclick={closePreview} aria-label="Close">
				<i class="ph ph-x" style="font-size: 1.25rem;"></i>
			</button>
		</div>
		<div class="ec-drawer__body fm-preview-body">
			<p class="fm-panel__empty">This facility is no longer available. Close and select another map.</p>
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

	.fm-panel--registry {
		border-color: rgba(220, 38, 38, 0.22);
		box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.06);
	}

	.fm-registry__grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px 14px;
		align-items: end;
	}

	.fm-registry__field--wide {
		grid-column: 1 / -1;
	}

	.fm-registry__coord {
		min-width: 0;
	}

	.fm-registry__actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
		margin-top: 4px;
	}

	.fm-coord-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px 14px;
		margin-bottom: 8px;
	}

	.fm-label--coord {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.fm-input--coord {
		font-family: ui-monospace, monospace;
		font-size: 13px;
		font-weight: 600;
		border-color: rgba(220, 38, 38, 0.35);
		background: color-mix(in srgb, var(--text-primary, #fafafa) 4%, transparent);
	}

	:global(html.dark) .fm-input--coord {
		border-color: rgba(248, 113, 113, 0.45);
		background: rgba(15, 23, 42, 0.55);
	}

	.fm-input--status {
		font-weight: 600;
		margin-bottom: 12px;
	}

	.fm-lightning-hint {
		margin: 0 0 12px;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 11px;
		line-height: 1.45;
		color: var(--text-secondary);
		background: rgba(220, 38, 38, 0.08);
		border: 1px solid rgba(220, 38, 38, 0.2);
	}

	:global(html.dark) .fm-lightning-hint {
		background: rgba(220, 38, 38, 0.12);
		border-color: rgba(248, 113, 113, 0.25);
	}

	.fm-lock-banner {
		margin: 0 0 12px;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 12px;
		line-height: 1.45;
		color: #fecaca;
		background: rgba(127, 29, 29, 0.45);
		border: 1px solid rgba(248, 113, 113, 0.35);
	}

	.fm-mono {
		font-family: ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
		font-size: 12px;
	}

	.fm-docid {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: ui-monospace, monospace;
		font-size: 10px;
		color: var(--text-secondary);
		vertical-align: middle;
	}

	.fm-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.fm-badge--logistics {
		border: 1px solid rgba(148, 163, 184, 0.45);
		color: #94a3b8;
		background: rgba(15, 23, 42, 0.55);
	}

	.fm-status {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		margin-right: 4px;
	}

	.fm-status--active {
		color: #86efac;
		background: rgba(22, 101, 52, 0.45);
		border: 1px solid rgba(34, 197, 94, 0.45);
	}

	.fm-status--locked {
		color: #fecaca;
		background: rgba(127, 29, 29, 0.55);
		border: 1px solid rgba(248, 113, 113, 0.45);
	}

	.fm-status--strike {
		color: #fde047;
		background: rgba(113, 63, 18, 0.55);
		border: 1px solid rgba(234, 179, 8, 0.35);
		font-size: 9px;
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
		min-height: 500px;
		display: flex;
		flex-direction: column;
	}

	.fm-logistics-map-slot > :global(*) {
		flex: 1 1 auto;
		min-height: 500px;
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

	.fm-preview-meta--asset {
		padding: 12px;
		border-radius: 10px;
		border: 1px dashed rgba(148, 163, 184, 0.35);
		background: rgba(15, 23, 42, 0.35);
		line-height: 1.5;
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
